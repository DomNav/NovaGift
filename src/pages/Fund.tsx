import { useState } from 'react'
import confetti from 'canvas-confetti'
import { QRCard } from '@/components/ui/QRCard'
import { PriceBox } from '@/components/ui/PriceBox'
import { useToast } from '@/hooks/useToast'
import { notifyRecipient } from '@/lib/notify'

export const Fund = () => {
  const { addToast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'USDC' | 'XLM'>('USDC')
  
  const envelopeAddress = 'GDEMO...ENVELOPE'
  const amount = '100'
  const envelopeId = '001'
  const recipientEmail = 'recipient@example.com' // This would come from envelope metadata
  const skinId = 'default' // This would come from envelope metadata
  
  const handleSend = async () => {
    setIsProcessing(true)
    
    // Simulate transaction
    await new Promise((resolve) => setTimeout(resolve, 2000))
    
    setIsProcessing(false)
    setIsSuccess(true)
    
    // Fire confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#1D2BFF', '#4A5FFF', '#7B8CFF', '#2ECC71'],
    })
    
    // Show toast
    addToast(`Successfully sent ${amount} ${paymentMethod}!`, 'success')
    
    // Send email notification if recipient email exists
    if (recipientEmail) {
      await notifyRecipient({
        envelopeId,
        email: recipientEmail,
        amountUsd: parseFloat(amount),
        skinId
      })
    }
    
    // Reset button after delay
    setTimeout(() => {
      setIsSuccess(false)
    }, 3000)
  }
  
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-antonio gradient-text mb-2">Fund Envelope</h1>
        <p className="text-brand-text/60">Add funds to an existing gift envelope</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* QR Code Section */}
        <div className="flex flex-col items-center">
          <QRCard
            address={envelopeAddress}
            amount={amount}
            memo="NovaGift Gift #001"
          />
          
          <div className="mt-6 glass-card p-4 max-w-sm w-full">
            <h3 className="text-sm font-medium mb-2">Envelope Details</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-brand-text/60">ID:</span>
                <span className="font-mono">#001</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-text/60">Created:</span>
                <span>2 hours ago</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-text/60">Status:</span>
                <span className="text-yellow-400">Awaiting Funds</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Payment Section */}
        <div className="space-y-6">
          <PriceBox
            amount={amount}
            onPaymentMethodChange={setPaymentMethod}
          />
          
          <button
            onClick={handleSend}
            disabled={isProcessing || isSuccess}
            className="w-full btn-granite-primary flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : isSuccess ? (
              <>
                <span>✓</span>
                <span>Success!</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Send {amount} {paymentMethod}</span>
              </>
            )}
          </button>
          
          <div className="glass-card p-4">
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <span>🔒</span>
              Security Note
            </h3>
            <p className="text-xs text-brand-text/60">
              Funds are secured by smart contract escrow and can only be claimed
              by the designated recipient. If unclaimed before expiry, funds are
              automatically returned.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}