import { useEffect, useState } from 'react';
type Bal = { code: string; issuer: string | null; balance: string };

export function useBalances(
  account: string | null,
  apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:4000'
) {
  const [xlm, setXlm] = useState<string>('0');
  const [balances, setBalances] = useState<Bal[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    if (!account) return;
    setLoading(true);
    try {
      const r = await fetch(`${apiBase}/api/wallet/balances/${account}`);
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'failed');
      setXlm(j.xlm);
      setBalances(j.balances);
      setErr(null);
    } catch (e: any) {
      setErr(e?.message || 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [account]);
  return { xlm, balances, loading, err, reload: load };
}
