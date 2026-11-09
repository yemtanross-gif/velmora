import type { Network, Asset } from '@/types';

/** MAINNET ONLY — no Sepolia, no testnets */
export const NETWORKS: Record<string, Network> = {
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum Mainnet',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    explorer: 'https://etherscan.io',
    isTestnet: false,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  bsc: {
    id: 'bsc' as any,
    name: 'BNB Smart Chain',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    explorer: 'https://bscscan.com',
    isTestnet: false,
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    explorer: 'https://polygonscan.com',
    isTestnet: false,
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  },
  bitcoin: {
    id: 'bitcoin' as any,
    name: 'Bitcoin Mainnet',
    chainId: 0,
    rpcUrl: '',
    explorer: 'https://mempool.space',
    isTestnet: false,
    nativeCurrency: { name: 'Bitcoin', symbol: 'BTC', decimals: 8 },
  },
  solana: {
    id: 'solana' as any,
    name: 'Solana Mainnet',
    chainId: 0,
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    explorer: 'https://solscan.io',
    isTestnet: false,
    nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9 },
  },
};

export const DEFAULT_NETWORK: Network = NETWORKS.ethereum;

export const SUPPORTED_ASSETS: Asset[] = [
  { symbol: 'BTC', name: 'Bitcoin', decimals: 8, networkId: 'bitcoin' as any },
  { symbol: 'ETH', name: 'Ethereum', decimals: 18, networkId: 'ethereum' },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    networkId: 'ethereum',
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    networkId: 'ethereum',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  },
  { symbol: 'BNB', name: 'BNB', decimals: 18, networkId: 'bsc' as any },
  { symbol: 'SOL', name: 'Solana', decimals: 9, networkId: 'solana' as any },
  { symbol: 'MATIC', name: 'Polygon', decimals: 18, networkId: 'polygon' },
];

export function getNetwork(id: string): Network {
  return NETWORKS[id] || DEFAULT_NETWORK;
}

export function getAssetsForNetwork(networkId: string): Asset[] {
  return SUPPORTED_ASSETS.filter((a) => a.networkId === networkId);
}

export function feeFromBps(amount: number, bps: number): number {
  return (amount * bps) / 10000;
}

export function netAfterFee(amount: number, bps: number): number {
  return amount - feeFromBps(amount, bps);
}
