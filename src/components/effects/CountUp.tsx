import { useEffect, useRef, useState } from 'react';

export default function CountUp({
  toCents,
  ms = 700,
  className,
}: {
  toCents: number;
  ms?: number;
  className?: string;
}) {
  const [val, setVal] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const start = performance.now();
    const from = 0;
    const to = Math.max(0, Math.round(toCents || 0));
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from + (to - from) * eased));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [toCents, ms]);

  return <span className={className}>${(val / 100).toFixed(2)} USDC</span>;
}
