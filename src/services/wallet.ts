import { ethers, Wallet, HDNodeWallet, Mnemonic, JsonRpcProvider, formatEther, parseEther } from 'ethers';
import type { Network, Transaction } from '@/types';
import { getNetwork, DEFAULT_NETWORK, isAllowedNetworkId } from '@/lib/networks';

const STORAGE_KEY_ENCRYPTED = 'velmora_wallet_encrypted';
const STORAGE_KEY_ADDRESS = 'velmora_wallet_address';
const STORAGE_KEY_NETWORK = 'velmora_network';

/**
 * VELMORA Wallet Service
 * - Generates BIP-39 mnemonics and HD wallets (ethers.js)
 * - Encrypts mnemonic with user password using ethers Wallet.encrypt (scrypt)
 * - Never sends private keys or mnemonic to any backend
 * - Uses Ethereum mainnet by default for EVM self-custody
 */

export async function generateMnemonic(): Promise<string> {
  const wallet = Wallet.createRandom();
  return wallet.mnemonic!.phrase;
}

export async function createWalletFromMnemonic(mnemonic: string, password: string): Promise<{
  address: string;
  encryptedJson: string;
}> {
  // Validate mnemonic
  if (!Mnemonic.isValidMnemonic(mnemonic)) {
    throw new Error('Invalid recovery phrase');
  }

  const wallet = HDNodeWallet.fromPhrase(mnemonic);
  const encryptedJson = await wallet.encrypt(password);

  // Persist only encrypted material + public address
  localStorage.setItem(STORAGE_KEY_ENCRYPTED, encryptedJson);
  localStorage.setItem(STORAGE_KEY_ADDRESS, wallet.address);
  localStorage.setItem(STORAGE_KEY_NETWORK, DEFAULT_NETWORK.id);

  return {
    address: wallet.address,
    encryptedJson,
  };
}

export async function importWallet(mnemonic: string, password: string) {
  return createWalletFromMnemonic(mnemonic, password);
}

export async function unlockWallet(password: string): Promise<{
  address: string;
  wallet: HDNodeWallet;
}> {
  const encrypted = localStorage.getItem(STORAGE_KEY_ENCRYPTED);
  if (!encrypted) {
    throw new Error('No wallet found. Please create or import a wallet.');
  }

  try {
    const wallet = await Wallet.fromEncryptedJson(encrypted, password) as HDNodeWallet;
    localStorage.setItem(STORAGE_KEY_ADDRESS, wallet.address);
    return {
      address: wallet.address,
      wallet,
    };
  } catch {
    throw new Error('Incorrect password or corrupted wallet data');
  }
}

export function getStoredAddress(): string | null {
  return localStorage.getItem(STORAGE_KEY_ADDRESS);
}

export function hasWallet(): boolean {
  return !!localStorage.getItem(STORAGE_KEY_ENCRYPTED);
}

export function clearWallet() {
  localStorage.removeItem(STORAGE_KEY_ENCRYPTED);
  localStorage.removeItem(STORAGE_KEY_ADDRESS);
  // Keep network preference
}

export function getCurrentNetworkId(): string {
  const stored = localStorage.getItem(STORAGE_KEY_NETWORK) || '';
  // Migrate away from any legacy testnet id (e.g. sepolia)
  if (!stored || !isAllowedNetworkId(stored)) {
    localStorage.setItem(STORAGE_KEY_NETWORK, DEFAULT_NETWORK.id);
    return DEFAULT_NETWORK.id;
  }
  return stored;
}

export function setCurrentNetworkId(id: string) {
  localStorage.setItem(STORAGE_KEY_NETWORK, id);
}

export function getProvider(networkId?: string): JsonRpcProvider {
  const network = getNetwork(networkId || getCurrentNetworkId());
  return new JsonRpcProvider(network.rpcUrl, network.chainId);
}

