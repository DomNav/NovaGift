import { motion, AnimatePresence } from 'framer-motion';
import { forwardRef } from 'react';

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  asset: 'USDC' | 'XLM';
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, asset, placeholder, className = '', disabled = false }, ref) => {
    const isUSDC = asset === 'USDC';
    
    return (
      <div className={`relative ${className}`}>
        <AnimatePresence mode="wait">
          {isUSDC ? (
            <motion.div
              key="usdc-input"
              className="relative flex items-center"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
            >
              <motion.div
                className="input-base flex items-center w-full cursor-text"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
                onClick={() => ref?.current?.focus()}
              >
                <motion.span
                  className="text-brand-text/70 font-medium mr-1 select-none"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.2 }}
                >
                  $
                </motion.span>
                <input
                  ref={ref}
                  type="number"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={placeholder || "100"}
                  className="bg-transparent border-none outline-none flex-1 text-brand-text placeholder:text-brand-text/50 focus:ring-0"
                  min="0"
                  step="0.01"
                  disabled={disabled}
                />
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="xlm-input"
              className="relative"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
            >
              <motion.input
                ref={ref}
                type="number"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder || "2"}
                className="input-base w-full cursor-text"
                disabled={disabled}
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
                min="0"
                step="0.0000001"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Currency indicator badge */}
        <motion.div
          className="absolute -top-2 -right-2 bg-brand-primary text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ 
            scale: [1, 1.05, 1],
            rotate: 0,
            boxShadow: [
              '0 4px 6px -1px rgba(29, 43, 255, 0.3)',
              '0 10px 15px -3px rgba(29, 43, 255, 0.4)',
              '0 4px 6px -1px rgba(29, 43, 255, 0.3)'
            ]
          }}
          transition={{ 
            delay: 0.2, 
            duration: 0.3, 
            type: 'spring', 
            stiffness: 400,
            scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
            boxShadow: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
          }}
          whileHover={{ scale: 1.1 }}
        >
          {asset}
        </motion.div>

        {/* Input focus ring animation */}
        <motion.div
          className="absolute inset-0 rounded-lg ring-2 ring-brand-primary/0"
          animate={{
            opacity: [0, 0.3, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
