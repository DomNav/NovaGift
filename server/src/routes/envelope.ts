import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import * as envelopeRepo from '../db/envelopeRepo';
import { withTx } from '../db/tx';
import { prisma } from '../db/client';
import { config } from '../config';
import { makeOpenLink, verifyOpenToken, generatePreimage } from '../security/link';
import {
  newId,
  sha256Hex,
  buildCreateXDR,
  buildClaimTx,
  buildCancelXDR,
  createFeeBumpTx,
  parseContractEvents,
  toI128,
} from '../lib/stellar';
import { waitForTx } from '../lib/rpc';
import {
  isAllowedAsset,
  getAssetContract,
  getAssetDecimals,
  formatAssetAmount,
  SupportedAsset,
} from '../lib/assets';
import {
  needsReflectorSwap,
  executeSwap,
} from '../lib/reflector';
import { quoteAndSwap } from '../services/reflector';
import { createLimiter, openLimiter } from '../middlewares/rate';

const router = Router();

// Validation schemas
const CreateEnvelopeSchema = z.object({
  asset: z.enum(['USDC', 'XLM']),
  amount: z.string().regex(/^\d+(\.\d+)?$/, 'Invalid amount format'),
  message: z.string().max(280).optional(),
  expiresInMinutes: z.number().min(15).max(10080), // 15 min to 7 days
});

const FundEnvelopeSchema = z.object({
  id: z.string().length(64),
  txId: z.string(),
});

const OpenEnvelopeSchema = z.object({
  id: z.string().length(64),
  recipient: z.string(),
  preimage: z.string().length(64),
  wantAsset: z.enum(['USDC', 'XLM']).optional(),
});

const CancelEnvelopeSchema = z.object({
  id: z.string().length(64),
  sender: z.string(),
});

/**
 * POST /api/envelope/create
 * Create a new envelope
 */
