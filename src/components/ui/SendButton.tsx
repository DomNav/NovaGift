import clsx from 'clsx';

export type SendButtonState = 'idle' | 'loading' | 'success';

interface SendButtonProps {
  state?: SendButtonState;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const SendButton = ({
  state = 'idle',
  onClick,
  disabled = false,
  className,
  children = 'Send',
}: SendButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || state === 'loading' || state === 'success'}
      className={clsx(
        'relative px-8 py-4 rounded-lg font-medium text-white overflow-hidden',
        'transform transition-all duration-300',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        !disabled && state === 'idle' && 'hover:scale-105 active:scale-95',
        className
      )}
    >
      {/* Animated gradient background */}
      <div
        className={clsx(
          'absolute inset-0 transition-all duration-500',
          state === 'idle' && 'bg-gradient-to-r from-brand-primary to-brand-secondary',
          state === 'loading' &&
            'bg-gradient-to-r from-brand-secondary to-brand-accent animate-pulse',
          state === 'success' && 'bg-gradient-to-r from-green-500 to-green-600'
        )}
      />

      {/* Shimmer effect */}
      {state === 'loading' && (
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]">
          <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      )}

      {/* Button content */}
      <div className="relative flex items-center justify-center gap-2">
        {state === 'idle' && (
          <>
            <span>🚀</span>
            <span>{children}</span>
          </>
        )}

        {state === 'loading' && (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Processing...</span>
          </>
        )}

        {state === 'success' && (
          <>
            <span className="text-2xl animate-bounce">✓</span>
            <span>Success!</span>
          </>
        )}
      </div>

      {/* Glow effect on hover */}
      {state === 'idle' && !disabled && (
        <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300">
          <div className="absolute inset-0 bg-white/10" />
        </div>
      )}
    </button>
  );
};

// Add keyframes to tailwind config or inline
const style = document.createElement('style');
style.textContent = `
  @keyframes shimmer {
    to {
      transform: translateX(200%);
    }
  }
`;
document.head.appendChild(style);
