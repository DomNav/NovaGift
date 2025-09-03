import { memo } from 'react';
import clsx from 'clsx';
import GradientShader from '@/components/skins/GradientShader';
import type { AnimationKind } from '@/store/skins';
import type { ShaderSettings } from '@/components/skins/GradientShader';
import novaGiftLogo from '/new1-nova--gift-high-resolution-logo-transparent.png';

interface EnvelopePreviewProps {
  skinId: string;
  settings: ShaderSettings;
  animation: AnimationKind;
  opened: boolean;
  locked: boolean;
  amount: string;
  from: string;
  to: string;
  asset?: 'USDC' | 'XLM';
  className?: string;
}

export const EnvelopePreview = memo(({
  settings,
  animation,
  opened,
  locked,
  amount,
  from,
  to,
  asset = 'USDC',
  className,
}: EnvelopePreviewProps) => {
  return (
    <div
      className={clsx(
        'relative w-64 h-40 rounded-xl overflow-hidden shadow-lg',
        className
      )}
    >
      <GradientShader
        settings={settings}
        animation={locked ? 'none' : animation}
        rounded="rounded-xl"
      />

      <div className="absolute inset-0 bg-white/3 dark:bg-white/8 backdrop-blur-sm z-5" />

      <div className="relative z-10 h-full p-4 flex flex-col justify-between text-white">
        {!opened ? (
          <>
            <div className="flex items-start justify-between">
              <img 
                src={novaGiftLogo} 
                alt="Nova Gift Logo" 
                className="h-6 w-auto drop-shadow-2xl shadow-black/30 transform hover:scale-105 transition-transform duration-200 -mt-1 -ml-1"
                style={{
                  filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.3)) drop-shadow(0 1px 3px rgba(0,0,0,0.2))',
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                }}
              />
              <span className="text-xs text-white/90 font-medium uppercase tracking-wider drop-shadow-md">
                Sealed
              </span>
            </div>

            <div className="text-center">
              <p className="text-white/80 text-sm mb-1 drop-shadow-md">Gift Envelope</p>
              <p className="text-white text-xl font-antonio drop-shadow-lg">
                {asset === 'USDC' ? `$${amount}` : `${amount}`} {asset}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-white/80 drop-shadow-md">
              <span>To: {to.slice(0, 6)}...{to.slice(-4)}</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <img 
                src={novaGiftLogo} 
                alt="Nova Gift Logo" 
                className="h-6 w-auto drop-shadow-2xl shadow-black/30 transform hover:scale-105 transition-transform duration-200 -mt-1 -ml-1"
                style={{
                  filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.3)) drop-shadow(0 1px 3px rgba(0,0,0,0.2))',
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                }}
              />
              <span className="text-xs text-white/90 font-medium uppercase tracking-wider drop-shadow-md">
                Opened
              </span>
            </div>

            <div className="text-center">
              <p className="text-white/80 text-sm mb-1 drop-shadow-md">You received</p>
              <p className="text-white text-2xl font-antonio text-glow">
                {asset === 'USDC' ? `$${amount}` : `${amount}`} {asset}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-white/90 drop-shadow-md">
                <span>From:</span>
                <span className="font-mono">{from.slice(0, 6)}...{from.slice(-4)}</span>
              </div>
              <div className="flex justify-between text-xs text-white/90 drop-shadow-md">
                <span>To:</span>
                <span className="font-mono">{to.slice(0, 6)}...{to.slice(-4)}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {locked && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <div className="w-8 h-8 text-white/70">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          </div>
        </div>
      )}

      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-12 translate-x-12 z-5" />
      <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-10 -translate-x-10 z-5" />
    </div>
  );
});

EnvelopePreview.displayName = 'EnvelopePreview';