export async function getBalance(address: string, networkId?: string): Promise<string> {
  try {
    const provider = getProvider(networkId);
    const balance = await provider.getBalance(address);
    return formatEther(balance);
  } catch (err) {
    console.error('Balance fetch failed:', err);
    return '0';
  }
}

export async function estimateGas(
  from: string,
  to: string,
  valueEth: string,
  networkId?: string
): Promise<{ gasLimit: bigint; gasPrice: bigint; feeEth: string }> {
  const provider = getProvider(networkId);
  const value = parseEther(valueEth);

  const gasLimit = await provider.estimateGas({
    from,
    to,
    value,
  });

  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;
  const feeWei = gasLimit * gasPrice;
  const feeEth = formatEther(feeWei);

  return { gasLimit, gasPrice, feeEth };
}

export type SendResult = {
  hash: string;
  feeHash?: string;
  wait: () => Promise<any>;
};

/**
 * Send native crypto. Optionally split a platform fee to treasuryAddress.
 * amountEth = full amount user typed; feeBps e.g. 500 = 5%.
 * Recipient receives (100 - fee)% ; treasury receives fee%.
 */
export async function sendTransaction(
  wallet: HDNodeWallet,
  to: string,
  amountEth: string,
  networkId?: string,
  opts?: { feeBps?: number; treasuryAddress?: string | null }
): Promise<SendResult> {
  if (!ethers.isAddress(to)) {
    throw new Error('Invalid recipient address');
  }

  const provider = getProvider(networkId);
  const connectedWallet = wallet.connect(provider);

  const total = parseEther(amountEth);
  const feeBps = Math.max(0, Math.min(2000, opts?.feeBps ?? 0));
  const treasury = opts?.treasuryAddress && ethers.isAddress(opts.treasuryAddress)
    ? opts.treasuryAddress
    : null;

  let recipientValue = total;
  let platformFeeValue = 0n;

  if (feeBps > 0 && treasury) {
    platformFeeValue = (total * BigInt(feeBps)) / 10000n;
    recipientValue = total - platformFeeValue;
    if (recipientValue <= 0n) {
      throw new Error('Amount too small after platform fee');
    }
  }

  const balance = await provider.getBalance(wallet.address);
  // Rough gas buffer for 1–2 transfers
  const feeEstimate = await estimateGas(
    wallet.address,
    to,
    formatEther(recipientValue),
    networkId
  );
  let gasBudget = feeEstimate.gasLimit * feeEstimate.gasPrice * (platformFeeValue > 0n ? 2n : 1n);
  // add 20% buffer
  gasBudget = (gasBudget * 120n) / 100n;

  if (balance < total + gasBudget) {
    throw new Error('Insufficient balance for amount + network fee' + (platformFeeValue > 0n ? ' + platform fee' : ''));
  }

  // 1) Main transfer to recipient
  const tx = await connectedWallet.sendTransaction({
    to,
    value: recipientValue,
  });

  let feeHash: string | undefined;
  // 2) Platform fee to treasury (real on-chain payment to admin)
  if (platformFeeValue > 0n && treasury) {
    try {
      const feeTx = await connectedWallet.sendTransaction({
        to: treasury,
        value: platformFeeValue,
      });
      feeHash = feeTx.hash;
    } catch (e) {
      console.error('Platform fee transfer failed (main transfer already sent):', e);
      // Main transfer already succeeded — surface fee failure without reverting user send
    }
  }

  return {
    hash: tx.hash,
    feeHash,
    wait: () => tx.wait(),
  };
}

export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}

export async function getRecentTransactions(
  address: string,
  networkId?: string,
  limit = 20
): Promise<Transaction[]> {
  // For a production wallet you would use an indexer (Etherscan API, Alchemy, etc.)
  // Here we return an empty list by default and note the limitation.
  // Real implementation would call:
  // https://api-ethereum.etherscan.io/api?module=account&action=txlist&address=...
  console.info('Transaction history requires an indexer API key (Etherscan / Alchemy). Returning empty for now.');
  return [];
}
