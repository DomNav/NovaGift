import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrices, transformPriceData } from '@/hooks/usePrices';

// ---- Types
interface Asset {
  code: string;
  display: string;
  decimals?: number;
}

interface PriceData {
  asset: Asset;
  priceUsd: number;
  ts: number;
}

interface LuxuryLivePricesProps {
  assets?: Asset[];
  className?: string;
  onClose?: () => void;
  isVisible?: boolean;
}

// ---- Enhanced Live Price Component
function LuxuryLivePrice({
  priceData,
  asset,
}: {
  priceData?: { priceUsd: number; updatedAt: string } | null;
  asset: Asset;
}) {
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  useEffect(() => {
    if (priceData) {
      setLastUpdate(Date.now());
    }
  }, [priceData]);

  if (!priceData) {
    return <span className="text-xs text-brand-text/50">—</span>;
  }

  const price = priceData.priceUsd;

  return (
    <motion.div className="flex items-center gap-2">
      <motion.span
        className="text-sm font-bold text-brand-text tabular-nums"
        key={`${asset.code}-${price}`}
        initial={{ opacity: 0, scale: 0.9, y: -5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        ${price.toFixed(asset.decimals || 4)}
      </motion.span>

      {/* Animated update indicator */}
      <motion.div
        className="w-2 h-2 rounded-full bg-brand-positive"
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: (Date.now() - lastUpdate) / 1000,
        }}
      />
    </motion.div>
  );
}

// ---- Main Component
export default function LuxuryLivePrices({
  assets = [],
  className = '',
  onClose,
  isVisible = true,
}: LuxuryLivePricesProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Default assets - Reduced to 5 for reliability
  const defaultAssets: Asset[] = [
    { code: 'XLM', display: 'XLM', decimals: 4 },
    { code: 'USDC', display: 'USDC', decimals: 2 },
    { code: 'AQUA', display: 'AQUA', decimals: 6 },
    { code: 'yXLM', display: 'yXLM', decimals: 4 },
    { code: 'SHX', display: 'SHX', decimals: 5 },
  ];

  const displayAssets = assets.length > 0 ? assets : defaultAssets;
  
  // Fetch all prices at once using batch fetching
  const { data: pricesData, isLoading, isError } = usePrices(displayAssets.map(a => a.code));
  
  // Create a map for quick price lookup - handle case variations
  const priceMap = new Map<string, { priceUsd: number; updatedAt: string }>();
  if (pricesData) {
    pricesData.forEach(price => {
      priceMap.set(price.symbol.toUpperCase(), price);
      priceMap.set(price.symbol.toLowerCase(), price);
      // Handle yXLM specifically
      if (price.symbol.toUpperCase() === 'YXLM') {
        priceMap.set('yXLM', price);
      }
    });
  }

  const handleAssetClick = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsExpanded(true);
  };

  const handleClose = () => {
    setIsExpanded(false);
    setSelectedAsset(null);
    onClose?.();
  };

  if (!isVisible) return null;

  return (
    <div className={`relative ${className}`}>
      {/* Main Live Prices Chart */}
      <motion.div
        className="bg-gradient-to-br from-brand-surface/95 via-brand-surface/90 to-brand-surface/95 backdrop-blur-2xl border border-brand-text/10 rounded-2xl p-6 shadow-2xl overflow-hidden"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(248, 250, 255, 0.1)',
        }}
      >
        {/* Luxury header with animated background */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/20 via-brand-secondary/20 to-brand-accent/20 rounded-xl blur-xl"></div>
          <div className="relative flex items-center justify-between">
            <motion.h3
              className="text-xl font-bold text-brand-text"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Live Prices
            </motion.h3>

            {onClose && (
              <motion.button
                onClick={handleClose}
                className="relative p-2 text-brand-text/50 hover:text-brand-text transition-all duration-300 rounded-full hover:bg-brand-text/10 group"
                aria-label="Close live prices"
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/20 to-brand-secondary/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
              </motion.button>
            )}
          </div>
        </div>

        {/* Enhanced price grid with staggered animations */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {displayAssets.map((asset, idx) => (
            <motion.div
              key={asset.code}
              className="group relative p-3 rounded-xl bg-gradient-to-r from-brand-text/5 via-brand-text/8 to-brand-text/5 hover:from-brand-text/10 hover:via-brand-text/15 hover:to-brand-text/10 transition-all duration-500 border border-brand-text/5 hover:border-brand-primary/30 overflow-hidden cursor-pointer"
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.5,
                delay: idx * 0.05,
                ease: 'easeOut',
              }}
              whileHover={{
                scale: 1.02,
                y: -2,
                transition: { duration: 0.2 },
              }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAssetClick(asset)}
            >
              {/* Hover glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/5 to-brand-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>

              {/* Content */}
              <div className="relative flex items-center justify-between">
                <motion.span
                  className="text-sm font-semibold text-brand-text/90 group-hover:text-brand-text transition-colors duration-300"
                  whileHover={{ x: 2 }}
                  transition={{ duration: 0.2 }}
                >
                  {asset.display}
                </motion.span>

                {isLoading ? (
                  <div className="animate-pulse bg-gradient-to-r from-brand-text/20 to-brand-text/10 h-4 w-16 rounded"></div>
                ) : (
                  <LuxuryLivePrice priceData={priceMap.get(asset.code) || priceMap.get(asset.code.toUpperCase())} asset={asset} />
                )}
              </div>

              {/* Subtle accent line */}
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              {/* Click indicator */}
              <motion.div
                className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand-primary/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>
          ))}
        </div>

        {/* Enhanced footer with gradient */}
        <motion.div
          className="relative pt-4 border-t border-brand-text/10 text-xs text-brand-text/50 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <span className="relative">
            Powered by <span className="text-brand-primary/80 font-medium">Reflector Network</span>{' '}
            • Updates every 15 seconds
          </span>
        </motion.div>
      </motion.div>

      {/* Asset Detail Modal */}
      <AnimatePresence>
        {isExpanded && selectedAsset && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsExpanded(false)}
          >
            <motion.div
              className="bg-gradient-to-br from-brand-surface via-brand-surface/95 to-brand-surface rounded-2xl p-8 max-w-md w-full border border-brand-text/10 shadow-2xl"
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <motion.h4
                  className="text-2xl font-bold text-brand-text mb-2"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  {selectedAsset.display}
                </motion.h4>
                <p className="text-brand-text/60">Asset Details</p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center p-3 rounded-lg bg-brand-text/5">
                  <span className="text-brand-text/70">Code:</span>
                  <span className="font-mono text-brand-text">{selectedAsset.code}</span>
                </div>

                <div className="flex justify-between items-center p-3 rounded-lg bg-brand-text/5">
                  <span className="text-brand-text/70">Decimals:</span>
                  <span className="font-mono text-brand-text">{selectedAsset.decimals || 7}</span>
                </div>

                <div className="flex justify-between items-center p-3 rounded-lg bg-brand-text/5">
                  <span className="text-brand-text/70">Current Price:</span>
                  <LuxuryLivePrice priceData={priceMap.get(selectedAsset.code) || priceMap.get(selectedAsset.code.toUpperCase())} asset={selectedAsset} />
                </div>
              </div>

              <motion.button
                onClick={() => setIsExpanded(false)}
                className="w-full py-3 px-4 bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-semibold rounded-xl hover:from-brand-secondary hover:to-brand-primary transition-all duration-300 transform hover:scale-105"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Close
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
