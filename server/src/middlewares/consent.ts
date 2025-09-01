import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/client';

/**
 * PIPEDA-lite consent middleware
 * Enforces consent requirements for routes accessing personal data (Profile)
 * 
 * Usage: Apply to routes that read/write Profile or personal fields
 * Requires: x-wallet header to identify the user
 * Returns: 403 with code CONSENT_REQUIRED if consent not given
 */
export const requireConsent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract wallet address from header
    const wallet = req.headers['x-wallet'] as string;
    
    if (!wallet) {
      // No wallet identifier, cannot check consent
      return next();
    }
    
    // Look up profile by wallet
    const profile = await prisma.profile.findUnique({
      where: { wallet },
    });
    
    if (profile) {
      // Attach profile to request for downstream use
      req.profile = profile;
      
      // Check consent status
      if (!profile.consentGiven) {
        res.status(403).json({
          error: 'Consent required',
          code: 'CONSENT_REQUIRED',
          message: 'User consent is required to access or modify personal data',
        });
        return;
      }
    }
    
    // Consent given or no profile exists yet
    next();
  } catch (error) {
    console.error('Consent middleware error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'CONSENT_CHECK_FAILED',
    });
  }
};

/**
 * Soft consent check - logs but doesn't block
 * Use for analytics or non-critical personal data access
 */
export const checkConsent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const wallet = req.headers['x-wallet'] as string;
    
    if (wallet) {
      const profile = await prisma.profile.findUnique({
        where: { wallet },
      });
      
      if (profile) {
        req.profile = profile;
        
        if (!profile.consentGiven) {
          console.warn(`Access without consent: wallet=${wallet}, path=${req.path}`);
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Consent check error:', error);
    // Continue without blocking
    next();
  }
};