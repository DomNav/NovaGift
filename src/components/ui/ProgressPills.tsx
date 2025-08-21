// src/components/ui/ProgressPills.tsx
import { usd } from "@/utils/rewards";

type Props = {
  send?: { current: number; required: number; ratio: number };
  usdReq?: { current: number; required: number; ratio: number };
  className?: string;
};

export default function ProgressPills({ send, usdReq, className }: Props) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      {send && send.required > 0 && (
        <div className="flex items-center gap-2 rounded-full bg-black/50 text-white text-[11px] px-2 py-1">
          <span className="opacity-80">Sends</span>
          <span className="font-mono">{send.current}/{send.required}</span>
          <div className="h-1 w-14 rounded bg-white/15 overflow-hidden">
            <div
              className="h-1 bg-white/90"
              style={{ width: `${Math.min(100, Math.round(send.ratio * 100))}%` }}
            />
          </div>
        </div>
      )}
      {usdReq && usdReq.required > 0 && (
        <div className="flex items-center gap-2 rounded-full bg-black/50 text-white text-[11px] px-2 py-1">
          <span className="opacity-80">Total</span>
          <span className="font-mono">
            {usd(usdReq.current, 0)}/{usd(usdReq.required, 0)}
          </span>
          <div className="h-1 w-14 rounded bg-white/15 overflow-hidden">
            <div
              className="h-1 bg-white/90"
              style={{ width: `${Math.min(100, Math.round(usdReq.ratio * 100))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
