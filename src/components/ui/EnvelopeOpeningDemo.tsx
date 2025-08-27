import { useState } from 'react'
import confetti from 'canvas-confetti'
import { EnvelopeCard, EnvelopeSkin } from './EnvelopeCard'

interface EnvelopeOpeningDemoProps {
  sealedSkin?: EnvelopeSkin
  openedSkin?: EnvelopeSkin
  usdCents?: number
  toLabel?: string
  fromLabel?: string
}

export const EnvelopeOpeningDemo = ({
  sealedSkin,
  openedSkin,
  usdCents = 10000,
  toLabel = 'GDEMO...RECIPIENT',
  fromLabel = 'You'
}: EnvelopeOpeningDemoProps) => {
  const [isOpening, setIsOpening] = useState(false)
  const [isOpened, setIsOpened] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  // Check for reduced motion preference
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches

  const handleOpenDemo = () => {
    if (isOpening || isOpened) return
    
    if (reduce) {
      // Skip animation for users who prefer reduced motion
      setIsOpened(true)
      triggerConfetti()
      return
    }
    
    setIsOpening(true)
  }

  const handleOpeningComplete = () => {
    setIsOpening(false)
    setIsOpened(true)
    triggerConfetti()
  }

  const triggerConfetti = () => {
    // Trigger confetti effect
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#1D2BFF', '#4A5FFF', '#7B8CFF', '#2ECC71', '#F39C12'],
    })
  }

  const handleReset = () => {
    setIsResetting(true)
    setIsOpened(false)
    
    // Small delay to allow smooth transition
    setTimeout(() => {
      setIsResetting(false)
    }, 300)
  }

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Envelope Animation Area */}
      <div className="relative">
        {!isOpened ? (
          <EnvelopeCard
            variant="sealed"
            skin={sealedSkin}
            amount="???" // Hide amount in sealed state for surprise
            toLabel={toLabel}
            fromLabel={fromLabel}
            openingFx={isOpening}
            onOpenFxDone={handleOpeningComplete}
            className={isResetting ? "animate-fade-in" : ""}
          />
        ) : (
          <EnvelopeCard
            variant="opened"
            skin={openedSkin}
            usdCents={usdCents}
            toLabel={toLabel}
            fromLabel={fromLabel}
            animateAmount={true}
            className="animate-fade-in"
          />
        )}
      </div>

      {/* Demo Controls */}
      <div className="flex flex-col items-center space-y-4">
        {!isOpened ? (
          <button
            onClick={handleOpenDemo}
            disabled={isOpening}
            className="btn-granite-primary text-sm flex items-center gap-2 px-4 py-2"
          >
            {isOpening ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Opening...</span>
              </>
            ) : (
              <>
                <span>🎁</span>
                <span>Demo Opening</span>
              </>
            )}
          </button>
        ) : (
          <div className="text-center space-y-3">
            <div className="text-sm text-brand-text/80 font-medium">
              <span className="gradient-text">🎉 Envelope Opened!</span>
            </div>
            <button
              onClick={handleReset}
              className="btn-secondary text-sm px-4 py-2"
            >
              Reset Demo
            </button>
          </div>
        )}
        
        <div className="text-center">
          <p className="text-xs text-brand-text/60">
            {!isOpened 
              ? "See how your envelope will open"
              : "This is what the recipient will experience"
            }
          </p>
        </div>
      </div>
    </div>
  )
}
