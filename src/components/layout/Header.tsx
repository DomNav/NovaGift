import { useState, useEffect } from 'react'
import { connect, formatAddress, isFreighterInstalled } from '@/lib/wallet'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

export const Header = () => {
  const [wallet, setWallet] = useState<{ publicKey: string } | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    // Auto-connect on mount for demo
    handleConnect()
  }, [])

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const result = await connect()
      setWallet(result)
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <header className="h-16 bg-brand-surface/50 backdrop-blur-lg border-b border-brand-text/10 dark:border-white/10 px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-medium text-brand-text/80">Dashboard</h2>
      </div>
      
      <div className="flex items-center gap-4">
        <ThemeToggle />
        
        {!isFreighterInstalled() && (
          <span className="text-xs text-brand-text/50">Demo Mode</span>
        )}
        
        {wallet ? (
          <div className="glass-card px-4 py-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-brand-positive rounded-full animate-pulse" />
            <span className="text-sm font-mono">{formatAddress(wallet.publicKey)}</span>
          </div>
        ) : (
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="btn-secondary text-sm"
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        )}
      </div>
    </header>
  )
}