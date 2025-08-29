import { formatDistanceToNow } from 'date-fns';
import { useEnvelopePrice } from '@/hooks/useEnvelopePrice';

interface PriceStatusProps {
  asset: 'USDC' | 'XLM';
}

export const PriceStatus = ({ asset }: PriceStatusProps) => {
  const { updatedAt, isLoading, isError, mutate } = useEnvelopePrice(asset);

  const handleRetry = () => {
    mutate();
  };

  if (isError) {
    return (
      <div className="flex items-center gap-2 text-xs text-brand-text/60 dark:text-white/60">
        <span className="text-gray-500">Price unavailable</span>
        <button
          onClick={handleRetry}
          className="hover:text-brand-primary transition-colors"
          aria-label="Retry fetching price"
        >
          ↻ retry
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-xs text-brand-text/60 dark:text-white/60">
        Loading price...
      </div>
    );
  }

  const timeAgo = formatDistanceToNow(new Date(updatedAt), { addSuffix: true });

  return (
    <div className="flex items-center gap-2 text-xs text-brand-text/60 dark:text-white/60">
      <span>Last updated: {timeAgo}</span>
      <span>•</span>
      <span>Source: Reflector</span>
      <button
        onClick={handleRetry}
        className="ml-1 hover:text-brand-primary transition-colors"
        aria-label="Refresh price"
      >
        ↻
      </button>
    </div>
  );
};