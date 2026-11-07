import { useState } from 'react';
import { Ticket, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Redeem Velmora prepaid cards into custodial balance.
 * Requires a logged-in API session (Bearer token) when backend is connected.
 * Self-custody-only mode: shows instructions to link account.
 */
export function Redeem() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    amount: string;
    asset: string;
    newBalance: string;
    reference: string;
  } | null>(null);

  const getToken = () => {
    try {
      // If you later store auth token under a known key:
      return localStorage.getItem('velmora_api_token') || '';
    } catch {
      return '';
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (normalized.length < 6) {
      toast.error('Enter a valid code');
      return;
    }

    if (!API_URL) {
      toast.error('Connect the backend (VITE_API_URL) to redeem cards');
      return;
    }

    const token = getToken();
    if (!token) {
      toast.error('Log in to your Velmora account to redeem into custodial balance');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/api/redeem/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: normalized }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Redeem failed');
      setResult({
        amount: data.amount,
        asset: data.asset,
        newBalance: data.newBalance,
        reference: data.reference,
      });
      toast.success('Card redeemed');
      setCode('');
    } catch (err: any) {
      toast.error(err.message || 'Redeem failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">Redeem card</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Enter a Velmora prepaid code to credit your custodial balance
        </p>
      </div>

      <Card className="space-y-4">
        <div className="flex items-center gap-3 text-velmora-400">
          <Ticket className="w-5 h-5" />
          <span className="text-sm font-medium">Velmora redeem code</span>
        </div>

        <form onSubmit={handleRedeem} className="space-y-4">
          <Input
            label="Code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="VELM-XXXX-XXXX"
            autoComplete="off"
            spellCheck={false}
          />
          <Button className="w-full" type="submit" loading={loading}>
            Redeem
          </Button>
        </form>

        {result && (
          <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 space-y-1">
            <div className="flex items-center gap-2 text-green-400 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Credited {result.amount} {result.asset}
            </div>
            <p className="text-xs text-gray-400">New balance: {result.newBalance}</p>
            <p className="text-xs text-gray-500 font-mono">{result.reference}</p>
          </div>
        )}
      </Card>

      <div className="text-xs text-gray-500 space-y-2 leading-relaxed">
        <p>
          Codes are one-time use. Value is added to your <strong className="text-gray-400">Velmora custodial</strong> balance via the ledger — not by editing numbers by hand.
        </p>
        <p>
          Apple Gift Cards, Google Play, and other brand cards cannot be cashed out here (against their terms and high fraud risk). Only official Velmora prepaid codes.
        </p>
      </div>
    </div>
  );
}
