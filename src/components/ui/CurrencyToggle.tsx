import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface CurrencyToggleProps {
  value: 'USDC' | 'XLM';
  onChange: (val: 'USDC' | 'XLM') => void;
  className?: string;
}

export const CurrencyToggle = ({ value, onChange, className = '' }: CurrencyToggleProps) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleChange = (newValue: 'USDC' | 'XLM') => {
    if (newValue === value || isAnimating) return;
    
    setIsAnimating(true);
    onChange(newValue);
    
    // Reset animation state after transition
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex bg-brand-bg/40 rounded-full p-0.5 relative overflow-hidden">
        {/* Animated sliding background with granite effect */}
        <motion.div
          className="absolute top-0.5 bottom-0.5 rounded-full shadow-lg overflow-hidden"
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
            backgroundSize: '200% 200%',
            animation: 'granite-shift 4s ease-in-out infinite',
            boxShadow: `
              inset 0 1px 0 rgba(255, 255, 255, 0.1),
              0 4px 12px rgba(29, 43, 255, 0.3),
              0 2px 4px rgba(0, 0, 0, 0.2)
            `
          }}
          initial={false}
          animate={{
            left: value === 'USDC' ? '2px' : 'calc(50% + 1px)',
            width: 'calc(50% - 2px)',
          }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 35,
            mass: 0.8,
          }}
        />
        
        {/* Glow effect */}
        <motion.div
          className="absolute top-0.5 bottom-0.5 bg-gradient-to-r from-brand-primary/20 to-brand-primary/10 rounded-full blur-sm"
          initial={false}
          animate={{
            left: value === 'USDC' ? '2px' : 'calc(50% + 1px)',
            width: 'calc(50% - 2px)',
          }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 35,
            mass: 0.8,
            delay: 0.1,
          }}
        />

        {/* USDC Option */}
        <button
          onClick={() => handleChange('USDC')}
          className="relative flex-1 py-1.5 px-3 rounded-full transition-all duration-200 z-10 group"
          disabled={isAnimating}
        >
          <motion.div
            className="flex items-center justify-center gap-1.5"
            whileHover={{ scale: value === 'USDC' ? 1 : 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.span
              className="text-base"
              animate={{ 
                rotate: value === 'USDC' ? [0, 5] : 0,
                scale: value === 'USDC' ? 1.1 : 1
              }}
              transition={{ 
                duration: 0.2,
                repeat: value === 'USDC' ? Infinity : 0,
                repeatType: "reverse",
                repeatDelay: 2,
                ease: "easeInOut"
              }}
            >
              💵
            </motion.span>
            <motion.span
              className={`font-semibold text-xs transition-colors duration-200 ${
                value === 'USDC' ? 'text-white' : 'text-brand-text dark:text-white'
              }`}
              animate={{
                color: value === 'USDC' ? '#ffffff' : 'var(--brand-text)'
              }}
            >
              USDC
            </motion.span>
          </motion.div>
        </button>

        {/* XLM Option */}
        <button
          onClick={() => handleChange('XLM')}
          className="relative flex-1 py-1.5 px-3 rounded-full transition-all duration-200 z-10 group"
          disabled={isAnimating}
        >
          <motion.div
            className="flex items-center justify-center gap-1.5"
            whileHover={{ scale: value === 'XLM' ? 1 : 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.span
              className="text-base"
              animate={{ 
                rotate: value === 'XLM' ? [0, -5] : 0,
                scale: value === 'XLM' ? 1.1 : 1
              }}
              transition={{ 
                duration: 0.2,
                repeat: value === 'XLM' ? Infinity : 0,
                repeatType: "reverse",
                repeatDelay: 2,
                ease: "easeInOut"
              }}
            >
              🚀
            </motion.span>
            <motion.span
              className={`font-semibold text-xs transition-colors duration-200 ${
                value === 'XLM' ? 'text-white' : 'text-brand-text dark:text-white'
              }`}
              animate={{
                color: value === 'XLM' ? '#ffffff' : 'var(--brand-text)'
              }}
            >
              XLM
            </motion.span>
          </motion.div>
        </button>
      </div>

      {/* Ripple effect on change */}
      <AnimatePresence>
        {isAnimating && (
          <motion.div
            className="absolute inset-0 rounded-full bg-brand-primary/20"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
