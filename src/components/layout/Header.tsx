import { useState, useEffect, useRef } from 'react'
import { connect, disconnect, formatAddress, isFreighterInstalled } from '@/lib/wallet'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import KaleometerChip from '@/components/ui/KaleometerChip'

export const Header = () => {
  const [wallet, setWallet] = useState<{ publicKey: string } | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [showDisconnectMenu, setShowDisconnectMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Auto-connect on mount for demo
    handleConnect()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowDisconnectMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
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

  const handleDisconnect = async () => {
    try {
      const success = await disconnect()
      if (success) {
        setWallet(null)
        setShowDisconnectMenu(false)
      }
    } catch (error) {
      console.error('Failed to disconnect wallet:', error)
    }
  }

  return (
    <header className="h-16 bg-brand-surface/50 backdrop-blur-lg border-b border-brand-text/10 dark:border-white/10 px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-medium text-brand-text/80">Dashboard</h2>
      </div>
      
      <div className="flex items-center gap-4">
        <KaleometerChip />
        <ThemeToggle />
        
        {!isFreighterInstalled() && (
          <span className="text-xs text-brand-text/50">Demo Mode</span>
        )}
        
        {wallet ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowDisconnectMenu(!showDisconnectMenu)}
              className="glass-card px-4 py-2 flex items-center gap-2 hover:bg-brand-text/5 transition-colors"
            >
              <div className="w-2 h-2 bg-brand-positive rounded-full animate-pulse" />
              <span className="text-sm font-mono">{formatAddress(wallet.publicKey)}</span>
              <svg 
                className={`w-4 h-4 text-brand-text/50 transition-transform ${showDisconnectMenu ? 'rotate-180' : ''}`}
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showDisconnectMenu && (
              <div className="absolute top-full right-0 mt-1 w-48 bg-brand-surface border border-brand-text/10 dark:border-white/10 rounded-lg shadow-lg backdrop-blur-lg z-50">
                <div className="p-1">
                  <button
                    onClick={handleDisconnect}
                    className="w-full text-left px-3 py-2 text-sm text-brand-text/70 hover:bg-brand-text/5 rounded-md transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Disconnect Wallet
                  </button>
                  <div className="px-3 py-2 text-xs text-brand-text/50 border-t border-brand-text/10 dark:border-white/10">
                    {wallet.publicKey}
                  </div>
                </div>
              </div>
            )}
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