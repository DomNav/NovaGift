import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { submitTransaction } from '../lib/rpc';
import { config } from '../config';

const router = Router();

// Validation schemas
const SubmitTransactionSchema = z.object({
  signedXDR: z.string(),
  networkPassphrase: z.string().optional(),
});

/**
 * POST /api/stellar/submit
 * Submit a signed transaction to the Stellar network
 */
router.post('/submit', async (req: Request, res: Response) => {
  try {
    // Validate input
    const input = SubmitTransactionSchema.parse(req.body);
    
    // Get RPC URL from config or use testnet default
    const rpcUrl = config.sorobanRpcUrl || 'https://soroban-testnet.stellar.org';
    
    // Submit the transaction
    const result = await submitTransaction(input.signedXDR, rpcUrl);
    
    if (!result.success) {
      return res.status(400).json({ 
        error: result.error || 'Failed to submit transaction' 
      });
    }
    
    return res.json({
      success: true,
      txId: result.txId
    });
  } catch (error) {
    console.error('Submit transaction error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: error.errors 
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to submit transaction' 
    });
  }
});

export default router;