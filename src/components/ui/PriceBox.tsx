import { useState } from 'react'
import clsx from 'clsx'

interface PriceBoxProps {
  amount: string
  onPaymentMethodChange?: (method: 'USDC' | 'XLM') => void
}

export const PriceBox = ({ amount, onPaymentMethodChange }: PriceBoxProps) => {
  const [paymentMethod, setPaymentMethod] = useState<'USDC' | 'XLM'>('USDC')
  
  const handleMethodChange = (method: 'USDC' | 'XLM') => {
    setPaymentMethod(method)
    onPaymentMethodChange?.(method)
  }
  
  // Mock conversion rate
  const xlmAmount = paymentMethod === 'XLM' ? (parseFloat(amount) * 8.5).toFixed(2) : amount
  
  return (
    <div className="glass-card p-6 space-y-4">
      <div className="space-y-2">
        <label className="text-sm text-brand-text/60">Paying with</label>
        <div className="flex gap-2">
          <button
            onClick={() => handleMethodChange('USDC')}
            className={clsx(
              'flex-1 py-2 px-4 rounded-lg transition-all duration-200',
              paymentMethod === 'USDC'
                ? 'bg-brand-primary text-white'
                : 'bg-brand-surface text-brand-text/60 hover:bg-brand-text/10',
            )}
          >
            <span className="font-medium">USDC</span>
          </button>
          <button
            onClick={() => handleMethodChange('XLM')}
            className={clsx(
              'flex-1 py-2 px-4 rounded-lg transition-all duration-200',
              paymentMethod === 'XLM'
                ? 'bg-brand-primary text-white'
                : 'bg-brand-surface text-brand-text/60 hover:bg-brand-text/10',
            )}
          >
            <span className="font-medium">XLM</span>
          </button>
        </div>
      </div>
      
      <div className="border-t border-white/10 pt-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-brand-text/60">Amount</span>
          <span className="text-lg font-medium">
            {xlmAmount} {paymentMethod}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-brand-text/60">Network Fee</span>
          <span className="text-sm">0.00001 XLM</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-brand-text/60">Reflector Price</span>
          <div className="flex items-center gap-2">
            <span className="text-sm">1 USDC = 8.5 XLM</span>
            <span className="text-xs text-brand-positive">Live</span>
          </div>
        </div>
      </div>
      
      <div className="border-t border-white/10 pt-4">
        <div className="flex justify-between items-center">
          <span className="font-medium">Total</span>
          <span className="text-xl font-antonio gradient-text">
            {xlmAmount} {paymentMethod}
          </span>
        </div>
      </div>
      
      <div className="bg-brand-primary/10 border border-brand-primary/30 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 bg-brand-primary rounded text-white font-medium">
            Best Route
          </span>
          <span className="text-xs text-brand-text/80">via Soroswap Protocol</span>
        </div>
      </div>
    </div>
  )
}