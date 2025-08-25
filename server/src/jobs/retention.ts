import { prisma } from '../db/client';

/**
 * PIPEDA-compliant data retention job
 * Deletes or anonymizes Profile records past their retention date
 * 
 * Run periodically (e.g., daily) via cron or scheduled task:
 * npm run retention
 */
export async function runRetention(): Promise<void> {
  console.log('[Retention] Starting data retention job...');
  
  try {
    const now = new Date();
    
    // Find profiles with expired retention periods
    const expiredProfiles = await prisma.profile.findMany({
      where: {
        dataRetentionUntil: {
          not: null,
          lte: now,
        },
      },
    });
    
    if (expiredProfiles.length === 0) {
      console.log('[Retention] No profiles to process');
      return;
    }
    
    console.log(`[Retention] Found ${expiredProfiles.length} profiles to process`);
    
    // Process each expired profile
    for (const profile of expiredProfiles) {
      try {
        // Option 1: Full deletion (stricter compliance)
        await deleteProfile(profile.wallet);
        
        // Option 2: Anonymization (preserves analytics)
        // await anonymizeProfile(profile.wallet);
        
        console.log(`[Retention] Processed wallet: ${profile.wallet.slice(0, 8)}...`);
      } catch (error) {
        console.error(`[Retention] Failed to process wallet ${profile.wallet}:`, error);
      }
    }
    
    console.log('[Retention] Data retention job completed');
  } catch (error) {
    console.error('[Retention] Job failed:', error);
    process.exit(1);
  }
}

/**
 * Delete a profile and associated data
 */
async function deleteProfile(wallet: string): Promise<void> {
  await prisma.profile.delete({
    where: { wallet },
  });
}

/**
 * Anonymize a profile while preserving aggregated data
 * Alternative to deletion for analytics purposes
 */
async function anonymizeProfile(wallet: string): Promise<void> {
  await prisma.profile.update({
    where: { wallet },
    data: {
      // Replace wallet with anonymized identifier
      wallet: `ANON_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      // Reset personal preferences
      language: 'en',
      // Clear consent data
      consentGiven: false,
      consentTimestamp: null,
      dataRetentionUntil: null,
      // Preserve aggregated metrics
      // km and usdEarned are kept for analytics
    },
  });
}

// Execute if run directly
if (require.main === module) {
  runRetention()
    .then(() => {
      console.log('[Retention] Job finished successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Retention] Job failed:', error);
      process.exit(1);
    });
}