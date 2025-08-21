import { useEffect } from "react";

export default function EnvelopeOpenFX({
  running,
  onDone,
}: { running: boolean; onDone?: () => void }) {
  useEffect(() => {
    if (!running) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) { onDone?.(); return; }
    const timer = setTimeout(() => onDone?.(), 950); // end of sweep
    return () => clearTimeout(timer);
  }, [running, onDone]);

  if (!running) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Wax seal (simple circle with S) */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="fx-wax w-12 h-12 rounded-full bg-amber-600/95 ring-2 ring-amber-300/50 shadow-lg grid place-items-center">
          <span className="text-white font-semibold select-none">S</span>
        </div>
      </div>
      {/* Holographic sweep */}
      <div
        className="fx-sweep absolute top-0 bottom-0 -left-1/3 w-1/3"
        style={{
          background:
            "linear-gradient(115deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.55) 45%, rgba(255,255,255,.15) 60%, rgba(255,255,255,0) 100%)",
          filter: "blur(6px)",
        }}
      />
    </div>
  );
}
