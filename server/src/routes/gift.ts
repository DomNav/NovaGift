import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { giftService, CreateGiftInputSchema, GiftMode, AssetCode } from '../services/gift';
import { prisma } from '../db/client';
import { requireAuth } from '../middlewares/requireAuth';
import { rateLimitGiftByMethod } from '../middleware/rate-limit';

const router = Router();

/**
 * POST /api/gift
 * Unified endpoint for creating gifts (single, multi, pool)
 */
router.post('/', requireAuth, rateLimitGiftByMethod, async (req: Request, res: Response) => {
  try {
    // Extract wallet from authenticated request
    const userWallet = (req as any).wallet;
    if (!userWallet || !userWallet.publicKey) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's wallet from database
    const wallet = await prisma.wallet.findFirst({
      where: {
        publicKey: userWallet.publicKey,
        walletType: 'HOT',
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!wallet) {
      return res.status(400).json({ error: 'No wallet found for user' });
    }

    // Parse and validate input
    const inputSchema = z.object({
      mode: z.enum(['SINGLE', 'MULTI', 'POOL']),
      recipients: z.array(z.string()).min(1).max(100),
      amountAtomic: z.string().regex(/^\d+$/),
      assetCode: z.enum(['USDC', 'XLM']),
      expiryTs: z.number().int().positive(),
      poolSize: z.number().int().positive().optional(),
      message: z.string().max(280).optional(),
      attachNft: z.boolean().optional(),
    });

    const parseResult = inputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: parseResult.error.flatten(),
      });
    }

    const input = parseResult.data;

    // Validate mode-specific requirements
    if (input.mode === 'SINGLE' && input.recipients.length !== 1) {
      return res.status(400).json({
        error: 'SINGLE mode requires exactly one recipient',
      });
    }

    if (input.mode === 'MULTI' && input.recipients.length < 2) {
      return res.status(400).json({
        error: 'MULTI mode requires at least 2 recipients',
      });
    }

    if (input.mode === 'POOL') {
      if (!input.poolSize) {
        return res.status(400).json({
          error: 'POOL mode requires poolSize parameter',
        });
      }
      if (input.poolSize < 2) {
        return res.status(400).json({
          error: 'Pool size must be at least 2',
        });
      }
      // For pools, recipients array can contain initial claimants or be empty
      if (input.recipients.length > input.poolSize) {
        return res.status(400).json({
          error: 'Recipients cannot exceed pool size',
        });
      }
    }

    // Create gift using the service
    const result = await giftService.create({
      mode: input.mode as GiftMode,
      recipients: input.recipients,
      amountAtomic: input.amountAtomic,
      assetCode: input.assetCode as AssetCode,
      expiryTs: input.expiryTs,
      poolSize: input.poolSize,
      message: input.message,
      senderWalletId: wallet.id,
      attachNft: input.attachNft,
    });

    // Return success response
    return res.status(201).json({
      ok: true,
      data: result,
    });

  } catch (error) {
    console.error('Create gift error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input',
        details: error.flatten(),
      });
    }

    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('Wallet not found')) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('mode requires')) {
        return res.status(400).json({ error: error.message });
      }
    }

    return res.status(500).json({
      error: 'Failed to create gift',
    });
  }
});

