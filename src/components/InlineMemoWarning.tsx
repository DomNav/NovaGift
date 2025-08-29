interface InlineMemoWarningProps {
  asset: 'USDC' | 'XLM';
  route: 'best' | 'dex' | 'amm';
}

const isMemoRequired = (asset: string, route: string): boolean => {
  // Placeholder logic - can be updated based on actual requirements
  // For now, assume memo is required for certain combinations
  const requiresMemo = 
    (asset === 'USDC' && route === 'dex') ||
    (asset === 'XLM' && route === 'amm') ||
    route === 'best'; // Assume 'best' might route through CEX/Lobstr
  
  return requiresMemo;
};

export const InlineMemoWarning = ({ asset, route }: InlineMemoWarningProps) => {
  const showWarning = isMemoRequired(asset, route);

  if (!showWarning) {
    return null;
  }

  return (
    <div className="text-sm text-warning-foreground bg-warning/10 p-2 rounded-md flex gap-2 items-start">
      <span className="text-yellow-600 dark:text-yellow-400">⚠</span>
      <span>Destination requires MEMO, include it to avoid loss.</span>
    </div>
  );
};