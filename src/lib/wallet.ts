declare global {
  interface Window {
    freighter?: {
      isConnected: () => Promise<boolean>
      getPublicKey: () => Promise<string>
      signTransaction: (xdr: string, network: string) => Promise<string>
    }
  }
}

export const isFreighterInstalled = (): boolean => {
  return typeof window !== 'undefined' && !!window.freighter
}

export const connect = async (): Promise<{ publicKey: string } | null> => {
  if (!isFreighterInstalled()) {
    console.warn('Freighter wallet not installed')
    // Return mock for development
    return { publicKey: 'GDEMO...WALLET' }
  }

  try {
    const isConnected = await window.freighter!.isConnected()
    if (!isConnected) {
      // In production, would prompt user to connect
      console.log('Wallet not connected, returning mock')
      return { publicKey: 'GDEMO...WALLET' }
    }
    
    const publicKey = await window.freighter!.getPublicKey()
    return { publicKey }
  } catch (error) {
    console.error('Failed to connect wallet:', error)
    // Return mock for development
    return { publicKey: 'GDEMO...WALLET' }
  }
}

export const disconnect = async (): Promise<boolean> => {
  try {
    // For Freighter wallet, there's no explicit disconnect API
    // We'll handle disconnection at the app level by clearing local state
    // In a real app, you might want to clear any cached permissions or tokens
    
    console.log('Wallet disconnected')
    return true
  } catch (error) {
    console.error('Failed to disconnect wallet:', error)
    return false
  }
}

export const formatAddress = (address: string): string => {
  if (!address || address.length < 10) return address
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}