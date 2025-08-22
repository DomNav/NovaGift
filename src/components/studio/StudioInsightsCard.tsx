import { useKaleometers } from "@/store/rewards";
import { usd } from "@/utils/rewards";

interface StudioInsightsCardProps {
  onGuide?: () => void;
}

export default function StudioInsightsCard({ onGuide }: StudioInsightsCardProps) {
  const M_SENDS = [1, 5, 10];
  const M_USD = [5000, 10000]; // cents

  const { sendCount, totalUsdCents } = useKaleometers();
  const km = sendCount; // Each send gives 1 KM point

  const nextS = M_SENDS.find(n => sendCount < n);
  const nextU = M_USD.find(n => totalUsdCents < n);

  const sReq = nextS ? { 
    cur: sendCount, 
    req: nextS, 
    ratio: Math.min(1, sendCount / nextS), 
    rem: nextS - sendCount 
  } : undefined;
  
  const uReq = nextU ? { 
    cur: totalUsdCents, 
    req: nextU, 
    ratio: Math.min(1, totalUsdCents / nextU), 
    rem: nextU - totalUsdCents 
  } : undefined;

  return (
    <div className="glass-card p-6 rounded-2xl">
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-medium">Studio Insights</h3>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-brand-text/60">Kaleometers</span>
          <span className="font-mono text-sm bg-emerald-600/15 border border-emerald-600/25 text-emerald-700 dark:text-emerald-300 rounded-full px-2 py-0.5">{km} KM</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sends progress */}
        <div className="rounded-xl bg-black/5 dark:bg-white/5 p-4">
          <div className="text-xs text-brand-text/70 mb-1">Next send milestone</div>
          <div className="flex items-end justify-between">
            <div className="text-sm font-medium">{sReq ? `${sendCount}/${sReq.req} sends` : "All send milestones reached"}</div>
            {sReq && <div className="text-xs text-brand-text/60">{sReq.rem === 1 ? "1 send to go" : `${sReq.rem} sends to go`}</div>}
          </div>
          <div className="h-2 w-full bg-black/10 dark:bg-white/10 rounded mt-2 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-brand-primary to-brand-accent" style={{ width: `${Math.min(100, Math.round((sReq?.ratio ?? 1)*100))}%` }} />
          </div>
        </div>

        {/* Spend progress */}
        <div className="rounded-xl bg-black/5 dark:bg-white/5 p-4">
          <div className="text-xs text-brand-text/70 mb-1">Next spend milestone</div>
          <div className="flex items-end justify-between">
            <div className="text-sm font-medium">{uReq ? `${usd(totalUsdCents,0)}/${usd(uReq.req,0)}` : "All spend milestones reached"}</div>
            {uReq && <div className="text-xs text-brand-text/60">{`$${Math.ceil((uReq.rem)/100)} to go`}</div>}
          </div>
          <div className="h-2 w-full bg-black/10 dark:bg-white/10 rounded mt-2 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-brand-primary to-brand-accent" style={{ width: `${Math.min(100, Math.round((uReq?.ratio ?? 1)*100))}%` }} />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a href="/fund" className="btn-primary text-sm">Send a gift to progress →</a>
        <button onClick={onGuide} className="btn-secondary text-sm">Guide</button>
        <div className="text-xs text-brand-text/60">
          Unlocks at <b>1/5/10</b> sends and <b>$50/$100</b> total.
        </div>
      </div>
    </div>
  );
}
