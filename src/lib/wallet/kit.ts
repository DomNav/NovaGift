import { 
  StellarWalletsKit, 
  WalletNetwork,
  ISupportedWallet,
  FreighterModule,
  FREIGHTER_ID,
  AlbedoModule,
  xBullModule,
  RabetModule,
  LobstrModule,
  HanaModule,
} from '@creit.tech/stellar-wallets-kit';

// Initialize kit with all available wallet modules
export const kit = new StellarWalletsKit({
  network: WalletNetwork.TESTNET,
  selectedWalletId: FREIGHTER_ID, // Default to Freighter
  modules: [
    new FreighterModule(),
    new AlbedoModule(),
    new xBullModule(),
    new RabetModule(),
    new LobstrModule(),
    new HanaModule(),
  ],
});

let currentWallet: ISupportedWallet | null = null;
let currentWalletId: string | null = null;

export async function connectWallet(): Promise<{ publicKey: string; connected: boolean; error?: string }> {
  try {
    await kit.openModal({
      onWalletSelected: async (option: ISupportedWallet) => {
        try {
          kit.setWallet(option.id);
          currentWallet = option;
          currentWalletId = option.id;
          
          const publicKey = await kit.getPublicKey();
          
          if (publicKey) {
            localStorage.setItem('wallet_address', publicKey);
            localStorage.setItem('wallet_connected', 'true');
            localStorage.setItem('wallet_type', option.id);
            return { publicKey, connected: true };
          }
        } catch (error) {
          console.error('Failed to connect wallet:', error);
        }
      },
    });

    // Get public key after modal closes and wallet is selected
    if (currentWalletId) {
      const publicKey = await kit.getPublicKey();
      if (publicKey) {
        localStorage.setItem('wallet_address', publicKey);
        localStorage.setItem('wallet_connected', 'true');
        localStorage.setItem('wallet_type', currentWalletId);
        return { publicKey, connected: true };
      }
    }

    return { publicKey: '', connected: false, error: 'Failed to connect wallet' };
  } catch (error) {
    console.error('Connection error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
    return { publicKey: '', connected: false, error: errorMessage };
  }
}

export async function signXdr(xdr: string, publicKey?: string): Promise<string> {
  if (!currentWalletId) {
    const walletType = localStorage.getItem('wallet_type');
    if (walletType) {
      kit.setWallet(walletType);
      currentWalletId = walletType;
    } else {
      throw new Error('No wallet connected');
    }
  }

  const result = await kit.signTx({
    xdr,
    publicKeys: publicKey ? [publicKey] : [await kit.getPublicKey()],
    network: WalletNetwork.TESTNET,
  });

  return result.result;
}

export async function disconnectWallet(): Promise<void> {
  currentWallet = null;
  currentWalletId = null;
  localStorage.removeItem('wallet_address');
  localStorage.removeItem('wallet_connected');
  localStorage.removeItem('wallet_type');
}

export function detectWallet(): boolean {
  // Check if we're in a browser environment
  return typeof window !== 'undefined';
}

export async function restoreConnection(): Promise<{ publicKey: string; connected: boolean }> {
  const storedAddress = localStorage.getItem('wallet_address');
  const storedConnected = localStorage.getItem('wallet_connected') === 'true';
  const walletType = localStorage.getItem('wallet_type');

  if (storedAddress && storedConnected && walletType) {
    try {
      kit.setWallet(walletType);
      currentWalletId = walletType;
      
      const publicKey = await kit.getPublicKey();
      if (publicKey === storedAddress) {
        return { publicKey, connected: true };
      }
    } catch (error) {
      console.error('Failed to restore wallet connection:', error);
    }
  }

  return { publicKey: '', connected: false };
}