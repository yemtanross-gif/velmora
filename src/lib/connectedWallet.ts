/** Connected external wallets — public address only. Never store seeds/keys. */

const STORAGE_KEY = 'velmora_connected_external';

export type WalletProviderId =
  | 'metamask'
  | 'trust'
  | 'coinbase'
  | 'walletconnect'
  | 'binance'
  | 'phantom'
  | 'okx'
  | 'other';

export type ConnectedExternal = {
  providerId: WalletProviderId;
  providerLabel: string;
  address: string;
  chainId: number | null;
  networkLabel: string;
  connectedAt: number;
};

export const WALLET_PROVIDERS: {
  id: WalletProviderId;
  label: string;
  kind: 'evm' | 'solana' | 'multi' | 'other';
  detect?: () => boolean;
}[] = [
  {
    id: 'metamask',
    label: 'MetaMask',
    kind: 'evm',
    detect: () => typeof window !== 'undefined' && !!(window as any).ethereum?.isMetaMask,
  },
  {
    id: 'trust',
    label: 'Trust Wallet',
    kind: 'evm',
    detect: () => typeof window !== 'undefined' && !!(window as any).ethereum?.isTrust,
  },
  {
    id: 'coinbase',
    label: 'Coinbase Wallet',
    kind: 'evm',
    detect: () => typeof window !== 'undefined' && !!(window as any).ethereum?.isCoinbaseWallet,
  },
  {
    id: 'walletconnect',
    label: 'WalletConnect',
    kind: 'multi',
  },
  {
    id: 'binance',
    label: 'Binance Web3 Wallet',
    kind: 'evm',
    detect: () => typeof window !== 'undefined' && !!(window as any).ethereum?.isBinance,
  },
  {
    id: 'phantom',
    label: 'Phantom',
    kind: 'solana',
    detect: () => typeof window !== 'undefined' && !!(window as any).solana?.isPhantom,
  },
  {
    id: 'okx',
    label: 'OKX Wallet',
    kind: 'evm',
    detect: () => typeof window !== 'undefined' && !!(window as any).okxwallet,
  },
  { id: 'other', label: 'Other', kind: 'other' },
];

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum Mainnet',
  56: 'BNB Smart Chain',
  137: 'Polygon',
  42161: 'Arbitrum One',
  10: 'Optimism',
  8453: 'Base',
};

export function chainLabel(chainId: number | null): string {
  if (chainId == null) return 'Unknown network';
  return CHAIN_NAMES[chainId] || `Chain ID ${chainId}`;
}

export function loadConnected(): ConnectedExternal | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConnectedExternal;
  } catch {
    return null;
  }
}

export function saveConnected(c: ConnectedExternal) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

export function clearConnected() {
  localStorage.removeItem(STORAGE_KEY);
}

/** EIP-1193 connect for injected EVM providers */
export async function connectInjectedEvm(
  providerId: WalletProviderId
): Promise<{ address: string; chainId: number }> {
  const eth = (window as any).ethereum;
  if (!eth) {
    throw new Error('No browser wallet detected. Install the extension or use WalletConnect.');
  }

  // Prefer specific provider if multiple are injected
  let provider = eth;
  if (providerId === 'okx' && (window as any).okxwallet) {
    provider = (window as any).okxwallet;
  } else if (Array.isArray(eth.providers)) {
    const match = eth.providers.find((p: any) => {
      if (providerId === 'metamask') return p.isMetaMask && !p.isBraveWallet;
      if (providerId === 'coinbase') return p.isCoinbaseWallet;
      if (providerId === 'trust') return p.isTrust;
      if (providerId === 'binance') return p.isBinance;
      return false;
    });
    if (match) provider = match;
  }

  const accounts: string[] = await provider.request({ method: 'eth_requestAccounts' });
  if (!accounts?.[0]) throw new Error('No account returned from wallet');
  const chainHex: string = await provider.request({ method: 'eth_chainId' });
  const chainId = parseInt(chainHex, 16);
  return { address: accounts[0], chainId };
}

export async function connectPhantom(): Promise<{ address: string }> {
  const sol = (window as any).solana;
  if (!sol?.isPhantom) {
    throw new Error('Phantom not found. Install Phantom or choose another wallet.');
  }
  const resp = await sol.connect();
  const address = resp?.publicKey?.toString?.() || sol.publicKey?.toString?.();
  if (!address) throw new Error('Phantom did not return an address');
  return { address };
}

export function supportedAssetsForKind(kind: 'evm' | 'solana' | 'multi' | 'other'): string {
  if (kind === 'solana') return 'SOL and SPL tokens on Solana Mainnet';
  if (kind === 'evm' || kind === 'multi') {
    return 'ETH, USDT, USDC, BNB, MATIC and other EVM assets — only on the network selected in your wallet';
  }
  return 'Depends on the wallet app you use';
}
