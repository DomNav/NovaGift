import { useState, useEffect } from 'react'
import confetti from 'canvas-confetti'
import { EnvelopeCard } from '@/components/ui/EnvelopeCard'
import { useToast } from '@/hooks/useToast'
import { useSkins } from '@/store/skins'

export const Open = () => {
  const { addToast } = useToast()
  const { selectedSealedId, selectedOpenedId, getById, hydrate } = useSkins()
  const [envelopeId, setEnvelopeId] = useState('')
  const [isOpening, setIsOpening] = useState(false)
  const [isOpened, setIsOpened] = useState(false)
  const [envelopeData] = useState({
    amount: '250',
    sender: 'GDEMO...SENDER',
    recipient: 'GDEMO...WALLET',
  })
  
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  
  const sealedSkin = getById(selectedSealedId)
  const openedSkin = getById(selectedOpenedId)
  
  useEffect(() => {
    hydrate()
  }, [])

  const handleOpen = () => {
    if (!envelopeId) {
      addToast('Please enter an envelope ID', 'error')
      return
    }
    
    if (reduce) { 
      setIsOpened(true); 
      addToast("Unsealed. Funds delivered.", "success"); 
      confetti({ 
        particleCount: 90, 
        spread: 70, 
        origin: { y: 0.7 } 
      }); 
      return; 
    }
    
    setIsOpening(true)
  }
  
  const handleReset = () => {
    setIsOpened(false)
    setEnvelopeId('')
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-antonio gradient-text mb-2">Open Gift Envelope</h1>
        <p className="text-brand-text/60">Enter the envelope ID to reveal your gift</p>
      </div>
      
      {!isOpened ? (
        <div className="space-y-8">
          {/* Input Section */}
          <div className="glass-card p-6 max-w-md mx-auto">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Envelope ID</label>
                <input
                  type="text"
                  value={envelopeId}
                  onChange={(e) => setEnvelopeId(e.target.value)}
                  placeholder="Enter envelope ID or scan QR code"
                  className="input-base"
                />
              </div>
              
              <button
                onClick={handleOpen}
                disabled={isOpening || !envelopeId}
                className="w-full btn-granite-primary flex items-center justify-center gap-2"
              >
                {isOpening ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Opening...</span>
                  </>
                ) : (
                  <>
                    <span>📬</span>
                    <span>Open Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Sealed Envelope Preview */}
          <div className="flex flex-col items-center">
            <EnvelopeCard
              variant="sealed"
              skin={sealedSkin}
              usdCents={envelopeId ? undefined : 0}
              amount={envelopeId ? '???' : '0'}
              toLabel="GDEMO...WALLET"
              openingFx={isOpening}
              onOpenFxDone={() => {
                setIsOpening(false);
                setIsOpened(true);
                addToast("Unsealed. Funds delivered.", "success");
                confetti({ 
                  particleCount: 90, 
                  spread: 70, 
                  origin: { y: 0.7 } 
                });
              }}
            />
            <p className="text-sm text-brand-text/40 mt-4">
              {envelopeId ? 'Ready to reveal your gift!' : 'Enter an envelope ID above'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Opened Envelope */}
          <div className="flex flex-col items-center animate-fade-in">
            <EnvelopeCard
              variant="opened"
              skin={openedSkin}
              usdCents={parseInt(envelopeData.amount) * 100}
              fromLabel={envelopeData.sender}
              toLabel={envelopeData.recipient}
              animateAmount={true}
              className="animate-reveal"
            />
            
            <div className="mt-8 text-center space-y-4">
              <div className="glass-card p-6 max-w-md">
                <h2 className="text-2xl font-antonio mb-2">
                  <span className="gradient-text">Congratulations!</span>
                </h2>
                <p className="text-lg mb-4">
                  You've received ${envelopeData.amount} USDC
                </p>
                <div className="text-sm text-brand-text/60 space-y-1">
                  <p>The funds have been transferred to your wallet</p>
                  <p className="font-mono text-xs">{envelopeData.recipient}</p>
                </div>
              </div>
              
              <button
                onClick={handleReset}
                className="btn-secondary text-sm"
              >
                Open Another Envelope
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Instructions */}
      <div className="mt-12 glass-card p-4 max-w-md mx-auto">
        <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
          <span>💡</span>
          How to find your envelope ID
        </h3>
        <ul className="text-xs text-brand-text/60 space-y-1">
          <li>• Check the link or QR code shared with you</li>
          <li>• Look for the envelope ID in your email or message</li>
          <li>• Contact the sender if you can't find it</li>
        </ul>
      </div>
    </div>
  )
}