router.post('/create', createLimiter as any, async (req: Request, res: Response) => {
  try {
    // Validate input
    const input = CreateEnvelopeSchema.parse(req.body);
    const sender = req.body.sender as string;
    
    if (!sender) {
      return res.status(400).json({ error: 'Sender address required' });
    }
    
    // Generate envelope parameters
    const id = newId();
    const preimage = generatePreimage();
    const hash = sha256Hex(preimage);
    
    // Never log the preimage for security
    const expiryTs = Math.floor(Date.now() / 1000) + (input.expiresInMinutes * 60);
    
    // Get asset info
    const assetContract = getAssetContract(input.asset);
    const decimals = getAssetDecimals(input.asset);
    
    // Build unsigned XDR
    const unsignedXDR = await buildCreateXDR({
      sender,
      assetContract,
      amount: input.amount,
      decimals,
      hash,
      expiryTs,
      id,
    });
    
    // Generate open link
    const { url: openUrl, jti, expiresAt } = makeOpenLink(id);
    
    // Store envelope record and JTI
    await withTx(async (tx) => {
      await envelopeRepo.createEnvelope({
        id,
        status: 'CREATED',
        asset: input.asset,
        amount: input.amount,
        decimals,
        sender,
        hash,
        expiryTs,
        message: input.message,
      });
      
      // Store JTI for one-time use
      await prisma.jti.create({
        data: {
          jti,
          envelopeId: id,
        },
      });
    });
    
    // Return response
    return res.json({
      id,
      unsignedXDR,
      openUrl,
      preimage, // Give preimage to sender
      expiresAt: new Date(expiresAt).toISOString(),
    });
  } catch (error) {
    // Sanitize error logs - never log sensitive data
    console.error('Create envelope error:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    return res.status(500).json({ error: 'Failed to create envelope' });
  }
});

/**
 * POST /api/envelope/fund
 * Mark envelope as funded after on-chain confirmation
 */
router.post('/fund', async (req: Request, res: Response) => {
  try {
    const input = FundEnvelopeSchema.parse(req.body);
    
    // Get envelope
    const envelope = await envelopeRepo.getEnvelope(input.id);
    if (!envelope) {
      return res.status(404).json({ error: 'Envelope not found' });
    }
    
    if (envelope.status !== 'CREATED') {
      return res.status(400).json({ error: `Envelope is ${envelope.status}, cannot fund` });
    }
    
    // Verify transaction on-chain using RPC
    const rpcUrl = config.sorobanRpcUrl || 'https://soroban-testnet.stellar.org';
    const txResult = await waitForTx(input.txId, {
      rpcUrl,
      timeoutMs: 30000,
      retries: 3
    });
    
    if (!txResult.success) {
      return res.status(400).json({ 
        error: 'Transaction verification failed',
        details: txResult.error
      });
    }
    
    // Optional: Execute Reflector swap if configured and requested
    let swapResult = null;
    if (req.body.swapToAsset && config.enableReflector) {
      const swapParams = {
        payAsset: envelope.asset,
        amount: envelope.amount.toString(),
        toAsset: req.body.swapToAsset,
        address: envelope.sender,
      };
      
      swapResult = await quoteAndSwap(swapParams);
      console.log('Reflector swap initiated:', swapResult);
    }
    
    // Update status to FUNDED after successful verification
    await envelopeRepo.markFunded(input.id, input.txId);
    
    return res.json({
      id: input.id,
      status: 'FUNDED',
      ledger: txResult.ledger,
      createdAt: txResult.createdAt,
      ...(swapResult && { swap: swapResult })
    });
  } catch (error) {
    // Sanitize error logs
    console.error('Fund envelope error:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    return res.status(500).json({ error: 'Failed to fund envelope' });
  }
});

/**
 * POST /api/envelope/open
 * Open an envelope with JWT validation and fee sponsorship
 */
router.post('/open', openLimiter as any, async (req: Request, res: Response) => {
  try {
    // Verify JWT token
    const token = req.query.t as string;
    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }
    
    let tokenPayload;
    try {
      tokenPayload = verifyOpenToken(token);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    // Validate input
    const input = OpenEnvelopeSchema.parse(req.body);
    
    // Add txId to schema if provided for transaction verification
    const txId = req.body.txId as string | undefined;
    
    // Verify token matches envelope ID
    if (tokenPayload.envId !== input.id) {
      return res.status(400).json({ error: 'Token envelope ID mismatch' });
    }
    
    // Check JTI one-time use
    const jtiRecord = await prisma.jti.findUnique({
      where: { jti: tokenPayload.jti },
    });
    
    if (!jtiRecord || jtiRecord.envelopeId !== input.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    if (jtiRecord.usedAt) {
      return res.status(401).json({ error: 'Token already used' });
    }
    
    // Mark JTI as used
    await prisma.jti.update({
      where: { jti: tokenPayload.jti },
      data: { usedAt: new Date() },
    });
    
    // Get envelope
    const envelope = await envelopeRepo.getEnvelope(input.id);
    if (!envelope) {
      return res.status(404).json({ error: 'Envelope not found' });
    }
    
    if (envelope.status !== 'FUNDED') {
      return res.status(400).json({ error: `Envelope is ${envelope.status}, cannot open` });
    }
    
    // Verify preimage
    const computedHash = sha256Hex(input.preimage);
    if (computedHash !== envelope.hash) {
      return res.status(400).json({ error: 'Invalid preimage' });
    }
    
    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (now >= envelope.expiryTs) {
      return res.status(400).json({ error: 'Envelope expired' });
    }
    
    // Build claim transaction
    const claimTx = await buildClaimTx({
      id: input.id,
      preimage: input.preimage,
      recipient: input.recipient,
    });
    
    // Fee-bump the transaction if sponsor is configured
    let finalTxXdr: string;
    if (config.enableFeeSponsorship && config.feeSponsorKey) {
      const feeBumpTx = createFeeBumpTx(claimTx, config.feeSponsorKey);
      finalTxXdr = feeBumpTx.toXDR();
    } else {
      // Recipient needs to sign and submit themselves
      finalTxXdr = claimTx.toXDR();
    }
    
    // If transaction ID is provided, verify it on-chain
    let verifiedTxId = 'pending-submission';
    if (txId) {
      const rpcUrl = config.sorobanRpcUrl || 'https://soroban-testnet.stellar.org';
      const txResult = await waitForTx(txId, {
        rpcUrl,
        timeoutMs: 30000,
        retries: 3
      });
      
      if (!txResult.success) {
        return res.status(400).json({ 
          error: 'Transaction verification failed',
          details: txResult.error
        });
      }
      verifiedTxId = txId;
    }
    
    // Check if Reflector swap is needed
    let assetDelivered = envelope.asset;
    let amountDelivered = envelope.amount;
    
    if (input.wantAsset && needsReflectorSwap(envelope.asset, input.wantAsset)) {
      // Execute Reflector swap
      const swapResult = await executeSwap({
        fromAsset: envelope.asset,
        toAsset: input.wantAsset,
        amount: envelope.amount.toString(),
        recipient: input.recipient,
      });
      
      if (swapResult.success && swapResult.deliveredAmount) {
        assetDelivered = input.wantAsset;
        amountDelivered = new Decimal(swapResult.deliveredAmount);
      }
    }
    
    // Mark as opened with verified transaction ID
    await envelopeRepo.markOpened(
      input.id,
      verifiedTxId,
      amountDelivered,
      assetDelivered as any,
      input.recipient
    );
    
    // Return receipt with XDR for client-side submission if no txId provided
    return res.json({
      id: input.id,
      status: 'OPENED',
      recipient: input.recipient,
      assetDelivered,
      amount: formatAssetAmount(amountDelivered.toString(), assetDelivered as SupportedAsset),
      txId: verifiedTxId,
      unsignedXDR: !txId ? finalTxXdr : undefined, // Include XDR if tx not yet submitted
      openedAt: new Date().toISOString(),
      memo: `NOVAGIFT:${input.id.slice(0, 8)}`,
    });
  } catch (error) {
    // Sanitize error logs - never log preimage or sensitive data
    console.error('Open envelope error:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    return res.status(500).json({ error: 'Failed to open envelope' });
  }
});

/**
 * POST /api/envelope/cancel
 * Cancel an expired envelope
 */
router.post('/cancel', async (req: Request, res: Response) => {
  try {
    const input = CancelEnvelopeSchema.parse(req.body);
    
    // Get envelope
    const envelope = await envelopeRepo.getEnvelope(input.id);
    if (!envelope) {
      return res.status(404).json({ error: 'Envelope not found' });
    }
    
    // Verify sender
    if (envelope.sender !== input.sender) {
      return res.status(403).json({ error: 'Only sender can cancel' });
    }
    
    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (now < envelope.expiryTs) {
      return res.status(400).json({ error: 'Envelope not expired yet' });
    }
    
    // Build cancel XDR
    const cancelXDR = await buildCancelXDR({
      id: input.id,
      sender: input.sender,
    });
    
    // Mark as canceled
    await envelopeRepo.markCanceled(input.id, 'mock-cancel-tx');
    
    return res.json({
      id: input.id,
      status: 'CANCELED',
      unsignedXDR: cancelXDR,
    });
  } catch (error) {
    // Sanitize error logs
    console.error('Cancel envelope error:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    return res.status(500).json({ error: 'Failed to cancel envelope' });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    ok: true,
    env: config.nodeEnv === 'production' ? 'mainnet' : 'testnet',
    timestamp: new Date().toISOString(),
  });
});

export default router;