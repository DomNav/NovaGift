import clsx from 'clsx';
import GradientShader, { ShaderSettings } from '../skins/GradientShader';
import EnvelopeOpenFX from '@/components/effects/EnvelopeOpenFX';
import CountUp from '@/components/effects/CountUp';
import novaGiftLogo from '/new1-nova--gift-high-resolution-logo-transparent.png';

export type EnvelopeSkin = {
  id: string;
  name: string;
  premium?: boolean;
  settings: ShaderSettings;
};

export type EnvelopeCardProps = {
  variant?: 'sealed' | 'opened';
  usdCents?: number;
  asset?: 'USDC' | 'XLM';
  toLabel?: string;
  fromLabel?: string;
  skin?: EnvelopeSkin;
  className?: string;
  // Animation props
  openingFx?: boolean; // show overlay while opening (sealed state)
  onOpenFxDone?: () => void; // callback when FX completes
  animateAmount?: boolean; // if opened, animate amount count-up
  // Legacy props for backward compatibility
  isSealed?: boolean;
  amount?: string;
  recipient?: string;
  sender?: string;
  expiresAt?: string;
  gradientClass?: string;
};

export const EnvelopeCard = ({
  // New props
  variant,
  usdCents,
  asset = 'USDC',
  toLabel,
  fromLabel,
  skin,
  // Animation props
  openingFx,
  onOpenFxDone,
  animateAmount,
  // Legacy props
  isSealed = true,
  amount = '100',
  recipient = 'GDEMO...RECIPIENT',
  sender = 'GDEMO...SENDER',
  expiresAt,
  className,
  gradientClass = 'from-brand-primary to-brand-accent',
}: EnvelopeCardProps) => {
  // Use new props if provided, otherwise fall back to legacy
  const isCardSealed = variant ? variant === 'sealed' : isSealed;
  const displayAmount = usdCents !== undefined ? (usdCents / 100).toFixed(2) : amount;
  const recipientLabel = toLabel || recipient;
  const senderLabel = fromLabel || sender;

  return (
    <div
      className={clsx(
        'relative w-80 h-48 rounded-xl overflow-hidden transition-all duration-500',
        'shadow-lg hover:shadow-xl transform hover:scale-105',
        'ring-1 ring-black/10 dark:ring-white/10',
        className
      )}
    >
      {/* Background gradient - use skin if provided */}
      {skin ? (
        <GradientShader className="absolute inset-0" settings={skin.settings} rounded="" />
      ) : (
        <div className={clsx('absolute inset-0 bg-gradient-to-br', gradientClass)} />
      )}

      {/* Glass effect overlay - theme-aware and reduced opacity */}
      <div className="absolute inset-0 bg-white/3 dark:bg-white/8 backdrop-blur-sm z-5" />

      {/* Opening animation overlay */}
      {openingFx && <EnvelopeOpenFX running={openingFx} onDone={onOpenFxDone} />}

      {/* Content */}
      <div className="relative z-10 h-full p-6 flex flex-col justify-between text-white">
        {isCardSealed ? (
          <>
            {/* Sealed state */}
            <div className="flex items-start justify-between">
              <img 
                src={novaGiftLogo} 
                alt="Nova Gift Logo" 
                className="h-8 w-auto drop-shadow-2xl shadow-black/30 transform hover:scale-105 transition-transform duration-200 -mt-2 -ml-2"
                style={{
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3)) drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                }}
              />
              <span className="text-xs text-white/90 font-medium uppercase tracking-wider drop-shadow-md">
                Sealed
              </span>
            </div>

            <div className="text-center">
              <p className="text-white/80 text-sm mb-1 drop-shadow-md">Gift Envelope</p>
              <p className="text-white text-2xl font-antonio drop-shadow-lg">
                {asset === 'USDC' ? `$${displayAmount}` : `${displayAmount}`} {asset}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-white/80 drop-shadow-md">
              <span>To: {recipientLabel.slice(0, 8)}...</span>
              {expiresAt && <span>Expires: {expiresAt}</span>}
            </div>
          </>
        ) : (
          <>
            {/* Revealed state */}
            <div className="flex items-start justify-between">
              <img 
                src={novaGiftLogo} 
                alt="Nova Gift Logo" 
                className="h-8 w-auto drop-shadow-2xl shadow-black/30 transform hover:scale-105 transition-transform duration-200 -mt-2 -ml-2"
                style={{
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3)) drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                }}
              />
              <span className="text-xs text-white/90 font-medium uppercase tracking-wider drop-shadow-md">
                Opened
              </span>
            </div>

            <div className="text-center">
              <p className="text-white/80 text-sm mb-1 drop-shadow-md">You received</p>
              {animateAmount && typeof usdCents === 'number' ? (
                <CountUp
                  toCents={usdCents}
                  asset={asset}
                  className="text-white text-3xl font-antonio text-glow"
                />
              ) : (
                <p className="text-white text-3xl font-antonio text-glow">
                  {asset === 'USDC' ? `$${usdCents ? (usdCents / 100).toFixed(2) : amount}` : `${usdCents ? (usdCents / 100).toFixed(2) : amount}`} {asset}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-white/90 drop-shadow-md">
                <span>From:</span>
                <span className="font-mono">{senderLabel.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between text-xs text-white/90 drop-shadow-md">
                <span>To:</span>
                <span className="font-mono">{recipientLabel.slice(0, 8)}...</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16 z-5" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12 z-5" />
    </div>
  );
};
