import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Share2, AlertTriangle, Download } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useWalletStore } from '@/store/walletStore';
import { getNetwork, SUPPORTED_ASSETS } from '@/lib/networks';
import { copyToClipboard } from '@/lib/utils';
import toast from 'react-hot-toast';

const DISPLAY_ASSETS = [
  { id: 'eth', symbol: 'ETH', name: 'Ethereum', note: 'EVM address below' },
  { id: 'usdt', symbol: 'USDT', name: 'Tether', note: 'Use same EVM address on Ethereum' },
  { id: 'usdc', symbol: 'USDC', name: 'USD Coin', note: 'Use same EVM address on Ethereum' },
  { id: 'matic', symbol: 'MATIC', name: 'Polygon', note: 'Switch network to Polygon in Settings' },
  { id: 'btc', symbol: 'BTC', name: 'Bitcoin', note: 'BTC deposit addresses require custodial wallet' },
];

export function Receive() {
  const { address, networkId } = useWalletStore();
  const network = getNetwork(networkId);
  const [copied, setCopied] = useState(false);
  const [assetId, setAssetId] = useState('eth');
  const qrRef = useRef<HTMLDivElement>(null);

  const selected = DISPLAY_ASSETS.find((a) => a.id === assetId) || DISPLAY_ASSETS[0];
  const isBtc = assetId === 'btc';
  const shareText = address
    ? `My ${selected.symbol} address on Velmora (${network.name}):\n${address}`
    : '';

  const handleCopy = async () => {
    if (!address || isBtc) return;
    await copyToClipboard(address);
    setCopied(true);
    toast.success('Address copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!address || isBtc) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Velmora ${selected.symbol} Address`,
          text: shareText,
        });
      } catch {
        /* cancelled */
      }
    } else {
      handleCopy();
    }
  };

  /** Download QR as PNG from the SVG */
  const handleDownloadQr = () => {
    if (!address || isBtc || !qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    // Draw to canvas for PNG download
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const pad = 24;
      canvas.width = img.width + pad * 2;
      canvas.height = img.height + pad * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, pad, pad);
      canvas.toBlob((pngBlob) => {
        if (!pngBlob) return;
        const pngUrl = URL.createObjectURL(pngBlob);
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `velmora-${selected.symbol.toLowerCase()}-qr.png`;
        a.click();
        URL.revokeObjectURL(pngUrl);
        toast.success('QR code downloaded');
      }, 'image/png');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  if (!address) {
    return (
      <div className="p-8 text-center text-gray-400">
        No wallet address found. Please unlock or create a wallet.
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">Receive</h1>
        <p className="text-sm text-gray-400 mt-0.5">Share QR or address · {network.name}</p>
      </div>

      {/* Asset chips */}
      <div className="flex flex-wrap gap-2">
        {DISPLAY_ASSETS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAssetId(a.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              assetId === a.id
                ? 'bg-velmora-600/20 border-velmora-500 text-velmora-300'
                : 'border-surface-200 text-gray-400 hover:border-surface-300'
            }`}
          >
            {a.symbol}
          </button>
        ))}
      </div>

      <Card className="flex flex-col items-center gap-5">
        {isBtc ? (
          <div className="text-center space-y-3 py-6 px-2">
            <p className="text-amber-300 font-medium">Bitcoin (BTC)</p>
            <p className="text-sm text-gray-400">
              Native BTC addresses are not the same as your Ethereum address.
              BTC deposits will be available via Velmora custodial wallets (Xellar) once configured.
            </p>
          </div>
        ) : (
          <>
            <div ref={qrRef} className="p-4 bg-white rounded-2xl">
              <QRCodeSVG value={address} size={200} level="M" includeMargin={false} />
            </div>

            <div className="w-full space-y-2 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                Your {selected.symbol} address
              </p>
              <p className="font-mono text-sm break-all px-2">{address}</p>
              <p className="text-xs text-gray-500">{selected.note}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 w-full">
              <Button variant="secondary" size="sm" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4" />
                Share
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadQr}>
                <Download className="w-4 h-4" />
                QR
              </Button>
            </div>
          </>
        )}
      </Card>

      {!isBtc && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-100 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
          <div>
            <p className="font-medium text-amber-200">
              Only send {selected.symbol} on the correct network
            </p>
            <p className="text-xs text-amber-200/70 mt-1">
              Wrong network or token can cause permanent loss. This QR encodes your EVM address for{' '}
              {network.name}.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
