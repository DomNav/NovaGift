import { motion } from 'framer-motion';
import { Link, Unlink } from 'lucide-react';

interface LinkStylesToggleProps {
  linked: boolean;
  onChange: (linked: boolean) => void;
}

export const LinkStylesToggle = ({ linked, onChange }: LinkStylesToggleProps) => {
  return (
    <div className="glass-card p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-brand-text">Link Styles</h3>
          <p className="text-xs text-brand-text/60 mt-1">
            {linked ? 'Sealed and opened envelopes use the same skin' : 'Customize sealed and opened envelopes separately'}
          </p>
        </div>
      </div>
      
      <div
        className="relative flex bg-brand-surface/30 rounded-xl p-2"
        role="radiogroup"
        aria-label="Link styles selection"
      >
        {/* Animated sliding background with granite effect */}
        <motion.div
          className="absolute top-2 bottom-2 rounded-lg overflow-hidden"
          style={{
            background: linked ? `linear-gradient(
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
            )` : `linear-gradient(
              135deg,
              #64748b 0%,
              #475569 25%,
              #374151 50%,
              #1f2937 75%,
              #111827 100%
            )`,
            backgroundSize: '200% 200%',
            animation: linked ? 'granite-shift 4s ease-in-out infinite' : 'none',
            boxShadow: linked ? `
              inset 0 1px 0 rgba(255, 255, 255, 0.1),
              0 4px 12px rgba(29, 43, 255, 0.3),
              0 2px 4px rgba(0, 0, 0, 0.2)
            ` : `
              inset 0 1px 0 rgba(255, 255, 255, 0.1),
              0 2px 8px rgba(0, 0, 0, 0.2)
            `
          }}
          initial={false}
          animate={{
            left: linked ? 'calc(50% + 4px)' : '8px',
            width: 'calc(50% - 8px)',
          }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 30,
          }}
        />

        {/* Separate Option */}
        <button
          onClick={() => onChange(false)}
          className="relative flex-1 py-3 px-4 rounded-lg transition-colors duration-200 z-10 flex items-center justify-center gap-2"
          role="radio"
          aria-checked={!linked}
          aria-label="Use separate styles"
        >
          <Unlink className={`w-4 h-4 ${!linked ? 'text-white' : 'text-brand-text/70'}`} />
          <motion.span
            className={`font-medium text-sm ${
              !linked ? 'text-white' : 'text-brand-text dark:text-white'
            }`}
            whileHover={{ opacity: !linked ? 1 : 0.8 }}
            transition={{ duration: 0.2 }}
          >
            Separate
          </motion.span>
        </button>

        {/* Linked Option */}
        <button
          onClick={() => onChange(true)}
          className="relative flex-1 py-3 px-4 rounded-lg transition-colors duration-200 z-10 flex items-center justify-center gap-2"
          role="radio"
          aria-checked={linked}
          aria-label="Link styles together"
        >
          <Link className={`w-4 h-4 ${linked ? 'text-white' : 'text-brand-text/70'}`} />
          <motion.span
            className={`font-medium text-sm ${
              linked ? 'text-white' : 'text-brand-text dark:text-white'
            }`}
            whileHover={{ opacity: linked ? 1 : 0.8 }}
            transition={{ duration: 0.2 }}
          >
            Linked
          </motion.span>
        </button>
      </div>

      {linked && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mt-3 text-xs text-blue-400 bg-blue-400/10 rounded-lg p-2"
        >
          <span>🔗</span>
          <span>Changes to either side will automatically apply to both sealed and opened envelopes</span>
        </motion.div>
      )}
    </div>
  );
};
