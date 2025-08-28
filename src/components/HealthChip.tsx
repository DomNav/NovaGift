import { useEffect, useState } from 'react';
type Health = {
  ok: boolean;
  services: { api: boolean; db: boolean; horizon: boolean; rpc: boolean };
  elapsed_ms: number;
  ts: string;
};

function pill(ok: boolean, partial = false) {
  return ok
    ? 'bg-green-600/20 text-green-300'
    : partial
      ? 'bg-amber-600/20 text-amber-200'
      : 'bg-red-600/20 text-red-300';
}

export default function HealthChip() {
  const [h, setH] = useState<Health | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const api = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

  async function load() {
    try {
      const r = await fetch(`${api}/api/health`);
      const j = await r.json();
      setH(j);
      setErr(null);
    } catch (e: any) {
      setErr(e?.message || 'unreachable');
      setH(null);
    }
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const ok = !!h?.ok;
  const partial = h && !h.ok && Object.values(h.services || {}).some(Boolean);

  return (
    <details className="ml-2">
      <summary className={`cursor-pointer px-2 py-1 rounded text-xs ${pill(ok, !!partial)}`}>
        {err ? 'Health: down' : ok ? 'Health: ok' : 'Health: degraded'}
      </summary>
      <div className="mt-2 p-2 rounded bg-white/5 text-xs space-y-1 w-56">
        {err && <div>API error: {err}</div>}
        {h && (
          <>
            <div className="flex justify-between">
              <span>API</span>
              <span>{h.services.api ? '✅' : '❌'}</span>
            </div>
            <div className="flex justify-between">
              <span>DB</span>
              <span>{h.services.db ? '✅' : '❌'}</span>
            </div>
            <div className="flex justify-between">
              <span>Horizon</span>
              <span>{h.services.horizon ? '✅' : '❌'}</span>
            </div>
            <div className="flex justify-between">
              <span>RPC</span>
              <span>{h.services.rpc ? '✅' : '❌'}</span>
            </div>
            <div className="opacity-70">
              ~{h.elapsed_ms} ms • {new Date(h.ts).toLocaleTimeString()}
            </div>
          </>
        )}
      </div>
    </details>
  );
}
