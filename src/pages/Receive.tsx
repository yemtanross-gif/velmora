import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Share2, AlertTriangle, Download, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useWalletStore } from '@/store/walletStore';
import { copyToClipboard } from '@/lib/utils';
import toast from 'react-hot-toast';

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

/**
 * Deposit assets — network is owned by the asset (never show Polygon when BTC is selected).
 * xellar: true = address must come from backend/Xellar, never from local EVM key.
 */
type DepositAsset = {
  id: string;
  symbol: string;
  name: string;
  network: string;
  networkLabel: string;
  kind: 'evm' | 'btc' | 'sol' | 'unsupported';
  xellarRequired: boolean;
  tokenNote?: string;
};

const DEPOSIT_ASSETS: DepositAsset[] = [
  {
    id: 'btc',
    symbol: 'BTC',
    name: 'Bitcoin',
    network: 'bitcoin',
    networkLabel: 'Bitcoin Mainnet',
    kind: 'btc',
    xellarRequired: true,
  },
  {
    id: 'eth',
    symbol: 'ETH',
    name: 'Ethereum',
    network: 'ethereum',
    networkLabel: 'Ethereum Mainnet',
    kind: 'evm',
    xellarRequired: false,
  },
  {
    id: 'usdt-eth',
    symbol: 'USDT',
    name: 'Tether',
    network: 'ethereum',
    networkLabel: 'Ethereum Mainnet',
    kind: 'evm',
    xellarRequired: false,
    tokenNote: 'Send USDT (ERC-20) only on Ethereum to this address.',
  },
  {
    id: 'usdc-eth',
    symbol: 'USDC',
    name: 'USD Coin',
    network: 'ethereum',
    networkLabel: 'Ethereum Mainnet',
    kind: 'evm',
    xellarRequired: false,
    tokenNote: 'Send USDC (ERC-20) only on Ethereum to this address.',
  },
  {
    id: 'bnb',
    symbol: 'BNB',
    name: 'BNB',
    network: 'binance-smart-chain',
    networkLabel: 'BNB Smart Chain',
    kind: 'evm',
    xellarRequired: false,
  },
  {
    id: 'matic',
    symbol: 'MATIC',
    name: 'Polygon',
    network: 'polygon-pos',
    networkLabel: 'Polygon Mainnet',
    kind: 'evm',
    xellarRequired: false,
  },
  {
    id: 'sol',
    symbol: 'SOL',
    name: 'Solana',
    network: 'solana',
    networkLabel: 'Solana Mainnet',
    kind: 'sol',
    xellarRequired: true,
  },
  {
    id: 'trx',
    symbol: 'TRX',
    name: 'TRON',
    network: 'tron',
    networkLabel: 'TRON Mainnet',
    kind: 'unsupported',
    xellarRequired: true,
  },
  {
    id: 'xrp',
    symbol: 'XRP',
    name: 'XRP',
    network: 'xrpl',
    networkLabel: 'XRP Ledger',
    kind: 'unsupported',
    xellarRequired: true,
  },
  {
    id: 'ltc',
    symbol: 'LTC',
    name: 'Litecoin',
    network: 'litecoin',
    networkLabel: 'Litecoin Mainnet',
    kind: 'unsupported',
    xellarRequired: true,
  },
  {
    id: 'doge',
    symbol: 'DOGE',
    name: 'Dogecoin',
    network: 'dogecoin',
    networkLabel: 'Dogecoin Mainnet',
    kind: 'unsupported',
    xellarRequired: true,
  },
];

type AddressMap = {
  evm?: string | null;
  bitcoin?: string | null;
  solana?: string | null;
  all?: { network: string; address: string }[];
  source?: string;
  error?: string;
};

function pickAddress(asset: DepositAsset, map: AddressMap | null, localEvm: string | null): string | null {
  if (asset.kind === 'unsupported') return null;
  if (asset.kind === 'btc') {
    return map?.bitcoin || null;
  }
  if (asset.kind === 'sol') {
    return map?.solana || null;
  }
  // EVM assets: prefer Xellar EVM if present, else local self-custody EVM address
  return map?.evm || localEvm || null;
}

