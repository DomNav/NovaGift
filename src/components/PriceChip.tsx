import { useEffect, useState } from 'react';

export default function PriceChip({
  base = 'XLM',
  quote = 'USD',
}: {
  base?: string;
  quote?: string;
}) {
  const [p, setP] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const api = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

  async function load() {
    try {
      const r = await fetch(`${api}/api/rates/spot?base=${base}&quote=${quote}`);
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'failed');
      setP(Number(j.price));
      setErr(null);
    } catch (e: any) {
      setErr('price unavailable');
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [base, quote]);

  return (
    <span className="px-2 py-1 rounded text-xs bg-white/5">
      {err ? err : `${base} ${p !== null ? `${p.toFixed(4)}` : '…'}`}
    </span>
  );
}
