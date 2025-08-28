import { useBalances } from '@/hooks/useBalances';

export default function BalancesChip({ account }: { account: string | null }) {
  const { xlm, balances, loading, err, reload } = useBalances(account);
  if (!account) return <span className="px-2 py-1 rounded bg-white/5 text-xs">Not connected</span>;
  return (
    <details className="ml-2">
      <summary className="cursor-pointer px-2 py-1 rounded text-xs bg-white/5">
        XLM {loading ? '…' : xlm}
      </summary>
      <div className="mt-2 p-2 rounded bg-white/5 text-xs w-56">
        {err && <div className="text-amber-300 mb-2">{err}</div>}
        <button onClick={reload} className="px-2 py-1 rounded bg-indigo-500 text-white mb-2">
          Refresh
        </button>
        <ul className="space-y-1 max-h-60 overflow-auto">
          {balances.map((b) => (
            <li key={`${b.code}-${b.issuer || 'native'}`} className="flex justify-between">
              <span>{b.code}</span>
              <span className="tabular-nums">{b.balance}</span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
