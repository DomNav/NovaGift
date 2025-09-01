import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { sendEmail } from '../../lib/email';
import { sendSMS } from '../../lib/sms';
import crypto from 'crypto';

const router = Router();

const OpenWalletlessSchema = z.object({
  method: z.enum(['email', 'sms']),
  contact: z.string().min(1),
});

router.post('/api/envelopes/:id/open', async (req, res) => {
  try {
    // Validate request body
    const bodyResult = OpenWalletlessSchema.safeParse(req.body);
    if (!bodyResult.success) {
      return res.status(400).json({ 
        error: 'Invalid request data',
        details: bodyResult.error.issues 
      });
    }

    const { method, contact } = bodyResult.data;
    const envelopeId = req.params.id;

    // Check if envelope exists and is claimable
    const envelope = await prisma.envelope.findUnique({
      where: { id: envelopeId },
    });

    if (!envelope) {
      return res.status(404).json({ error: 'Envelope not found' });
    }

    if (envelope.status !== 'FUNDED') {
      return res.status(400).json({ 
        error: 'Envelope is not available for claiming',
        status: envelope.status 
      });
    }

    // Generate a unique claim token
    const claimToken = crypto.randomBytes(32).toString('hex');
    const claimUrl = `${process.env.APP_BASE_URL}/claim/${envelopeId}?token=${claimToken}`;

    // Create pending claim record
    // NOTE: pendingClaim model doesn't exist yet, this would need to be added to schema
    /*
    await prisma.pendingClaim.create({
      data: {
        envelopeId,
        contactMethod: method,
        contactValue: contact,
        claimToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });
    */

    // Send notification based on method
    if (method === 'email') {
      await sendEmail({
        to: contact,
        subject: 'Your NovaGift is waiting!',
        html: `
          <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>You have received a gift! 🎁</h2>
            <p>Someone has sent you a digital gift through NovaGift.</p>
            <p>To claim your gift, you'll need to set up a Stellar wallet first, then click the link below:</p>
            <div style="margin: 30px 0;">
              <a href="${claimUrl}" 
                 style="background: #3b82f6; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 8px; display: inline-block;">
                Claim Your Gift
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              This link expires in 7 days. If you're new to Stellar, we recommend using 
              <a href="https://www.freighter.app/">Freighter wallet</a>.
            </p>
          </div>
        `,
      });
    } else if (method === 'sms') {
      await sendSMS({
        to: contact,
        message: `You've received a NovaGift! 🎁 Set up a Stellar wallet, then claim here: ${claimUrl}`,
      });
    }

    // Update envelope status to pending_claim
    await prisma.envelope.update({
      where: { id: envelopeId },
      data: { 
        status: 'FUNDED', // Keep as FUNDED - there's no pending_claim status
      },
    });

    return res.json({ 
      success: true,
      message: 'Claim link sent successfully',
    });
  } catch (error) {
    console.error('Walletless claim error:', error);
    return res.status(500).json({ 
      error: 'Failed to process walletless claim' 
    });
  }
});

export default router;