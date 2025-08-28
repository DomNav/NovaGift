import clsx from 'clsx';

interface SkinCardProps {
  name: string;
  gradientStart: string;
  gradientMid: string;
  gradientEnd: string;
  isActive?: boolean;
  onClick?: () => void;
}

export const SkinCard = ({
  name,
  gradientStart,
  gradientMid,
  gradientEnd,
  isActive = false,
  onClick,
}: SkinCardProps) => {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'relative w-full aspect-video rounded-xl overflow-hidden',
        'transform transition-all duration-300 hover:scale-105',
        'focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2',
        'focus:ring-offset-brand-bg',
        isActive && 'shadow-glow'
      )}
    >
      {/* Gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${gradientStart} 0%, ${gradientMid} 50%, ${gradientEnd} 100%)`,
        }}
      />

      {/* Shimmer overlay effect */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.2) 50%, transparent 60%)`,
            animation: 'shimmer-move 3s infinite',
          }}
        />
      </div>

      {/* Glass overlay for text */}
      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/50 to-transparent">
        <p className="text-white font-medium text-sm">{name}</p>
      </div>

      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-2 right-2 bg-white/90 rounded-full p-1">
          <span className="text-xs">✓</span>
        </div>
      )}
    </button>
  );
};

// Add shimmer animation
const style = document.createElement('style');
style.textContent = `
  @keyframes shimmer-move {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
`;
if (!document.querySelector('style[data-skin-card]')) {
  style.setAttribute('data-skin-card', 'true');
  document.head.appendChild(style);
}
