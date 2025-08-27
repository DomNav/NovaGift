import { motion } from 'framer-motion'

interface PaymentToggleProps {
  value: 'USDC' | 'XLM'
  onChange: (val: 'USDC' | 'XLM') => void
}

export const PaymentToggle = ({ value, onChange }: PaymentToggleProps) => {
  return (
    <div 
      className="relative flex bg-brand-surface/30 rounded-xl p-2"
      role="radiogroup"
      aria-label="Payment method selection"
    >
      {/* Animated sliding background */}
      <motion.div
        className="absolute top-2 bottom-2 bg-brand-primary rounded-lg"
        initial={false}
        animate={{
          left: value === 'USDC' ? '8px' : 'calc(50% + 4px)',
          width: 'calc(50% - 8px)',
        }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 30,
        }}
      />
      
      {/* USDC Option */}
      <button
        onClick={() => onChange('USDC')}
        className="relative flex-1 py-2 px-4 rounded-lg transition-colors duration-200 z-10"
        role="radio"
        aria-checked={value === 'USDC'}
        aria-label="Pay with USDC"
      >
        <motion.span
          className={`font-semibold block ${
            value === 'USDC' ? 'text-white' : 'text-brand-text/60'
          }`}
          whileHover={{ opacity: value === 'USDC' ? 1 : 0.8 }}
          transition={{ duration: 0.2 }}
        >
          USDC
        </motion.span>
      </button>
      
      {/* XLM Option */}
      <button
        onClick={() => onChange('XLM')}
        className="relative flex-1 py-2 px-4 rounded-lg transition-colors duration-200 z-10"
        role="radio"
        aria-checked={value === 'XLM'}
        aria-label="Pay with XLM"
      >
        <motion.span
          className={`font-semibold block ${
            value === 'XLM' ? 'text-white' : 'text-brand-text/60'
          }`}
          whileHover={{ opacity: value === 'XLM' ? 1 : 0.8 }}
          transition={{ duration: 0.2 }}
        >
          XLM
        </motion.span>
      </button>
    </div>
  )
}
