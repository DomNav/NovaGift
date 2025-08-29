import { useState } from 'react';
import { useBalances } from '@/hooks/useBalances';

interface WalletBalancePillProps {
  account: string | null;
}

export default function WalletBalancePill({ account }: WalletBalancePillProps) {
  const { xlm, balances, loading, err, reload } = useBalances(account);
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!account) {
    return (
      <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800/30 backdrop-blur-sm border border-gray-300 dark:border-gray-600 rounded-full px-3 py-1.5">
        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">💳 No Wallet</span>
      </div>
    );
  }

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(2);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="relative">
      {/* Main Pill */}
      <div
        className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 backdrop-blur-sm border border-green-300 dark:border-green-700 rounded-full px-3 py-1.5 transition-all duration-200 hover:bg-green-200 dark:hover:bg-green-800/40 cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
      >
        <div className="flex items-center gap-1 text-xs font-mono text-green-800 dark:text-green-200">
          <span>Balance</span>
        </div>
        <svg
          className={`w-3 h-3 text-green-600 dark:text-green-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Expanded Balance Details */}
      {isExpanded && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-brand-surface/95 backdrop-blur-lg border border-brand-text/10 dark:border-white/10 rounded-lg shadow-xl z-[9999]">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-brand-text">Wallet Balance</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  reload();
                }}
                className="px-2 py-1 text-xs bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary rounded transition-colors"
                disabled={loading}
              >
                {loading ? '...' : 'Refresh'}
              </button>
            </div>

            {err && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2 py-1 mb-3">
                {err}
              </div>
            )}

            <div className="space-y-2 max-h-60 overflow-auto">
              {balances.length === 0 ? (
                <div className="text-xs text-brand-text/60 text-center py-4">No assets found</div>
              ) : (
                balances.map((balance) => (
                  <div
                    key={`${balance.code}-${balance.issuer || 'native'}`}
                    className="flex items-center justify-between p-2 rounded bg-brand-text/5 hover:bg-brand-text/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-brand-text">{balance.code}</span>
                      {balance.issuer && (
                        <span className="text-xs text-brand-text/50 font-mono">
                          {balance.issuer.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-brand-text">
                      {parseFloat(balance.balance).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 7,
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
