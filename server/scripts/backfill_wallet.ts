import { PrismaClient, WalletType } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillWallets() {
  console.log('Starting wallet backfill...');
  
  try {
    // Fetch all profiles with their wallet (publicKey)
    const profiles = await prisma.profile.findMany();
    
    console.log(`Found ${profiles.length} profiles to migrate`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const profile of profiles) {
      // Skip profiles without a wallet
      if (!profile.wallet) {
        console.log('Skipping profile without wallet');
        continue;
      }
      
      try {
        // Check if a User exists with this publicKey
        let user = await prisma.user.findUnique({
          where: { publicKey: profile.wallet }
        });
        
        // If no User exists, create one
        if (!user) {
          user = await prisma.user.create({
            data: {
              publicKey: profile.wallet,
              credits: 0
            }
          });
          console.log(`Created User for wallet: ${profile.wallet}`);
        }
        
        // Check if Wallet already exists for this publicKey
        const existingWallet = await prisma.wallet.findUnique({
          where: { publicKey: profile.wallet }
        });
        
        if (existingWallet) {
          console.log(`Wallet already exists for: ${profile.wallet}`);
          skippedCount++;
          continue;
        }
        
        // Create the Wallet entry with type HOT
        await prisma.wallet.create({
          data: {
            userId: user.id,
            publicKey: profile.wallet,
            type: WalletType.HOT
          }
        });
        
        migratedCount++;
        console.log(`Migrated wallet ${migratedCount}: ${profile.wallet}`);
      } catch (error) {
        console.error(`Failed to migrate wallet for profile: ${profile.wallet}`, error);
      }
    }
    
    console.log(`\nBackfill completed:`);
    console.log(`- Migrated: ${migratedCount} wallets`);
    console.log(`- Skipped (already existed): ${skippedCount} wallets`);
    
  } catch (error) {
    console.error('Backfill failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backfill
backfillWallets()
  .then(() => {
    console.log('Backfill script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Backfill script failed:', error);
    process.exit(1);
  });