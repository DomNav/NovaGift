// Passkey server routes for NovaGift
// Reference: https://github.com/kalepail/passkey-kit

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PasskeyServer } from 'passkey-kit';
import { env } from '../config/env';

const router = Router();

// Only enable routes if passkey support is enabled
if (env.ENABLE_PASSKEYS) {
  // Initialize PasskeyServer with required services
  const passkeys = new PasskeyServer({
    rpcUrl: env.STELLAR_RPC_URL!,
    launchtubeUrl: env.LAUNCHTUBE_URL!,
    launchtubeJwt: env.LAUNCHTUBE_JWT!,
    mercuryUrl: env.MERCURY_URL!,
    mercuryJwt: env.MERCURY_JWT!,
  });

  /**
   * POST /passkey/ensure
   * Ensure a passkey account exists for the given user
   */
  router.post('/ensure', async (req: Request, res: Response) => {
    try {
      const BodySchema = z.object({
        userId: z.string().min(1),
      });

      const { userId } = BodySchema.parse(req.body);

      // Create or retrieve passkey account
      const account = await passkeys.ensureAccount({ userId });

      res.json({
        success: true,
        account,
      });
    } catch (error) {
      console.error('Failed to ensure passkey account:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to ensure passkey account',
      });
    }
  });

  /**
   * POST /passkey/claim
   * Sign and submit an envelope claim transaction using passkey
   */
  router.post('/claim', async (req: Request, res: Response) => {
    try {
      const BodySchema = z.object({
        xdr: z.string().min(1),
        keyId: z.string().min(1),
      });

      const { xdr, keyId } = BodySchema.parse(req.body);

      // Sign and submit the transaction
      const result = await passkeys.signAndSubmit({ xdr, keyId });

      res.json({
        success: true,
        result,
        signedXdr: result.signedXdr,
        transactionId: result.transactionId,
      });
    } catch (error) {
      console.error('Failed to claim with passkey:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to claim with passkey',
      });
    }
  });

  /**
   * GET /passkey/status
   * Check if passkey support is enabled
   */
  router.get('/status', (_req: Request, res: Response) => {
    res.json({
      enabled: true,
      network: env.NETWORK_PASSPHRASE,
      factoryId: env.PASSKEY_FACTORY_ID,
    });
  });

  // Log that passkey routes are enabled
  console.log('✅ Passkey routes enabled at /api/passkey');
} else {
  // If passkeys are disabled, return appropriate error
  router.all('*', (_req: Request, res: Response) => {
    res.status(503).json({
      success: false,
      error: 'Passkey support is not enabled',
    });
  });

  console.log('⚠️  Passkey routes disabled (ENABLE_PASSKEYS=false)');
}

export default router;