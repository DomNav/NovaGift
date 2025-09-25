import { Router } from 'express';
import { z } from 'zod';
import env from '../env';
import { invoke, buildInvokeTx, getServer } from '../chain/soroban';
import { prisma } from '../db/client';
import { expert } from '../lib/explorer';
import { nanoid } from 'nanoid';
import { getContractIds } from '../lib/contracts';
import { Address, nativeToScVal, TransactionBuilder, scValToNative, xdr } from '@stellar/stellar-sdk';
import { Api } from '@stellar/stellar-sdk/rpc';
import { getInnerSource, hasSignatureFrom } from '../lib/tx';
import { getTokenDecimals, toI128 } from '../lib/token';

const router = Router();

// Validation schemas
const AmountSchema = z.string().regex(/^\d+(\.\d+)?$/, 'Invalid amount format');
const AssetSchema = z.string().min(1).max(12);
const NoteSchema = z.string().max(280).optional();

// Small pubkey guard
function isPubKey(s: string): boolean {
  return typeof s === 'string' && s.length === 56 && s.startsWith('G');
}

// Contract ID validation
function isContractId(s: string): boolean {
  return typeof s === 'string' && s.length === 56 && s.startsWith('C');
}

// U64 ID validation
function isValidU64(id: string | number): boolean {
  const num = typeof id === 'string' ? Number(id) : id;
  return Number.isFinite(num) && num >= 0 && num <= Number.MAX_SAFE_INTEGER;
}

// GET /api/envelope/contracts - Return contract IDs and network info
router.get('/contracts', (_req, res) => {
  const { envelopeId, escrowId } = getContractIds();

  res.json({
    envelopeId,
    escrowId,
    network: env.NETWORK_PASSPHRASE,
    rpcUrl: env.SOROBAN_RPC_URL,
    horizonUrl: env.HORIZON_URL,
  });
});

// GET /api/envelope-mvp/:id - Get envelope metadata for both MVP and legacy envelopes
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // First check if it's an MVP envelope (numeric ID)
    const isMvpId = isValidU64(id);

    if (isMvpId) {
      // Query the contract for MVP envelope status
      const { envelopeId: envelopeContractId } = getContractIds();
      if (!envelopeContractId) {
        return res.status(500).json({ ok: false, error: 'Envelope contract not configured' });
      }

      try {
        // DATABASE-FIRST APPROACH: MVP envelopes stored in DB during creation
        console.log(`[envelope-mvp] Looking up MVP envelope ${id} in database`);
        
        const dbEnvelope = await prisma.envelope.findUnique({ where: { id: String(id) } });
        
        if (!dbEnvelope) {
          console.log(`[envelope-mvp] Envelope ${id} not found in database`);
          return res.status(404).json({ 
            ok: false, 
            error: 'Envelope not found',
            debug: process.env.NODE_ENV === 'development' ? {
              note: 'Contract lacks getter method, using database storage',
              envelopeId: id,
              contractId: envelopeContractId
            } : undefined
          });
        }

        // Calculate current status based on database + time
        const now = Math.floor(Date.now() / 1000);
        const isExpired = dbEnvelope.expiryTs && now > dbEnvelope.expiryTs;
        const status = dbEnvelope.status === 'OPENED' ? 'OPENED' :
                      dbEnvelope.status === 'CANCELED' ? 'REFUNDED' :
                      isExpired ? 'EXPIRED' : 'FUNDED';

        console.log(`[envelope-mvp] Successfully retrieved envelope ${id} from database:`, {
          status,
          creator: dbEnvelope.sender,
          recipient: dbEnvelope.recipient,
          dbStatus: dbEnvelope.status
        });

        return res.json({
          ok: true,
          envelope: {
            id: dbEnvelope.id,
            status,
            creator: dbEnvelope.sender,
            recipient: dbEnvelope.recipient,
            asset: dbEnvelope.contractId || dbEnvelope.asset,
            amount: dbEnvelope.amount.toString(),
            decimals: dbEnvelope.decimals,
            expiry: dbEnvelope.expiryTs,
            createdAt: dbEnvelope.createdAt.toISOString(),
            claimUrl: `/claim-mvp/${id}`,
            isMvp: true,
            denom: 'USD' // Default for MVP envelopes
          }
        });
      } catch (dbError: any) {
        console.error('[envelope-mvp] Database query error:', dbError);
        return res.status(500).json({
          ok: false,
          error: 'Database error',
          debug: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        });
      }
    }

    // Check database for legacy hex ID envelopes
    const dbEnvelope = await prisma.envelope.findUnique({ where: { id } });

    if (!dbEnvelope) {
      return res.status(404).json({ ok: false, error: 'Envelope not found' });
    }

    // Return legacy envelope data
    res.json({
      ok: true,
      envelope: {
        id: dbEnvelope.id,
        status: dbEnvelope.status,
        creator: dbEnvelope.sender,
        recipient: dbEnvelope.recipient,
        asset: dbEnvelope.contractId || dbEnvelope.asset,
        amount: dbEnvelope.amount.toString(),
        decimals: dbEnvelope.decimals,
        expiry: dbEnvelope.expiryTs,
        createdAt: dbEnvelope.createdAt.toISOString(),
        claimUrl: `/open/${dbEnvelope.id}`,
        isMvp: false
      }
    });

  } catch (error: any) {
    console.error('Envelope lookup error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to fetch envelope' });
  }
});

