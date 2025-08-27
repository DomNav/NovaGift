import { Router, Request, Response } from 'express';
import { prisma } from '../db/client';
import { requireConsent } from '../middlewares/consent';
import { z } from 'zod';

const router = Router();

/**
 * GET /api/profile
 * Get current user's profile (requires consent)
 */
router.get('/', requireConsent, async (req: Request, res: Response) => {
  try {
    const wallet = req.headers['x-wallet'] as string;
    
    if (!wallet) {
      return res.status(400).json({ error: 'Wallet address required' });
    }
    
    // Profile already attached by consent middleware if it exists
    if (req.profile) {
      return res.json(req.profile);
    }
    
    // Profile doesn't exist yet
    return res.status(404).json({ error: 'Profile not found' });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * POST /api/profile/consent
 * Grant or revoke consent for data processing
 */
router.post('/consent', async (req: Request, res: Response) => {
  try {
    const wallet = req.headers['x-wallet'] as string;
    
    if (!wallet) {
      return res.status(400).json({ error: 'Wallet address required' });
    }
    
    const ConsentSchema = z.object({
      consentGiven: z.boolean(),
      retentionDays: z.number().min(30).max(365).optional(), // 30 days to 1 year
    });
    
    const input = ConsentSchema.parse(req.body);
    
    // Calculate retention date if consent is given
    const dataRetentionUntil = input.consentGiven && input.retentionDays
      ? new Date(Date.now() + input.retentionDays * 24 * 60 * 60 * 1000)
      : null;
    
    // Update or create profile with consent
    const profile = await prisma.profile.upsert({
      where: { wallet },
      create: {
        wallet,
        consentGiven: input.consentGiven,
        consentTimestamp: input.consentGiven ? new Date() : null,
        dataRetentionUntil,
      },
      update: {
        consentGiven: input.consentGiven,
        consentTimestamp: input.consentGiven ? new Date() : null,
        dataRetentionUntil,
      },
    });
    
    return res.json({
      wallet: profile.wallet,
      consentGiven: profile.consentGiven,
      consentTimestamp: profile.consentTimestamp,
      dataRetentionUntil: profile.dataRetentionUntil,
    });
  } catch (error) {
    console.error('Update consent error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    return res.status(500).json({ error: 'Failed to update consent' });
  }
});

/**
 * PUT /api/profile
 * Update profile data (requires consent)
 */
router.put('/', requireConsent, async (req: Request, res: Response) => {
  try {
    const wallet = req.headers['x-wallet'] as string;
    
    if (!wallet) {
      return res.status(400).json({ error: 'Wallet address required' });
    }
    
    const UpdateProfileSchema = z.object({
      language: z.string().optional(),
      km: z.number().optional(),
      usdEarned: z.number().optional(),
    });
    
    const input = UpdateProfileSchema.parse(req.body);
    
    const profile = await prisma.profile.update({
      where: { wallet },
      data: input,
    });
    
    return res.json(profile);
  } catch (error) {
    console.error('Update profile error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * DELETE /api/profile
 * Request profile deletion (PIPEDA right to erasure)
 */
router.delete('/', requireConsent, async (req: Request, res: Response) => {
  try {
    const wallet = req.headers['x-wallet'] as string;
    
    if (!wallet) {
      return res.status(400).json({ error: 'Wallet address required' });
    }
    
    // Set retention to immediate deletion
    await prisma.profile.update({
      where: { wallet },
      data: {
        dataRetentionUntil: new Date(), // Mark for immediate deletion
      },
    });
    
    return res.json({
      message: 'Profile marked for deletion',
      info: 'Your data will be deleted in the next retention cycle',
    });
  } catch (error) {
    console.error('Delete profile error:', error);
    return res.status(500).json({ error: 'Failed to delete profile' });
  }
});

export default router;