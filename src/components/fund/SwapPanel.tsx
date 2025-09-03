import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwapQuote } from '@/hooks/useSwapQuote';

type Asset = 'XLM' | 'AQUA' | 'EURC' | 'USDC';
type Venue = 'best' | 'dex' | 'amm';
type Side = 'exactIn' | 'exactOut';

interface SwapPanelProps {
  mode: Side;
  fromAsset: Asset;
  toAsset: Asset;
  amount: string;
  venue: Venue;
  slippageBps: number;
  onAssetChange: (asset: Asset) => void;
  onVenueChange: (venue: Venue) => void;
  onSlippageChange: (slippage: number) => void;
  onAmountChange?: (amount: string) => void;
  onBuildSwap: () => void;
  onAddTrustline?: () => void;
  isBuilding: boolean;
  isAddingTrustline?: boolean;
  showTrustlineButton?: boolean;
  disabled?: boolean;
  className?: string;
  buttonText?: string;
  buttonIcon?: string;
}

export const SwapPanel = ({
  mode,
  fromAsset,
  toAsset,
  amount,
  venue,
  slippageBps,
  onAssetChange,
  onVenueChange,
  onSlippageChange,
  onAmountChange,
  onBuildSwap,
  onAddTrustline,
  isBuilding,
  isAddingTrustline = false,
  showTrustlineButton = false,
  disabled = false,
  className = '',
  buttonText,
  buttonIcon,
}: SwapPanelProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const assets: Asset[] = ['XLM', 'AQUA', 'EURC', 'USDC'];
  const venues: Venue[] = ['best', 'dex', 'amm'];

  // Check if AMM should be enabled
  const isAmmEnabled = import.meta.env.VITE_ENABLE_AMM === 'true';
  const baseVenues = isAmmEnabled ? venues : venues.filter(v => v !== 'amm');
  // Only show venue options in advanced mode
  const availableVenues = showAdvanced ? baseVenues : ['best' as Venue];

  const { quote, isLoading: isLoadingQuote, error, refetch } = useSwapQuote({
    from: fromAsset,
    to: toAsset,
    amount,
    side: mode,
    venue,
    enabled: !disabled,
  });

  const isDisabled = disabled || isBuilding || isLoadingQuote || !quote || !!error;

  const getButtonText = () => {
    if (showTrustlineButton) {
      return isAddingTrustline ? 'Adding Trustline...' : 'Add USDC Trustline';
    }
    if (isBuilding) {
      return buttonText ? buttonText.replace(/^Create/, 'Creating').replace(/Build & Sign/, 'Building & Signing') : 'Building & Signing...';
    }
    return buttonText || 'Build & Sign Swap';
  };

  const getButtonIcon = () => {
    if (showTrustlineButton) {
      return isAddingTrustline ? null : '🔗';
    }
    if (isBuilding) {
      return null;
    }
    return buttonIcon || '🔄';
  };

  const handleButtonClick = () => {
    if (showTrustlineButton && onAddTrustline) {
      onAddTrustline();
    } else {
      onBuildSwap();
    }
  };

  return (
    <div className={`glass-card p-6 space-y-6 ${className}`}>
      {/* Asset Picker */}
      <div className="space-y-2">
        <motion.label 
          className="text-sm text-brand-text/60"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {mode === 'exactIn' ? 'Pay with' : 'Fund with'}
        </motion.label>
        <div className="grid grid-cols-4 gap-2">

          {assets.map((asset, index) => (
            <motion.button
              key={asset}
              onClick={() => onAssetChange(asset)}
              disabled={disabled}
              className={`p-3 rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                fromAsset === asset
                  ? 'text-white shadow-lg'
                  : 'bg-brand-surface/30 text-brand-text/80 hover:bg-brand-surface/50'
              }`}
              style={fromAsset === asset ? {
                background: `linear-gradient(
                  135deg,
                  #1d2bff 0%,
                  #4a5fff 15%,
                  #6366f1 25%,
                  #8b5cf6 35%,
                  #64748b 45%,
                  #475569 55%,
                  #7c3aed 65%,
                  #3b82f6 75%,
                  #1e40af 85%,
                  #1d2bff 100%
                )`,
                backgroundSize: '200% 200%',
                animation: 'granite-shift 4s ease-in-out infinite',
                boxShadow: `
                  inset 0 1px 0 rgba(255, 255, 255, 0.1),
                  0 4px 12px rgba(29, 43, 255, 0.3),
                  0 2px 4px rgba(0, 0, 0, 0.2)
                `
              } : {}}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                delay: index * 0.1,
                type: 'spring',
                stiffness: 400,
                damping: 25,
              }}
              whileHover={{
                scale: fromAsset === asset ? 1 : 1.05,
                transition: { duration: 0.2 }
              }}
              whileTap={{
                scale: 0.95,
                transition: { duration: 0.1 }
              }}
            >
              <motion.span
                key={`${asset}-${fromAsset === asset}`}
                initial={fromAsset === asset ? { scale: 1.1 } : { scale: 1 }}
                animate={fromAsset === asset ? { scale: 1 } : { scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                {asset}
              </motion.span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Amount Input (only for exactIn mode) */}
      {mode === 'exactIn' && onAmountChange && (
        <div className="space-y-2">
          <label className="text-sm text-brand-text/60">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            disabled={disabled}
            min="0"
            step="any"
            className="w-full p-3 rounded-lg bg-brand-surface/30 border border-white/10 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="0.00"
          />
        </div>
      )}

      {/* Advanced Toggle */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-brand-text/60 hover:text-brand-text transition-colors flex items-center gap-2"
        >
          <span>Advanced options</span>
          <motion.span
            animate={{ rotate: showAdvanced ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            ▼
          </motion.span>
        </button>
        {!showAdvanced && venue === 'best' && (
          <span className="text-xs text-brand-text/40">Auto-routing enabled</span>
        )}
      </motion.div>

      {/* Venue Picker - Only show in advanced mode */}
      {showAdvanced && (
        <motion.div 
          className="space-y-2"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.label 
            className="text-sm text-brand-text/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            Route via
          </motion.label>
          <div className="flex gap-2">
            {availableVenues.map((venueOption, index) => (
            <motion.button
              key={venueOption}
              onClick={() => onVenueChange(venueOption)}
              disabled={disabled || (venueOption === 'amm' && !isAmmEnabled)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 capitalize disabled:opacity-50 disabled:cursor-not-allowed ${
                venue === venueOption
                  ? 'bg-brand-primary text-white shadow-lg'
                  : 'bg-brand-surface/30 text-brand-text/80 hover:bg-brand-surface/50'
              }`}
              initial={{ opacity: 0, scale: 0.8, x: -20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{
                delay: 0.3 + index * 0.1,
                type: 'spring',
                stiffness: 400,
                damping: 25,
              }}
              whileHover={{
                scale: 1.05,
                transition: { duration: 0.2 }
              }}
              whileTap={{
                scale: 0.95,
                transition: { duration: 0.1 }
              }}
            >
              <motion.span
                animate={venue === venueOption ? { 
                  color: '#ffffff',
                  textShadow: '0 0 8px rgba(255,255,255,0.5)' 
                } : {}}
                transition={{ duration: 0.3 }}
              >
                {venueOption}
              </motion.span>
            </motion.button>
          ))}
        </div>
      </motion.div>
      )}

      {/* Slippage Input - Also in advanced mode */}
      {showAdvanced && (
        <div className="space-y-2">
        <label className="text-sm text-brand-text/60">Max Slippage (basis points)</label>
        <input
          type="number"
          value={slippageBps}
          onChange={(e) => onSlippageChange(Number(e.target.value))}
          disabled={disabled}
          min="0"
          max="10000"
          className="w-full p-3 rounded-lg bg-white/10 dark:bg-black/20 border border-white/20 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="50"
        />
        <div className="text-xs text-brand-text/60">
          Default: 50 bps (0.5%). Higher values allow more price movement.
        </div>
      </div>
      )}

      {/* Quote Box */}
      <motion.div 
        className="border-t border-white/10 pt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
      >
        <AnimatePresence mode="wait">
          {isLoadingQuote ? (
            <motion.div
              key="loading"
              className="flex items-center justify-center py-8"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div 
                className="w-6 h-6 border-2 border-brand-primary/30 border-t-brand-primary rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <motion.span
                className="ml-2 text-sm text-brand-text/60"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                Getting quote...
              </motion.span>
            </motion.div>
          ) : quote ? (
            <motion.div
              key={`quote-${fromAsset}-${quote.venue}`}
              className="space-y-3"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ 
                type: 'spring',
                stiffness: 400,
                damping: 25,
                duration: 0.4 
              }}
            >
              <motion.div 
                className="bg-brand-primary/10 border border-brand-primary/30 rounded-lg p-4 overflow-hidden relative"
                whileHover={{ 
                  scale: 1.02,
                  boxShadow: '0 8px 25px rgba(29, 43, 255, 0.15)',
                  transition: { duration: 0.3 }
                }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-brand-primary/5 to-transparent"
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3,
                    ease: "easeInOut"
                  }}
                />
                <motion.div 
                  className="text-sm font-medium mb-2 relative z-10"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                >
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={`amount-${quote.inAmount}-${quote.outAmount}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      {mode === 'exactIn' 
                        ? `You'll receive ~ ${quote.outAmount} ${toAsset}`
                        : `You'll pay ~ ${quote.inAmount} ${fromAsset}`
                      }
                    </motion.span>
                  </AnimatePresence>
                </motion.div>
                <motion.div 
                  className="text-xs text-brand-text/60 space-y-1 relative z-10"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                >
                  <motion.div
                    key={`route-${quote.venue}-${quote.feePct}-${quote.price}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                  >
                    Route: {quote.venue} • Est. fees: {quote.feePct}% • Price: {quote.price}
                  </motion.div>
                  {quote.oracleMaxNoSlippage && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ delay: 0.4, duration: 0.3 }}
                    >
                      Oracle ref ≤ {quote.oracleMaxNoSlippage} {fromAsset} (0 bps)
                    </motion.div>
                  )}
                </motion.div>
              </motion.div>
            </motion.div>
          ) : error ? (
            <motion.div
              key={`error-${error}`}
              className="bg-red-500/10 border border-red-500/30 rounded-lg p-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="text-sm text-red-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                {error}
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>

      {/* Action Button */}
      <div className="pt-4">
        {showTrustlineButton ? (
          <button
            onClick={handleButtonClick}
            disabled={isAddingTrustline}
            className="w-full relative flex items-center justify-center gap-3 px-6 py-3 rounded-full font-medium transition-all duration-300 active:scale-95 transform overflow-hidden text-white disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none bg-yellow-600 hover:bg-yellow-700"
          >
            {isAddingTrustline ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Adding Trustline...</span>
              </>
            ) : (
              <>
                <span>{getButtonIcon()}</span>
                <span>{getButtonText()}</span>
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleButtonClick}
            disabled={isDisabled}
            className="w-full relative flex items-center justify-center gap-3 px-6 py-3 rounded-full font-medium transition-all duration-300 active:scale-95 transform overflow-hidden text-white disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:animate-none"
            style={{
              background: `linear-gradient(
                135deg,
                #1d2bff 0%,
                #4a5fff 15%,
                #6366f1 25%,
                #8b5cf6 35%,
                #64748b 45%,
                #475569 55%,
                #7c3aed 65%,
                #3b82f6 75%,
                #1e40af 85%,
                #1d2bff 100%
              )`,
              backgroundSize: (isBuilding || isLoadingQuote) ? '100% 100%' : '200% 200%',
              animation: (isBuilding || isLoadingQuote) ? 'none' : 'granite-shift 4s ease-in-out infinite',
              boxShadow: `
                inset 0 1px 0 rgba(255, 255, 255, 0.1),
                0 4px 12px rgba(29, 43, 255, 0.3),
                0 2px 4px rgba(0, 0, 0, 0.2)
              `
            }}
          >
            {(isBuilding || isLoadingQuote) ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{getButtonText()}</span>
              </>
            ) : (
              <>
                <span>{getButtonIcon()}</span>
                <span>{getButtonText()}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Refresh Quote Button */}
      <AnimatePresence>
        {quote && !isLoadingQuote && (
          <motion.button
            onClick={refetch}
            disabled={disabled}
            className="w-full text-sm text-brand-text/60 hover:text-brand-text/80 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ delay: 0.6, duration: 0.3 }}
            whileHover={{
              scale: 1.02,
              transition: { duration: 0.2 }
            }}
            whileTap={{
              scale: 0.98,
              transition: { duration: 0.1 }
            }}
          >
            <motion.span
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.3 }}
            >
              ↻
            </motion.span>{' '}
            Refresh Quote
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};
