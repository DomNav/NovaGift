import { Wallet, WalletType } from '@prisma/client';
import { prisma } from '../db/client';

/**
 * Get the primary wallet for a user
 * Returns the first HOT wallet by createdAt date
 * Throws if no wallet is found
 */
export async function getPrimaryWallet(userId: string): Promise<Wallet> {
  const wallet = await prisma.wallet.findFirst({
    where: {
      userId,
      type: WalletType.HOT
    },
    orderBy: {
      createdAt: 'asc'
    }
  });
  
  if (!wallet) {
    throw new Error(`No primary wallet found for user ${userId}`);
  }
  
  return wallet;
}

/**
 * Create a new wallet for a user
 */
export async function createWallet(userId: string, publicKey: string, type: WalletType = WalletType.HOT): Promise<Wallet> {
  return prisma.wallet.create({
    data: {
      userId,
      publicKey,
      type
    }
  });
}

/**
 * Get all wallets for a user
 */
export async function getUserWallets(userId: string): Promise<Wallet[]> {
  return prisma.wallet.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' }
  });
}

/**
 * Find or create a user with a wallet
 * Used for migrating from publicKey-only authentication
 */
export async function findOrCreateUserWithWallet(publicKey: string): Promise<{ user: any; wallet: Wallet }> {
  // Check if a wallet already exists with this publicKey
  const existingWallet = await prisma.wallet.findUnique({
    where: { publicKey },
    include: { user: true }
  });
  
  if (existingWallet) {
    return { user: existingWallet.user, wallet: existingWallet };
  }
  
  // Check if a user exists with this publicKey (legacy)
  let user = await prisma.user.findUnique({
    where: { publicKey }
  });
  
  // Create user if not exists
  if (!user) {
    user = await prisma.user.create({
      data: {
        publicKey,
        credits: 0
      }
    });
  }
  
  // Create wallet for the user
  const wallet = await createWallet(user.id, publicKey, WalletType.HOT);
  
  return { user, wallet };
}