/**
 * GET /api/gift/:id
 * Get gift details (works for envelope ID, QR code ID, or pool ID)
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Try to find as envelope first
    const envelope = await prisma.envelope.findUnique({
      where: { id },
      select: {
        id: true,
        asset: true,
        amount: true,
        decimals: true,
        sender: true,
        recipient: true,
        status: true,
        expiryTs: true,
        message: true,
        attachNft: true,
        openedAt: true,
        canceledAt: true,
      },
    });

    if (envelope) {
      return res.json({
        ok: true,
        type: 'envelope',
        data: {
          ...envelope,
          amount: envelope.amount.toString(),
        },
      });
    }

    // Try to find as QR code (pool)
    const qrCode = await prisma.qrCode.findUnique({
      where: { id },
      include: {
        events: {
          where: {
            eventType: 'POOL_ENVELOPE_CREATED',
          },
          include: {
            envelope: {
              select: {
                id: true,
                status: true,
                recipient: true,
              },
            },
          },
        },
      },
    });

    if (qrCode) {
      const metadata = qrCode.metadata as any;
      const claimedCount = qrCode.events.filter(
        e => e.envelope?.status === 'OPENED'
      ).length;
      const availableCount = qrCode.maxUses - claimedCount;

      return res.json({
        ok: true,
        type: 'pool',
        data: {
          id: qrCode.id,
          poolId: metadata?.poolId,
          assetCode: metadata?.assetCode,
          perClaimAmount: metadata?.perClaimAmount,
          totalAmount: metadata?.totalAmount,
          poolSize: qrCode.maxUses,
          claimedCount,
          availableCount,
          expiresAt: qrCode.expiresAt,
          isActive: qrCode.isActive,
          message: metadata?.message,
        },
      });
    }

    // Try to find by poolId in QR metadata
    const qrByPoolId = await prisma.qrCode.findFirst({
      where: {
        projectId: id,
      },
      include: {
        events: {
          where: {
            eventType: 'POOL_ENVELOPE_CREATED',
          },
          include: {
            envelope: {
              select: {
                id: true,
                status: true,
                recipient: true,
              },
            },
          },
        },
      },
    });

    if (qrByPoolId) {
      const metadata = qrByPoolId.metadata as any;
      const claimedCount = qrByPoolId.events.filter(
        e => e.envelope?.status === 'OPENED'
      ).length;
      const availableCount = qrByPoolId.maxUses - claimedCount;

      return res.json({
        ok: true,
        type: 'pool',
        data: {
          id: qrByPoolId.id,
          poolId: id,
          assetCode: metadata?.assetCode,
          perClaimAmount: metadata?.perClaimAmount,
          totalAmount: metadata?.totalAmount,
          poolSize: qrByPoolId.maxUses,
          claimedCount,
          availableCount,
          expiresAt: qrByPoolId.expiresAt,
          isActive: qrByPoolId.isActive,
          message: metadata?.message,
        },
      });
    }

    return res.status(404).json({
      error: 'Gift not found',
    });

  } catch (error) {
    console.error('Get gift error:', error);
    return res.status(500).json({
      error: 'Failed to retrieve gift',
    });
  }
});

/**
 * GET /api/gift/pool/:qrCodeId/claim
 * Get next available envelope from a pool
 */
router.get('/pool/:qrCodeId/claim', requireAuth, async (req: Request, res: Response) => {
  try {
    const { qrCodeId } = req.params;
    const userWallet = (req as any).wallet;

    // Get the QR code
    const qrCode = await prisma.qrCode.findUnique({
      where: { id: qrCodeId },
      include: {
        events: {
          where: {
            eventType: 'POOL_ENVELOPE_CREATED',
          },
          include: {
            envelope: true,
          },
        },
      },
    });

    if (!qrCode) {
      return res.status(404).json({ error: 'Pool not found' });
    }

    if (!qrCode.isActive) {
      return res.status(400).json({ error: 'Pool is no longer active' });
    }

    if (qrCode.expiresAt && new Date() > qrCode.expiresAt) {
      return res.status(400).json({ error: 'Pool has expired' });
    }

    // Find an unclaimed envelope
    const availableEvent = qrCode.events.find(
      e => e.envelope && e.envelope.status === 'FUNDED' && !e.envelope.recipient
    );

    if (!availableEvent || !availableEvent.envelope) {
      return res.status(404).json({ error: 'No envelopes available in pool' });
    }

    // Get claimer's wallet
    const wallet = await prisma.wallet.findFirst({
      where: {
        publicKey: userWallet.publicKey,
      },
    });

    if (!wallet) {
      return res.status(400).json({ error: 'No wallet found for user' });
    }

    // Reserve the envelope for this user
    const updatedEnvelope = await prisma.envelope.update({
      where: { id: availableEvent.envelope.id },
      data: {
        recipient: wallet.publicKey,
      },
    });

    // Track the claim event
    await prisma.qrEvent.create({
      data: {
        qrCodeId,
        envelopeId: updatedEnvelope.id,
        eventType: 'POOL_CLAIM_RESERVED',
        metadata: {
          claimedBy: wallet.publicKey,
          claimedAt: new Date().toISOString(),
        } as any,
      },
    });

    // Update QR code usage count
    await prisma.qrCode.update({
      where: { id: qrCodeId },
      data: {
        currentUses: {
          increment: 1,
        },
      },
    });

    return res.json({
      ok: true,
      envelope: {
        id: updatedEnvelope.id,
        amount: updatedEnvelope.amount.toString(),
        assetCode: updatedEnvelope.asset,
        preimage: updatedEnvelope.preimage,
        expiryTs: updatedEnvelope.expiryTs,
        message: updatedEnvelope.message,
      },
    });

  } catch (error) {
    console.error('Claim from pool error:', error);
    return res.status(500).json({
      error: 'Failed to claim from pool',
    });
  }
});

export default router;