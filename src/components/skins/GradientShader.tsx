import { useEffect, useRef } from 'react';

export type ShaderSettings = {
  angle: number; // deg
  noise: number; // 0..1
  stops: [string, string, string?, string?]; // up to 4 CSS color strings
};

export type AnimationKind = 'none' | 'shimmer' | 'stars' | 'pulse' | 'camo';

type Props = {
  className?: string;
  settings: ShaderSettings;
  rounded?: string; // Tailwind radius class
  animation?: AnimationKind;
  speed?: number;
};

export default function GradientShader({
  className = '',
  settings,
  rounded = 'rounded-2xl',
  animation = 'none',
  speed = 1,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate noise pattern on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 400;
    canvas.height = 400;

    // Create noise pattern with reduced intensity
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const noise = Math.random() * 255 * settings.noise * 0.3; // Reduced intensity
      data[i] = noise; // R
      data[i + 1] = noise; // G
      data[i + 2] = noise; // B
      data[i + 3] = 255 * settings.noise * 0.2; // Reduced alpha
    }

    ctx.putImageData(imageData, 0, 0);
  }, [settings.noise]);

  // Build gradient string
  const gradientStops = settings.stops
    .filter(Boolean)
    .map((color, i, arr) => {
      const position = (i / (arr.length - 1)) * 100;
      return `${color} ${position}%`;
    })
    .join(', ');

  // Fallback gradient if no stops are defined
  const fallbackGradient = 'linear-gradient(135deg, #1D2BFF 0%, #4A5FFF 50%, #7B8CFF 100%)';

  const gradientStyle = {
    background: gradientStops
      ? `linear-gradient(${settings.angle}deg, ${gradientStops})`
      : fallbackGradient,
    // Ensure the gradient is visible
    minHeight: '100%',
    minWidth: '100%',
  };

  // Test if the component is working
  if (!settings || !settings.stops || !settings.stops[0] || !settings.stops[1]) {
    console.warn('GradientShader: No valid settings provided, using fallback');
    return (
      <div
        className={`absolute inset-0 overflow-hidden ${rounded} ${className}`}
        style={{ background: fallbackGradient }}
      >
        <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
          <span className="text-white text-sm">Fallback Gradient</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`absolute inset-0 overflow-hidden ${rounded} ${className}`}
      style={gradientStyle}
    >
      {/* Subtle background pattern for depth */}
      <div
        className="absolute inset-0 opacity-5 dark:opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(0,0,0,0.1) 0%, transparent 50%)`,
        }}
      />

      {/* Noise overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full opacity-10 dark:opacity-20 pointer-events-none"
        style={{
          mixBlendMode: 'multiply',
          objectFit: 'cover',
        }}
      />

      {/* Animation overlays based on animation type */}
      {animation === 'shimmer' && (
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background: `linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)`,
            animation: `shimmerMove ${12 / speed}s linear infinite`,
          }}
        />
      )}

      {animation === 'stars' && (
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background: `radial-gradient(circle at 33% 33%, #fff 1px, transparent 1px), radial-gradient(circle at 66% 66%, #fff 1px, transparent 1px)`,
            backgroundSize: '3px 3px',
            animation: `starsDrift ${20 / speed}s linear infinite`,
          }}
        />
      )}

      {animation === 'pulse' && (
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(ellipse at center, rgba(255,255,255,0.4) 0%, transparent 70%)`,
            animation: `pulse ${6 / speed}s ease-in-out infinite`,
          }}
        />
      )}

      {animation === 'camo' && (
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background: `
              radial-gradient(circle at 20% 20%, rgba(96,108,56,0.3) 10%, transparent 30%),
              radial-gradient(circle at 80% 60%, rgba(40,54,24,0.4) 15%, transparent 35%),
              radial-gradient(circle at 40% 80%, rgba(58,90,64,0.3) 12%, transparent 32%)
            `,
            animation: `camoShift ${16 / speed}s ease-in-out infinite`,
          }}
        />
      )}

      <style>{`
        @keyframes shimmerMove {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes starsDrift {
          0% { transform: translateY(0); }
          100% { transform: translateY(-20px); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
        
        @keyframes camoShift {
          0%, 100% { transform: translateX(0); }
          33% { transform: translateX(2px); }
          66% { transform: translateX(-2px); }
        }
      `}</style>
    </div>
  );
}
