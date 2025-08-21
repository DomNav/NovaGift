import React, { forwardRef, useImperativeHandle } from 'react';
import { Check, Loader2 } from 'lucide-react';

type EffectButtonProps = {
  label: string;
  state?: "idle" | "loading" | "success";
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
};

export interface EffectButtonRef {
  setState: (state: "idle" | "loading" | "success") => void;
}

const EffectSendButton = forwardRef<EffectButtonRef, EffectButtonProps>(
  ({ label, state = "idle", onClick, className = "", disabled = false }, ref) => {
    const [internalState, setInternalState] = React.useState(state);
    
    React.useEffect(() => {
      setInternalState(state);
    }, [state]);
    
    useImperativeHandle(ref, () => ({
      setState: setInternalState
    }));
    
    const handleClick = () => {
      if (!disabled && internalState === "idle" && onClick) {
        onClick();
      }
    };
    
    const getButtonStyles = () => {
      switch (internalState) {
        case "loading":
          return "bg-gradient-to-r from-blue-500 to-blue-600 cursor-wait";
        case "success":
          return "bg-gradient-to-r from-green-500 to-green-600";
        default:
          return disabled 
            ? "bg-gray-400 cursor-not-allowed opacity-60"
            : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:scale-105 active:scale-95";
      }
    };
    
    return (
      <button
        onClick={handleClick}
        disabled={disabled || internalState !== "idle"}
        aria-busy={internalState === "loading"}
        className={`
          relative
          w-full sm:w-auto
          px-8 py-4
          backdrop-blur-md
          border border-white/20
          rounded-2xl
          shadow-lg shadow-black/20
          transition-all duration-300
          group
          overflow-hidden
          ${getButtonStyles()}
          ${className}
        `}
      >
        {/* Gradient overlay for glass effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/5 to-transparent rounded-2xl" />
        
        {/* Shine effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        
        {/* Pulse effect for loading */}
        {internalState === "loading" && (
          <div className="absolute inset-0 bg-white/10 animate-pulse rounded-2xl" />
        )}
        
        {/* Success shimmer */}
        {internalState === "success" && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer rounded-2xl" />
        )}
        
        {/* Content */}
        <span className="relative z-10 flex items-center justify-center gap-2 text-white font-medium drop-shadow-sm">
          {internalState === "loading" && (
            <Loader2 className="w-5 h-5 animate-spin" />
          )}
          {internalState === "success" && (
            <Check className="w-5 h-5" />
          )}
          <span>{internalState === "success" ? "Success!" : label}</span>
        </span>
        
        {/* Ripple effect on click */}
        <span className="absolute inset-0 rounded-2xl overflow-hidden">
          <span className="absolute inset-0 rounded-2xl bg-white/20 scale-0 group-active:scale-100 transition-transform duration-500" />
        </span>
      </button>
    );
  }
);

EffectSendButton.displayName = 'EffectSendButton';

export default EffectSendButton;