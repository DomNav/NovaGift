import { useState } from 'react'

interface QRCardProps {
  address: string
  amount?: string
  memo?: string
}

export const QRCard = ({ address, amount = '100', memo = 'SoroSeal Gift' }: QRCardProps) => {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = () => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  // Placeholder QR code - in production would use a real QR library
  const qrPlaceholder = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='white'/%3E%3Cg fill='black'%3E%3Crect x='10' y='10' width='30' height='30'/%3E%3Crect x='50' y='10' width='10' height='10'/%3E%3Crect x='70' y='10' width='10' height='10'/%3E%3Crect x='90' y='10' width='10' height='10'/%3E%3Crect x='110' y='10' width='10' height='10'/%3E%3Crect x='130' y='10' width='10' height='10'/%3E%3Crect x='160' y='10' width='30' height='30'/%3E%3Crect x='10' y='50' width='10' height='10'/%3E%3Crect x='30' y='50' width='10' height='10'/%3E%3Crect x='70' y='50' width='30' height='30'/%3E%3Crect x='110' y='50' width='10' height='10'/%3E%3Crect x='130' y='50' width='10' height='10'/%3E%3Crect x='160' y='50' width='10' height='10'/%3E%3Crect x='180' y='50' width='10' height='10'/%3E%3Crect x='10' y='70' width='10' height='10'/%3E%3Crect x='50' y='70' width='10' height='10'/%3E%3Crect x='90' y='70' width='10' height='10'/%3E%3Crect x='130' y='70' width='10' height='10'/%3E%3Crect x='160' y='70' width='10' height='10'/%3E%3Crect x='10' y='90' width='10' height='10'/%3E%3Crect x='30' y='90' width='10' height='10'/%3E%3Crect x='50' y='90' width='30' height='30'/%3E%3Crect x='90' y='90' width='10' height='10'/%3E%3Crect x='110' y='90' width='10' height='10'/%3E%3Crect x='130' y='90' width='30' height='30'/%3E%3Crect x='170' y='90' width='10' height='10'/%3E%3Crect x='10' y='110' width='10' height='10'/%3E%3Crect x='50' y='110' width='10' height='10'/%3E%3Crect x='90' y='110' width='10' height='10'/%3E%3Crect x='130' y='110' width='10' height='10'/%3E%3Crect x='170' y='110' width='10' height='10'/%3E%3Crect x='10' y='130' width='10' height='10'/%3E%3Crect x='30' y='130' width='10' height='10'/%3E%3Crect x='70' y='130' width='10' height='10'/%3E%3Crect x='90' y='130' width='10' height='10'/%3E%3Crect x='110' y='130' width='10' height='10'/%3E%3Crect x='130' y='130' width='10' height='10'/%3E%3Crect x='150' y='130' width='10' height='10'/%3E%3Crect x='170' y='130' width='10' height='10'/%3E%3Crect x='10' y='160' width='30' height='30'/%3E%3Crect x='50' y='160' width='10' height='10'/%3E%3Crect x='70' y='160' width='10' height='10'/%3E%3Crect x='90' y='160' width='10' height='10'/%3E%3Crect x='110' y='160' width='10' height='10'/%3E%3Crect x='130' y='160' width='10' height='10'/%3E%3Crect x='160' y='160' width='30' height='30'/%3E%3C/g%3E%3C/svg%3E`
  
  return (
    <div className="glass-card p-6 max-w-sm">
      <div className="text-center mb-4">
        <h3 className="text-lg font-medium text-brand-text mb-1">Scan to Fund</h3>
        <p className="text-sm text-brand-text/60">Send ${amount} USDC to this address</p>
      </div>
      
      <div className="bg-white p-4 rounded-lg mb-4">
        <img src={qrPlaceholder} alt="QR Code" className="w-full h-auto" />
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-brand-text/60">Address:</span>
          <span className="font-mono text-brand-text">{address.slice(0, 8)}...</span>
        </div>
        
        {memo && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-brand-text/60">Memo:</span>
            <span className="text-brand-text">{memo}</span>
          </div>
        )}
        
        <button
          onClick={handleCopy}
          className="w-full btn-secondary text-sm flex items-center justify-center gap-2"
        >
          {copied ? (
            <>
              <span className="text-brand-positive">✓</span>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <span>📋</span>
              <span>Copy Address</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}