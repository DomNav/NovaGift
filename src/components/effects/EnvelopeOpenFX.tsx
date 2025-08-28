import { useEffect } from 'react';

export default function EnvelopeOpenFX({
  running,
  onDone,
}: {
  running: boolean;
  onDone?: () => void;
}) {
  useEffect(() => {
    if (!running) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduce) {
      onDone?.();
      return;
    }
    const timer = setTimeout(() => onDone?.(), 300); // quick transition
    return () => clearTimeout(timer);
  }, [running, onDone]);

  if (!running) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Simple fade transition */}
      <div className="absolute inset-0 bg-white/20 animate-pulse" />
    </div>
  );
}