export function Receive() {
  const { address: localEvm } = useWalletStore();
  const [assetId, setAssetId] = useState('btc');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addrMap, setAddrMap] = useState<AddressMap | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => DEPOSIT_ASSETS.find((a) => a.id === assetId) || DEPOSIT_ASSETS[0],
    [assetId]
  );

  const depositAddress = pickAddress(selected, addrMap, localEvm);
  const isComingSoon = selected.kind === 'unsupported';
  const needsXellar = selected.xellarRequired || selected.kind === 'btc' || selected.kind === 'sol';
  const canShowQr = Boolean(depositAddress) && !isComingSoon;

  const loadCustodialAddresses = useCallback(async () => {
    if (!API_URL) {
      setApiError('VITE_API_URL is not set — custodial BTC/SOL addresses require the API.');
      return;
    }
    const token = localStorage.getItem('velmora_api_token');
    if (!token) {
      setApiError(
        'Sign in to your Velmora account (API session) to load Xellar custodial deposit addresses for BTC/SOL.'
      );
      return;
    }
    setLoading(true);
    setApiError(null);
    try {
      // Ensure custodial wallet exists
      await fetch(`${API_URL}/api/wallets/custodial`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      });

      const res = await fetch(`${API_URL}/api/wallets/deposit-addresses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || `Failed (${res.status})`);
      }

      const all: { network: string; address: string }[] = data.addresses || [];
      const map: AddressMap = {
        all,
        source: 'xellar',
        evm:
          all.find((a) => /evm|ethereum/i.test(a.network))?.address ||
          data.addresses?.find?.(() => false) ||
          null,
        bitcoin: all.find((a) => /bitcoin|btc/i.test(a.network))?.address || null,
        solana: all.find((a) => /solana|sol/i.test(a.network))?.address || null,
      };
      // Also accept structured object from backend
      if (data.byNetwork) {
        map.evm = data.byNetwork.evm || map.evm;
        map.bitcoin = data.byNetwork.bitcoin || map.bitcoin;
        map.solana = data.byNetwork.solana || map.solana;
      }
      setAddrMap(map);

      if (!map.bitcoin && !map.evm && !map.solana && all.length === 0) {
        setApiError(
          data.message ||
            'Xellar returned no addresses yet. Confirm XELLAR_ENV=production and wallet creation on the API.'
        );
      }
    } catch (e: any) {
      setApiError(e.message || 'Could not load deposit addresses');
      setAddrMap(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustodialAddresses();
  }, [loadCustodialAddresses]);

  const handleCopy = async () => {
    if (!depositAddress) return;
    await copyToClipboard(depositAddress);
    setCopied(true);
    toast.success(`${selected.symbol} address copied`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!depositAddress) return;
    const text = `My ${selected.symbol} address on Velmora (${selected.networkLabel}):\n${depositAddress}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Velmora ${selected.symbol}`, text });
      } catch {
        /* cancelled */
      }
    } else {
      handleCopy();
    }
  };

  const handleDownloadQr = () => {
    if (!depositAddress || !qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const img = new Image();
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(img, 0, 0, 512, 512);
      canvas.toBlob((b) => {
        if (!b) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = `velmora-${selected.symbol}-${selected.network}-qr.png`;
        a.click();
      });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <div className="p-4 lg:p-8 max-w-lg mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Receive</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Share QR or address · <span className="text-gray-200">{selected.symbol}</span> on{' '}
            <span className="text-velmora-400">{selected.networkLabel}</span>
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadCustodialAddresses} loading={loading}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Asset chips */}
      <div className="flex flex-wrap gap-2">
        {DEPOSIT_ASSETS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAssetId(a.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              assetId === a.id
                ? 'bg-velmora-600/25 border-velmora-500 text-velmora-200'
                : 'border-surface-200 text-gray-400 hover:border-surface-300'
            }`}
          >
            {a.symbol}
          </button>
        ))}
      </div>

      {isComingSoon && (
        <Card className="text-center space-y-2 py-8">
          <p className="font-semibold text-amber-300">
            {selected.name} ({selected.symbol})
          </p>
          <p className="text-sm text-gray-400">
            Coming soon — not available on Xellar Embedded V2 mainnet for Velmora yet.
          </p>
          <p className="text-xs text-gray-500">{selected.networkLabel}</p>
        </Card>
      )}

      {!isComingSoon && !canShowQr && (
        <Card className="text-center space-y-3 py-8">
          <p className="font-semibold text-amber-300">
            {selected.name} ({selected.symbol})
          </p>
          <p className="text-sm text-gray-400 px-2">
            {needsXellar
              ? 'No deposit address from Xellar yet. Connect API credentials (production) and open a custodial wallet for this account.'
              : 'No address available. Create or unlock a wallet, or load custodial addresses.'}
          </p>
          {apiError && <p className="text-xs text-red-400 px-4">{apiError}</p>}
          <Button onClick={loadCustodialAddresses} loading={loading}>
            Load deposit addresses
          </Button>
        </Card>
      )}

      {!isComingSoon && canShowQr && depositAddress && (
        <>
          <Card className="flex flex-col items-center gap-4 py-6">
            <div ref={qrRef} className="p-3 bg-white rounded-xl">
              <QRCodeSVG value={depositAddress} size={200} level="M" includeMargin />
            </div>
            <div className="text-center space-y-1 w-full px-2">
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                {selected.symbol} · {selected.networkLabel}
              </p>
              <p className="font-mono text-sm break-all text-gray-200">{depositAddress}</p>
              {selected.tokenNote && (
                <p className="text-xs text-amber-400/90 mt-2">{selected.tokenNote}</p>
              )}
              {selected.kind === 'btc' && (
                <p className="text-xs text-gray-500 mt-2">
                  Bitcoin Mainnet only. Never send BTC to an Ethereum (0x) address.
                </p>
              )}
              {addrMap?.source === 'xellar' && selected.xellarRequired && (
                <p className="text-xs text-green-500/80 mt-1">Address from Xellar custodial wallet</p>
              )}
              {selected.kind === 'evm' && !addrMap?.evm && localEvm && (
                <p className="text-xs text-gray-500 mt-1">Self-custody EVM address on this device</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button variant="secondary" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                Copy address
              </Button>
              <Button variant="outline" onClick={handleShare}>
                <Share2 className="w-4 h-4" />
                Share
              </Button>
              <Button variant="outline" onClick={handleDownloadQr}>
                <Download className="w-4 h-4" />
                QR
              </Button>
            </div>
          </Card>

          <div className="flex items-start gap-2 text-xs text-gray-500 px-1">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
            <p>
              Only send <strong className="text-gray-300">{selected.symbol}</strong> on{' '}
              <strong className="text-gray-300">{selected.networkLabel}</strong>. Wrong network or
              asset can mean permanent loss.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
