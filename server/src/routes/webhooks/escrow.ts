import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/client';
import crypto from 'crypto';
import { verifyEscrowWebhook } from '../../middleware/hmac-verify';

const router = Router();

// Schema for Soroban event webhook payload
const SorobanEventSchema = z.object({
  contractId: z.string(),
  eventType: z.enum(['escrow_claimed', 'escrow_refunded', 'escrow_created']),
  ledgerTimestamp: z.number(),
  ledgerSequence: z.number(),
  txHash: z.string(),
  data: z.object({
    escrowId: z.string(),
    address: z.string().optional(),
    amount: z.string().optional(),
  }),
  signature: z.string().optional(), // HMAC signature for verification
});


/**
 * POST /api/webhooks/escrow
 * Webhook endpoint for Soroban contract events
 */
router.post('/escrow', verifyEscrowWebhook, async (req: Request, res: Response) => {
  try {
    // Webhook has been verified by middleware
    const webhookVerified = (req as any).webhookVerified;
    const webhookTimestamp = (req as any).webhookTimestamp;
    
    if (webhookVerified) {
      console.log(`[Webhook] Verified webhook received at timestamp: ${webhookTimestamp}`);
    }

    // Parse and validate the event
    const parseResult = SorobanEventSchema.safeParse(req.body);
    if (!parseResult.success) {
      console.error('[Webhook] Invalid event payload:', parseResult.error);
      return res.status(400).json({ 
        error: 'Invalid event payload',
        details: parseResult.error.flatten()
      });
    }

    const event = parseResult.data;
    console.log(`[Webhook] Received ${event.eventType} event for escrow ${event.data.escrowId}`);

    // Convert escrow ID from hex to base64 for matching with envelope ID
    // The escrow ID is a SHA256 hash of the envelope ID
    const escrowIdBuffer = Buffer.from(event.data.escrowId, 'hex');
    
    // Find envelopes that might match this escrow
    // We'll need to compute the hash of each envelope ID to find a match
    const envelopes = await prisma.envelope.findMany({
      where: {
        contractId: event.contractId,
        status: {
          in: ['FUNDED', 'PENDING']
        }
      }
    });

    let matchedEnvelope = null;
    for (const envelope of envelopes) {
      const envelopeHash = crypto.createHash('sha256').update(envelope.id).digest();
      if (envelopeHash.equals(escrowIdBuffer)) {
        matchedEnvelope = envelope;
        break;
      }
    }

    if (!matchedEnvelope) {
      console.warn(`[Webhook] No matching envelope found for escrow ${event.data.escrowId}`);
      return res.status(200).json({ 
        ok: true, 
        message: 'Event received but no matching envelope found' 
      });
    }

    // Process the event based on type
    switch (event.eventType) {
      case 'escrow_claimed':
        // Update envelope status to OPENED
        await prisma.envelope.update({
          where: { id: matchedEnvelope.id },
          data: {
            status: 'OPENED',
            openedAt: new Date(event.ledgerTimestamp * 1000),
            claimedBy: event.data.address,
          }
        });
        
        console.log(`[Webhook] Envelope ${matchedEnvelope.id} marked as OPENED`);
        
        // Optionally trigger NFT minting if configured
        if (matchedEnvelope.attachNft) {
          await prisma.outbox.create({
            data: {
              type: 'NFT_MINT',
              payload: {
                envelopeId: matchedEnvelope.id,
                recipientAddress: event.data.address,
                txHash: event.txHash,
              },
              runAfter: new Date(),
            }
          });
          console.log(`[Webhook] Queued NFT_MINT for envelope ${matchedEnvelope.id}`);
        }
        break;

      case 'escrow_refunded':
        // Update envelope status to CANCELED
        await prisma.envelope.update({
          where: { id: matchedEnvelope.id },
          data: {
            status: 'CANCELED',
            canceledAt: new Date(event.ledgerTimestamp * 1000),
            cancelReason: 'Escrow refunded',
          }
        });
        
        console.log(`[Webhook] Envelope ${matchedEnvelope.id} marked as CANCELED (refunded)`);
        break;

      case 'escrow_created':
        // This event confirms the escrow was created on-chain
        // We might already have updated this in the ESCROW_FUND handler
        if (matchedEnvelope.status === 'PENDING') {
          await prisma.envelope.update({
            where: { id: matchedEnvelope.id },
            data: {
              status: 'FUNDED',
              fundedAt: new Date(event.ledgerTimestamp * 1000),
            }
          });
          console.log(`[Webhook] Envelope ${matchedEnvelope.id} marked as FUNDED`);
        }
        break;

      default:
        console.warn(`[Webhook] Unknown event type: ${event.eventType}`);
    }

    return res.status(200).json({ 
      ok: true,
      message: `Event ${event.eventType} processed successfully`
    });

  } catch (error) {
    console.error('[Webhook] Error processing escrow event:', error);
    return res.status(500).json({ 
      error: 'Failed to process webhook event' 
    });
  }
});

/**
 * GET /api/webhooks/escrow/health
 * Health check endpoint for webhook monitoring
 */
router.get('/escrow/health', (req: Request, res: Response) => {
  res.json({
    ok: true,
    service: 'escrow-webhook',
    timestamp: new Date().toISOString(),
  });
});

export default router;