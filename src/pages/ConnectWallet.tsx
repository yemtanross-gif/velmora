import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Link2, Unplug, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import {
  WALLET_PROVIDERS,
  loadConnected,
  saveConnected,
  clearConnected,
  connectInjectedEvm,
  connectPhantom,
  chainLabel,
  supportedAssetsForKind,
  type WalletProviderId,
  type ConnectedExternal,
} from '@/lib/connectedWallet';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || '';

export function ConnectWallet() {
  const navigate = useNavigate();
  const [providerId, setProviderId] = useState<WalletProviderId>('metamask');
  const [otherName, setOtherName] = useState('');
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState<ConnectedExternal | null>(null);

  useEffect(() => {
    setConnected(loadConnected());
  }, []);

  const selected = WALLET_PROVIDERS.find((p) => p.id === providerId)!;

  const persistToApi = async (c: ConnectedExternal) => {
    const token = localStorage.getItem('velmora_api_token');
    if (!API_URL || !token) return;
    try {
      await fetch(`${API_URL}/api/wallets/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          address: c.address.startsWith('0x') ? c.address : c.address,
          provider: c.providerLabel,
          label: `Connected · ${c.providerLabel}`,
          network:
            c.chainId === 56
              ? 'binance-smart-chain'
              : c.chainId === 137
                ? 'polygon-pos'
                : c.providerId === 'phantom'
                  ? 'solana'
                  : 'ethereum',
        }),
      });
    } catch {
      /* optional link to account */
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      if (providerId === 'other') {
        toast.error(
          '“Other” cannot auto-connect. Choose MetaMask, Phantom, etc., or use Watch address under Add wallet.'
        );
        return;
      }

      if (providerId === 'walletconnect') {
        toast(
          'WalletConnect requires a Cloud Project ID. Use MetaMask / injected wallet for now, or set VITE_WALLETCONNECT_PROJECT_ID when configured.',
          { icon: 'ℹ️', duration: 5000 }
        );
        // Fallback: try generic ethereum provider (many WC wallets inject)
        if (!(window as any).ethereum) {
          throw new Error('No WalletConnect session available in this browser yet.');
        }
      }

      if (providerId === 'phantom') {
        const { address } = await connectPhantom();
        const c: ConnectedExternal = {
          providerId: 'phantom',
          providerLabel: 'Phantom',
          address,
          chainId: null,
          networkLabel: 'Solana Mainnet',
          connectedAt: Date.now(),
        };
        saveConnected(c);
        setConnected(c);
        await persistToApi(c);
        toast.success('Phantom connected (public address only)');
        return;
      }

      // EVM injected (MetaMask, Trust, Coinbase, Binance, OKX, WC fallback)
      const { address, chainId } = await connectInjectedEvm(providerId);
      const label =
        providerId === 'other'
          ? otherName.trim() || 'Other wallet'
          : WALLET_PROVIDERS.find((p) => p.id === providerId)?.label || providerId;

      const c: ConnectedExternal = {
        providerId,
        providerLabel: label,
        address,
        chainId,
        networkLabel: chainLabel(chainId),
        connectedAt: Date.now(),
      };
      saveConnected(c);
      setConnected(c);
      await persistToApi(c);
      toast.success('Wallet connected — address only, no keys stored');
    } catch (e: any) {
      toast.error(e.message || 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    clearConnected();
    setConnected(null);
    toast.success('Disconnected');
  };

  return (
    <div className="p-4 lg:p-8 max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-surface-50">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Connect existing wallet</h1>
          <p className="text-sm text-gray-400">Link a provider — never enter seed phrases here</p>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-100">
        <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400" />
        <div>
          <p className="font-medium text-amber-200">Security</p>
          <p className="text-xs text-amber-200/80 mt-1">
            Velmora never asks for recovery phrases, private keys, or wallet passwords. Connection only
            reads your public address. Signing is always approved in your wallet app.
          </p>
        </div>
      </div>

      {connected ? (
        <Card className="space-y-4">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">Connected</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-gray-400">Provider</span>
              <span className="font-medium">{connected.providerLabel}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-400">Network</span>
              <span>{connected.networkLabel}</span>
            </div>
            <div>
              <span className="text-gray-400 text-xs">Address</span>
              <p className="font-mono text-xs break-all mt-1">{connected.address}</p>
            </div>
            <p className="text-xs text-gray-500 pt-2">
              Supported assets (when network matches):{' '}
              {supportedAssetsForKind(
                WALLET_PROVIDERS.find((p) => p.id === connected.providerId)?.kind || 'other'
              )}
            </p>
            <p className="text-xs text-velmora-400">
              External connected wallet — separate from Velmora custodial / local seed wallets.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleDisconnect}>
              <Unplug className="w-4 h-4" />
              Disconnect
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                clearConnected();
                setConnected(null);
              }}
            >
              Change wallet
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Wallet provider</label>
            <select
              value={providerId}
              onChange={(e) => setProviderId(e.target.value as WalletProviderId)}
              className="w-full px-4 py-2.5 rounded-xl bg-surface border border-surface-200 text-white focus:outline-none focus:border-velmora-500"
            >
              {WALLET_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                  {p.detect?.() ? ' · detected' : ''}
                </option>
              ))}
            </select>
          </div>

          {providerId === 'other' && (
            <Input
              label="Provider name"
              value={otherName}
              onChange={(e) => setOtherName(e.target.value)}
              placeholder="e.g. Rabby, Brave Wallet"
            />
          )}

          <p className="text-xs text-gray-500">
            {supportedAssetsForKind(selected.kind)}
          </p>

          {providerId === 'walletconnect' && (
            <p className="text-xs text-amber-300/90">
              Full WalletConnect v2 needs a project id from cloud.walletconnect.com. Injected wallets
              still work via the browser provider.
            </p>
          )}

          <Button className="w-full" size="lg" onClick={handleConnect} loading={loading}>
            <Link2 className="w-4 h-4" />
            Connect {selected.label}
          </Button>
        </Card>
      )}
    </div>
  );
}
