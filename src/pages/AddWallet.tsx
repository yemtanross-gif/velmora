import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Eye, Wallet, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useWalletStore } from '@/store/walletStore';
import { isValidAddress, getBalance } from '@/services/wallet';
import { addWatchWallet } from '@/lib/extraWallets';
import { getNetwork } from '@/lib/networks';
import toast from 'react-hot-toast';

type Tab = 'watch' | 'import' | 'metamask';

export function AddWallet() {
  const navigate = useNavigate();
  const { networkId, address: primary } = useWalletStore();
  const network = getNetwork(networkId);
  const [tab, setTab] = useState<Tab>('watch');
  const [watchAddress, setWatchAddress] = useState('');
  const [label, setLabel] = useState('');
  const [previewBal, setPreviewBal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const preview = async () => {
    if (!isValidAddress(watchAddress)) {
      toast.error('Enter a valid 0x address');
      return;
    }
    setLoading(true);
    try {
      const bal = await getBalance(watchAddress.trim(), networkId);
      setPreviewBal(bal);
      toast.success('Balance loaded from chain');
    } catch {
      toast.error('Could not fetch balance');
      setPreviewBal(null);
    } finally {
      setLoading(false);
    }
  };

  const saveWatch = () => {
    try {
      if (primary && watchAddress.trim().toLowerCase() === primary.toLowerCase()) {
        toast.error('This is already your primary wallet');
        return;
      }
      addWatchWallet(watchAddress.trim(), label || 'Watch wallet', networkId);
      toast.success('Wallet added — real balance will show on Dashboard');
      navigate('/dashboard');
    } catch (e: any) {
      toast.error(e.message || 'Failed to add');
    }
  };

  const connectMetaMask = async () => {
    const eth = (window as any).ethereum;
    if (!eth) {
      toast.error('MetaMask not found. Install MetaMask or use watch address.');
      return;
    }
    setLoading(true);
    try {
      const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' });
      const addr = accounts?.[0];
      if (!addr) throw new Error('No account returned');
      const bal = await getBalance(addr, networkId);
      addWatchWallet(addr, 'MetaMask', networkId);
      setPreviewBal(bal);
      toast.success(`Connected ${addr.slice(0, 6)}… — balance ${bal}`);
      navigate('/dashboard');
    } catch (e: any) {
      toast.error(e.message || 'MetaMask connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-surface-50">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Add existing wallet</h1>
          <p className="text-sm text-gray-400">Watch address, import seed, or connect MetaMask</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(
          [
            { id: 'watch' as Tab, label: 'Watch address', icon: Eye },
            { id: 'import' as Tab, label: 'Import seed', icon: Wallet },
            { id: 'metamask' as Tab, label: 'MetaMask', icon: Link2 },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
              tab === t.id
                ? 'bg-velmora-600/20 border-velmora-500 text-velmora-300'
                : 'border-surface-200 text-gray-400'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'watch' && (
        <Card className="space-y-4">
          <p className="text-sm text-gray-400">
            Paste any EVM address to track <strong className="text-gray-300">real on-chain balance</strong> on{' '}
            {network.name}. No private keys — view only.
          </p>
          <Input
            label="Wallet address"
            value={watchAddress}
            onChange={(e) => {
              setWatchAddress(e.target.value.trim());
              setPreviewBal(null);
            }}
            placeholder="0x..."
            spellCheck={false}
          />
          <Input
            label="Label (optional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="My other wallet"
          />
          {previewBal !== null && (
            <div className="rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm">
              Live balance:{' '}
              <span className="font-semibold text-green-300">
                {previewBal} {network.nativeCurrency.symbol}
              </span>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={preview} loading={loading}>
              Check balance
            </Button>
            <Button className="flex-1" onClick={saveWatch} disabled={!isValidAddress(watchAddress)}>
              Add wallet
            </Button>
          </div>
        </Card>
      )}

      {tab === 'import' && (
        <Card className="space-y-4">
          <p className="text-sm text-gray-400">
            Import with a 12/24-word recovery phrase. Keys stay encrypted on this device (replaces
            primary local wallet).
          </p>
          <Button className="w-full" onClick={() => navigate('/import')}>
            Go to Import Wallet
          </Button>
        </Card>
      )}

      {tab === 'metamask' && (
        <Card className="space-y-4">
          <p className="text-sm text-gray-400">
            Connect MetaMask to read the selected account address and show its real balance. Signing
            still happens in MetaMask when you send.
          </p>
          <Button className="w-full" onClick={connectMetaMask} loading={loading}>
            Connect MetaMask
          </Button>
        </Card>
      )}
    </div>
  );
}
