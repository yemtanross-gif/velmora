export type NetworkId = 'ethereum' | 'polygon' | 'bsc' | 'bitcoin' | 'solana';

export interface Network {
  id: NetworkId;
  name: string;
  chainId: number;
  rpcUrl: string;
  explorer: string;
  isTestnet: boolean;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export interface Asset {
  symbol: string;
  name: string;
  decimals: number;
  address?: string;
  logo?: string;
  networkId: NetworkId;
}

export interface WalletAccount {
  address: string;
  path: string;
  index: number;
}

export interface WalletState {
  isUnlocked: boolean;
  address: string | null;
  networkId: NetworkId;
  accounts: WalletAccount[];
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  symbol: string;
  type: 'send' | 'receive' | 'swap' | 'contract' | 'fee';
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  networkId: NetworkId;
  fee?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

export interface PlatformConfig {
  appName: string;
  feeBps: number;
  treasuryAddress: string | null;
  withdrawalEnabled: boolean;
  minWithdrawal: string;
}