// Legacy routes removed - using the working implementations below:
// - GET /api/envelope-mvp/:id (line 52+) - get envelope metadata for both MVP and legacy
// - POST /api/envelope-mvp/create (line 330+) - creates envelopes with create_envelope method
// - POST /api/envelope-mvp/claim (line 217+) - opens envelopes with open_envelope method
// - POST /api/envelope-mvp/refund (line 391+) - refunds with refund_after_expiry method

// GET /api/envelope/activity - Get recent activity
router.get('/activity', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    
    const envelopes = await prisma.envelope.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const activity = envelopes.map(env => ({
      id: env.id,
      amount: env.amount,
      asset: env.payAsset,
      status: env.status,
      createdAt: env.createdAt,
      lastTx: env.chainTx,
      explorer: env.chainTx ? expert.tx(env.chainTx) : null,
    }));

    res.json({ 
      ok: true, 
      activity 
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/envelope-mvp/claim
// body: { id: string|number (u64), recipient: string(G...) }
router.post('/claim', async (req, res) => {
  try {
    const { id, recipient } = req.body ?? {};
    if (!isValidU64(id) || !isPubKey(recipient)) {
      return res.status(400).json({ ok: false, error: 'Invalid id (u64) or recipient' });
    }
    const idU64 = typeof id === 'string' ? Number(id) : id;

    const { envelopeId: envelopeContractId } = getContractIds();
    if (!envelopeContractId) {
      return res.status(500).json({ ok: false, error: 'Envelope contract not configured' });
    }

    // open_envelope(recipient: Address, id: u64) -> i128
    const xdr = await buildInvokeTx(
      envelopeContractId,
      'open_envelope',
      [
        Address.fromString(recipient).toScVal(),
        nativeToScVal(idU64, { type: 'u64' }),
      ],
      recipient
    );

    res.json({
      ok: true,
      xdr,
      network: env.NETWORK_PASSPHRASE,
      rpcUrl: env.SOROBAN_RPC_URL,
    });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message || 'Failed to build claim transaction' });
  }
});

// POST /api/envelope-mvp/submit
// body: { xdr: string, signer: string(G...), metadata?: { creator, recipient, asset, amount, denom, expiry_secs, decimals } }
router.post('/submit', async (req, res) => {
  try {
    const { xdr: xdrStr, signer, metadata } = req.body ?? {};
    if (!xdrStr || typeof xdrStr !== 'string') {
      return res.status(400).json({ ok: false, error: 'Missing xdr' });
    }
    if (!signer || !isPubKey(signer)) {
      return res.status(400).json({ ok: false, error: 'Invalid signer' });
    }

    // 1) Source must match the provided signer
    const source = getInnerSource(xdrStr, env.NETWORK_PASSPHRASE);
    if (source !== signer) {
      return res.status(400).json({
        ok: false,
        error: `Source/signature mismatch: tx.source=${source} signer=${signer}`,
      });
    }

    // 2) Has a signature from signer (hint check)
    if (!hasSignatureFrom(xdrStr, env.NETWORK_PASSPHRASE, signer)) {
      return res.status(400).json({
        ok: false,
        error: 'Transaction is not signed by the provided signer',
      });
    }

    // 3) Submit + poll for final result
    const server = getServer();
    const tx = TransactionBuilder.fromXDR(xdrStr, env.NETWORK_PASSPHRASE);
    const send = await server.sendTransaction(tx);

    if ((send as any).errorResult || send.errorResultXdr) {
      return res.status(400).json({ ok: false, error: 'RPC rejected transaction', details: send });
    }

    const hash = (send as any).hash ?? (tx as any).hash?.().toString('hex');

    let native: unknown = null;
    let ledger: number | undefined;

    for (let tries = 0; tries < 30; tries++) {
      const resTx = await server.getTransaction(hash);
      if (resTx.status === Api.GetTransactionStatus.SUCCESS) {
        if (resTx.returnValue) {
          const scv = 
            typeof resTx.returnValue === 'string'
              ? xdr.ScVal.fromXDR(resTx.returnValue, 'base64')
              : resTx.returnValue;
          native = scValToNative(scv);
        }
        ledger = resTx.ledger;
        break;
      }
      if (resTx.status === Api.GetTransactionStatus.FAILED) {
        return res.status(400).json({ ok: false, error: 'Transaction failed', details: resTx });
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    // JSON-safe result
    const result = 
      typeof native === 'bigint' ? native.toString() :
      // Some SDK versions may return BN-like or BigNumber – serialize safely
      (native as any)?.toString ? (native as any).toString() : native;

    // Store MVP envelope metadata in database for lookup (since contract lacks getter)
    if (result && typeof result === 'string' && metadata) {
      try {
        const envelopeId = String(result);

        // Extract metadata with validation
        const { creator, recipient, asset, amount, denom = 'USD', expiry_secs = 0, decimals: providedDecimals } = metadata;

        // Basic validation of metadata fields
        if (!creator || !recipient || !asset || !amount) {
          console.log(`[envelope-mvp] Skipping DB storage for envelope ${envelopeId} - incomplete metadata`);
        } else {
          // Calculate expiry timestamp
          const now = Math.floor(Date.now() / 1000);
          const expiryTs = expiry_secs && Number(expiry_secs) > 0 ? now + Number(expiry_secs) : null;

          // Get token decimals (use provided or fetch)
          const decimals = providedDecimals ?? await getTokenDecimals(asset);

          // Redact addresses for logging
          const redactedCreator = creator ? `${creator.slice(0, 4)}...${creator.slice(-4)}` : 'unknown';
          const redactedRecipient = recipient ? `${recipient.slice(0, 4)}...${recipient.slice(-4)}` : 'unknown';

          console.log(`[envelope-mvp] Storing MVP envelope ${envelopeId} metadata in database (creator: ${redactedCreator}, recipient: ${redactedRecipient})`);

          await prisma.envelope.upsert({
            where: { id: String(envelopeId) },
            create: {
              id: String(envelopeId),
              sender: creator,
              recipient: recipient,
              asset: 'XLM', // Use valid Asset enum value
              contractId: asset, // Actual contract address (C...)
              amount: amount, // Pass as Decimal, not string
              decimals: decimals,
              status: 'FUNDED', // MVP envelopes are created funded
              expiryTs: expiryTs || 0,
              hash: hash || '', // tx hash from submit
              createdAt: new Date(),
              message: `MVP Envelope: ${amount} ${denom}`,
            },
            update: {
              sender: creator,
              recipient: recipient,
              asset: 'XLM', // Use valid Asset enum value
              contractId: asset,
              amount: amount, // Pass as Decimal, not string
              decimals: decimals,
              status: 'FUNDED',
              expiryTs: expiryTs || 0,
              hash: hash || '',
            }
          });

          console.log(`[envelope-mvp] Successfully stored MVP envelope ${envelopeId} in database (status: FUNDED)`);
        }
      } catch (dbError: any) {
        console.error(`[envelope-mvp] Failed to store envelope metadata:`, dbError.message || dbError);
        // Don't fail the request if metadata storage fails - just log the error
        if (process.env.NODE_ENV === 'development') {
          console.error('[envelope-mvp] DB error details:', {
            error: dbError,
            data: {
              envelopeId,
              creator,
              recipient,
              asset,
              amount,
              decimals,
              expiryTs,
              hash
            }
          });
        }
      }
    } else if (result && !metadata) {
      console.log(`[envelope-mvp] No metadata provided for envelope ${result} - skipping DB storage`);
    }

    return res.json({ ok: true, hash, result, ledger });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message || 'submit failed' });
  }
});

/**
 * POST /api/envelope-mvp/create
 * body: { creator: G..., recipient: G..., asset: C..., amount: string, denom?: string, expiry_secs?: number }
 */
router.post('/create', async (req, res) => {
  try {
    let { creator, recipient, asset, amount, denom = 'USD', expiry_secs = 0 } = req.body ?? {};
    if (!isPubKey(creator) || !isPubKey(recipient) || !isContractId(asset)) {
      return res.status(400).json({ ok: false, error: 'creator/recipient must be G..., asset must be C...' });
    }

    // WXLM pricing fallback (env-gated, route-local)
    // If flag is set and asset is WXLM, use XLM price instead of USD
    if (process.env.USE_WXLM_XLM_PRICE_FALLBACK === 'true' &&
        asset === (env.WXLM_CONTRACT_ID || 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC')) {
      console.log('[WXLM Fallback] Using XLM price for WXLM envelope');
      denom = 'XLM';
    }

    // Fetch decimals from token contract
    const decimals = await getTokenDecimals(asset);
    const scaled = toI128(String(amount), decimals);

    const { envelopeId: envelopeContractId } = getContractIds();
    if (!envelopeContractId) {
      return res.status(500).json({ ok: false, error: 'Envelope contract not configured' });
    }

    // create_envelope(creator, recipient, asset, amount_in: i128, denom: Symbol, expiry_secs: u64) -> u64
    let xdr: string;
    try {
      xdr = await buildInvokeTx(
        envelopeContractId,
        'create_envelope',
        [
          Address.fromString(creator).toScVal(),
          Address.fromString(recipient).toScVal(),
          Address.fromString(asset).toScVal(), // token contract address (C...)
          nativeToScVal(scaled, { type: 'i128' }),
          nativeToScVal(denom, { type: 'symbol' }),
          nativeToScVal(BigInt(expiry_secs), { type: 'u64' }), // Use BigInt for u64
        ],
        creator
      );
    } catch (buildError: any) {
      // If simulation failed, extract and return diagnostics
      if (buildError.diagnostics) {
        return res.status(500).json({
          ok: false,
          error: 'Simulation failed',
          message: buildError.message,
          diagnostics: buildError.diagnostics
        });
      }
      throw buildError;
    }

    res.json({
      ok: true,
      xdr,
      network: env.NETWORK_PASSPHRASE,
      rpcUrl: env.SOROBAN_RPC_URL,
      decimals, // Include decimals so client knows what was used
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message || 'create failed' });
  }
});

/**
 * POST /api/envelope-mvp/refund
 * body: { id: string|number (u64), creator: G... }
 */
router.post('/refund', async (req, res) => {
  try {
    const { id, creator } = req.body ?? {};
    if (!isValidU64(id) || !isPubKey(creator)) {
      return res.status(400).json({ ok: false, error: 'Invalid id (u64) or creator' });
    }
    const idU64 = typeof id === 'string' ? Number(id) : id;

    const { envelopeId: envelopeContractId } = getContractIds();
    if (!envelopeContractId) {
      return res.status(500).json({ ok: false, error: 'Envelope contract not configured' });
    }

    // refund_after_expiry(creator: Address, id: u64)
    const xdr = await buildInvokeTx(
      envelopeContractId,
      'refund_after_expiry',
      [
        Address.fromString(creator).toScVal(),
        nativeToScVal(idU64, { type: 'u64' }),
      ],
      creator
    );

    res.json({
      ok: true,
      xdr,
      network: env.NETWORK_PASSPHRASE,
      rpcUrl: env.SOROBAN_RPC_URL,
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message || 'refund failed' });
  }
});

export default router;