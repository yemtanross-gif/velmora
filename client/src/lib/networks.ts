import type { Network, Asset } from '@/types';

export const NETWORKS: Record<string, Network> = {
  sepolia: {
    id: 'sepolia',
    name: 'Ethereum Sepolia',
    chainId: 11155111,
    rpcUrl: 'https://rpc.sepolia.org',
    explorer: 'https://sepolia.etherscan.io',
    isTestnet: true,
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  },
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum Mainnet',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    explorer: 'https://etherscan.io',
    isTestnet: false,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
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
};

export const DEFAULT_NETWORK: Network = NETWORKS.sepolia;

/** Assets the UI can display. Native sends work for ETH/MATIC. Tokens need contracts. BTC is custodial-only. */
export const SUPPORTED_ASSETS: Asset[] = [
  { symbol: 'ETH', name: 'Ethereum', decimals: 18, networkId: 'sepolia' },
  { symbol: 'ETH', name: 'Ethereum', decimals: 18, networkId: 'ethereum' },
  { symbol: 'MATIC', name: 'Polygon', decimals: 18, networkId: 'polygon' },
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
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    decimals: 8,
    networkId: 'bitcoin' as any,
  },
];

export function getNetwork(id: string): Network {
  return NETWORKS[id] || DEFAULT_NETWORK;
}

export function getAssetsForNetwork(networkId: string): Asset[] {
  return SUPPORTED_ASSETS.filter((a) => a.networkId === networkId || (a.symbol === 'BTC' && networkId === 'bitcoin'));
}

/** Platform fee helpers (basis points → percent) */
export function feeFromBps(amount: number, bps: number): number {
  return (amount * bps) / 10000;
}

export function netAfterFee(amount: number, bps: number): number {
  return amount - feeFromBps(amount, bps);
}
