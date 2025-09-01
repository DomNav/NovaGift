import { useKaleometers } from '@/store/rewards';
import { usd } from '@/utils/rewards';
import KaleSkinsProgress from './KaleSkinsProgress';
import { useState } from 'react';

interface StudioInsightsCardProps {
  onGuide?: () => void;
}

export default function StudioInsightsCard({ onGuide }: StudioInsightsCardProps) {
  const M_SENDS = [1, 5, 10];
  const M_USD = [5000, 10000]; // cents

  const { sendCount, totalUsdCents } = useKaleometers();
  const auraPoints = sendCount; // Each send gives 1 Aurapoint
  const [isHovered, setIsHovered] = useState(false);

  const nextS = M_SENDS.find((n) => sendCount < n);
  const nextU = M_USD.find((n) => totalUsdCents < n);

  const sReq = nextS
    ? {
        cur: sendCount,
        req: nextS,
        ratio: Math.min(1, sendCount / nextS),
        rem: nextS - sendCount,
      }
    : undefined;

  const uReq = nextU
    ? {
        cur: totalUsdCents,
        req: nextU,
        ratio: Math.min(1, totalUsdCents / nextU),
        rem: nextU - totalUsdCents,
      }
    : undefined;

  return (
    <div className="glass-card p-6 rounded-2xl">
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-medium">Studio Insights</h3>
        <div className="ml-auto flex items-center gap-2">
          <span
            className="font-mono text-sm bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 rounded-full px-2 py-0.5 cursor-pointer"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {isHovered ? 'AuraPoints' : 'AP'} {auraPoints}
            {totalUsdCents > 0 ? ` • $${usd(totalUsdCents, 0)}` : ''}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sends progress */}
        <div className="rounded-xl bg-black/5 dark:bg-white/5 p-4">
          <div className="text-xs text-brand-text/70 mb-1">Next send milestone</div>
          <div className="flex items-end justify-between">
            <div className="text-sm font-medium">
              {sReq ? `${sendCount}/${sReq.req} sends` : 'All send milestones reached'}
            </div>
            {sReq && (
              <div className="text-xs text-brand-text/60">
                {sReq.rem === 1 ? '1 send to go' : `${sReq.rem} sends to go`}
              </div>
            )}
          </div>
          <div className="h-2 w-full bg-black/20 dark:bg-white/20 rounded mt-2 overflow-hidden">
            <div
              className="h-2 bg-gradient-to-r from-brand-primary to-brand-accent"
              style={{ width: `${Math.min(100, Math.round((sReq?.ratio ?? 1) * 100))}%` }}
            />
          </div>
        </div>

        {/* Spend progress */}
        <div className="rounded-xl bg-black/5 dark:bg-white/5 p-4">
          <div className="text-xs text-brand-text/70 mb-1">Next spend milestone</div>
          <div className="flex items-end justify-between">
            <div className="text-sm font-medium">
              {uReq
                ? `${usd(totalUsdCents, 0)}/${usd(uReq.req, 0)}`
                : 'All spend milestones reached'}
            </div>
            {uReq && (
              <div className="text-xs text-brand-text/60">{`$${Math.ceil(uReq.rem / 100)} to go`}</div>
            )}
          </div>
          <div className="h-2 w-full bg-black/20 dark:bg-white/20 rounded mt-2 overflow-hidden">
            <div
              className="h-2 bg-gradient-to-r from-brand-primary to-brand-accent"
              style={{ width: `${Math.min(100, Math.round((uReq?.ratio ?? 1) * 100))}%` }}
            />
          </div>
        </div>

        {/* KALE Skins Progress */}
        <KaleSkinsProgress />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a href="/fund" className="btn-primary text-sm">
          Send a gift to progress →
        </a>
        <button onClick={onGuide} className="btn-secondary text-sm guide-button">
          Guide
        </button>
        <div className="text-xs text-brand-text/60">
          Unlocks at <b>1/5/10</b> sends and <b>$50/$100</b> total.
        </div>
      </div>
    </div>
  );
}
