import { getBalance, isValidAddress } from '@/services/wallet';

const STORAGE_KEY = 'velmora_extra_wallets';

export type ExtraWallet = {
  id: string;
  address: string;
  label: string;
  type: 'watch' | 'imported';
  networkId: string;
  addedAt: number;
};

export function loadExtraWallets(): ExtraWallet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as ExtraWallet[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveExtraWallets(list: ExtraWallet[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function addWatchWallet(address: string, label: string, networkId: string): ExtraWallet {
  if (!isValidAddress(address)) {
    throw new Error('Invalid wallet address');
  }
  const normalized = address.toLowerCase();
  const list = loadExtraWallets();
  if (list.some((w) => w.address.toLowerCase() === normalized)) {
    throw new Error('This address is already added');
  }
  const entry: ExtraWallet = {
    id: `w-${Date.now()}`,
    address: normalized,
    label: label.trim() || 'Watch wallet',
    type: 'watch',
    networkId,
    addedAt: Date.now(),
  };
  list.unshift(entry);
  saveExtraWallets(list);
  return entry;
}

export function removeExtraWallet(id: string) {
  saveExtraWallets(loadExtraWallets().filter((w) => w.id !== id));
}

export async function fetchBalances(
  wallets: ExtraWallet[],
  networkId?: string
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  await Promise.all(
    wallets.map(async (w) => {
      try {
        out[w.id] = await getBalance(w.address, networkId || w.networkId);
      } catch {
        out[w.id] = '0';
      }
    })
  );
  return out;
}
