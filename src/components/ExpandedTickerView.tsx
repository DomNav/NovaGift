import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePrices } from '@/hooks/usePrices';

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

interface ExpandedTickerViewProps {
  assets: Asset[];
  isVisible: boolean;
  onClose: () => void;
  position?: { x: number; y: number };
}

// Live Price Component - Real implementation
function LivePrice({
  asset,
  price,
}: {
  asset: Asset;
  price?: { priceUsd: number } | null;
}) {
  if (!price) {
    return <span className="text-sm font-semibold text-brand-text/60">—</span>;
  }

  return (
    <motion.span
      className="text-sm font-semibold text-brand-text tabular-nums"
      key={price.priceUsd}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      ${price.priceUsd.toFixed(asset.decimals || 4)}
    </motion.span>
  );
}

export default function ExpandedTickerView({
  assets,
  isVisible,
  onClose,
  position,
}: ExpandedTickerViewProps) {
  // Fetch all prices at once
  const { data: pricesData, isLoading } = usePrices(assets.map(a => a.code));
  
  // Create price map for quick lookup - handle case variations
  const priceMap = new Map<string, { priceUsd: number }>();
  if (pricesData) {
    pricesData.forEach(price => {
      priceMap.set(price.symbol.toUpperCase(), { priceUsd: price.priceUsd });
      // Also set lowercase version for flexibility
      priceMap.set(price.symbol.toLowerCase(), { priceUsd: price.priceUsd });
      // Handle yXLM specifically
      if (price.symbol.toUpperCase() === 'YXLM') {
        priceMap.set('yXLM', { priceUsd: price.priceUsd });
      }
    });
  }

  // Aggressively ensure modal priority when visible
  useEffect(() => {
    if (isVisible) {
      // Lock body scroll
      document.body.style.overflow = 'hidden';

      // Hide ALL other modals and high z-index elements
      const allModals = document.querySelectorAll('[class*="z-"], [style*="z-index"]');
      const hiddenElements: HTMLElement[] = [];

      allModals.forEach((element) => {
        const htmlElement = element as HTMLElement;
        const computedStyle = window.getComputedStyle(htmlElement);
        const zIndex = parseInt(computedStyle.zIndex);

        // Hide elements with high z-index that aren't our modal
        if (zIndex > 1000 && !htmlElement.hasAttribute('data-modal')) {
          htmlElement.style.display = 'none';
          hiddenElements.push(htmlElement);
        }
      });

      // Store hidden elements for cleanup
      (window as any).__hiddenElements = hiddenElements;

      // Also hide common modal containers
      const commonModalSelectors = [
        '[role="dialog"]',
        '[role="modal"]',
        '.modal',
        '.overlay',
        '[class*="Modal"]',
        '[class*="modal"]',
      ];

      commonModalSelectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element) => {
          const htmlElement = element as HTMLElement;
          if (!htmlElement.hasAttribute('data-modal')) {
            htmlElement.style.display = 'none';
            hiddenElements.push(htmlElement);
          }
        });
      });
    } else {
      // Restore everything
      document.body.style.overflow = '';

      // Restore hidden elements
      const hiddenElements = (window as any).__hiddenElements || [];
      hiddenElements.forEach((element: HTMLElement) => {
        element.style.display = '';
      });
      (window as any).__hiddenElements = [];
    }

    return () => {
      document.body.style.overflow = '';
      const hiddenElements = (window as any).__hiddenElements || [];
      hiddenElements.forEach((element: HTMLElement) => {
        element.style.display = '';
      });
      (window as any).__hiddenElements = [];
    };
  }, [isVisible]);

  if (!isVisible) return null;

  // Create portal at the very top of the DOM
  const modalRoot = document.body;

  const modalContent = (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-start justify-center pt-16 pb-8 px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={onClose}
        style={{
          zIndex: 2147483647, // Maximum possible z-index value
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
        data-modal="live-prices"
      >
        <motion.div
          className="relative bg-gradient-to-br from-brand-surface via-brand-surface to-brand-surface/98 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto border border-brand-text/40"
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 50 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(248, 250, 255, 0.4)',
            backdropFilter: 'blur(20px)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button - positioned absolutely in top-right corner */}
          <motion.button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 text-brand-text/50 hover:text-brand-text transition-all duration-300 rounded-full hover:bg-brand-text/10 group z-10"
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

          {/* Header */}
          <div className="relative p-6 pb-4">
            <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/20 via-brand-secondary/20 to-brand-accent/20 rounded-t-2xl blur-xl"></div>
            <div className="relative text-center">
              <motion.h3
                className="text-2xl font-bold text-brand-text mb-2"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                Live Prices
              </motion.h3>
              <motion.p
                className="text-brand-text/60 text-sm"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Real-time cryptocurrency prices
              </motion.p>
            </div>
          </div>

          {/* Price Grid */}
          <div className="px-6 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {assets.map((asset, idx) => (
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
                  onClick={(e) => {
                    e.stopPropagation();
                    // You can add asset detail functionality here if needed
                  }}
                >
                  {/* Hover glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/5 to-brand-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>

                  {/* Content */}
                  <div className="relative flex items-center justify-between">
                    <motion.span
                      className="text-base font-semibold text-brand-text/90 group-hover:text-brand-text transition-colors duration-300"
                      whileHover={{ x: 2 }}
                      transition={{ duration: 0.2 }}
                    >
                      {asset.display}
                    </motion.span>
                    {isLoading ? (
                      <span className="text-sm font-semibold text-brand-text/50 animate-pulse">Loading...</span>
                    ) : (
                      <LivePrice asset={asset} price={priceMap.get(asset.code) || priceMap.get(asset.code.toUpperCase())} />
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
          </div>

          {/* Footer */}
          <motion.div
            className="relative px-6 py-4 border-t border-brand-text/10 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <span className="text-xs text-brand-text/50">
              Powered by{' '}
              <span className="text-brand-primary/80 font-medium">Reflector Network</span> • Updates
              every 15 seconds
            </span>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  // Render modal as portal at the very top of DOM
  return createPortal(modalContent, modalRoot);
}
