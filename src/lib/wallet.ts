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

export const disconnect = (): void => {
  // Placeholder for disconnect logic
  console.log('Wallet disconnected')
}

export const formatAddress = (address: string): string => {
  if (!address || address.length < 10) return address
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}