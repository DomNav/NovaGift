import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getSwapQuote, buildSwapTransaction, buildChangeTrust, SwapError } from '../lib/swap';
import { SUPPORTED_ASSETS } from '../lib/assets';

const router = Router();

const QuoteSchema = z.object({
  side: z.literal('exactOut'),
  from: z.enum(SUPPORTED_ASSETS as any),
  to: z.literal('USDC'),
  amount: z.string().regex(/^\d+(\.\d+)?$/, 'Invalid amount format'),
  venue: z.enum(['best', 'dex', 'amm']),
});

const BuildSchema = z.object({
  from: z.enum(SUPPORTED_ASSETS as any),
  to: z.literal('USDC'),
  amount: z.string().regex(/^\d+(\.\d+)?$/, 'Invalid amount format'),
  maxSlippageBps: z.number().min(0).max(10000),
  payerPublicKey: z.string().regex(/^G[A-Z0-9]{55}$/, 'Invalid Stellar public key'),
  memo: z.string().max(28).optional(),
});

const ChangeTrustSchema = z.object({
  asset: z.enum(SUPPORTED_ASSETS as any),
  account: z.string().regex(/^G[A-Z0-9]{55}$/, 'Invalid Stellar public key'),
});

router.post('/quote', async (req: Request, res: Response) => {
  try {
    const body = QuoteSchema.parse(req.body);
    
    const quote = await getSwapQuote(
      body.from,
      body.to,
      body.amount,
      body.venue
    );
    
    res.json({
      venue: quote.venue,
      inAmount: quote.inAmount,
      outAmount: quote.outAmount,
      price: quote.price,
      feePct: quote.feePct,
      oracleMaxNoSlippage: quote.oracleMaxNoSlippage,
    });
  } catch (error) {
    if (error instanceof SwapError) {
      if (error.code === 'NO_ROUTE') {
        return res.status(409).json({ code: 'NO_ROUTE' });
      }
      
      if (error.code === 'ORACLE_UNAVAILABLE') {
        return res.status(503).json({ code: 'ORACLE_UNAVAILABLE' });
      }
    }
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        details: error.issues,
      });
    }
    
    console.error('Quote error:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to generate quote',
    });
  }
});

router.post('/build', async (req: Request, res: Response) => {
  try {
    const body = BuildSchema.parse(req.body);
    
    const result = await buildSwapTransaction(
      body.from,
      body.to,
      body.amount,
      body.maxSlippageBps,
      body.payerPublicKey,
      body.memo
    );
    
    res.json({ xdr: result.xdr });
  } catch (error) {
    if (error instanceof SwapError) {
      if (error.code === 'SLIPPAGE') {
        return res.status(409).json({
          code: 'SLIPPAGE',
          details: error.details,
        });
      }
    }
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        details: error.issues,
      });
    }
    
    console.error('Build error:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to build transaction',
    });
  }
});

router.post('/change-trust', async (req: Request, res: Response) => {
  try {
    const body = ChangeTrustSchema.parse(req.body);
    
    const result = buildChangeTrust(body.asset, body.account);
    
    res.json({ xdr: result.xdr });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        details: error.issues,
      });
    }
    
    console.error('ChangeTrust error:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to build change trust transaction',
    });
  }
});

export default router;