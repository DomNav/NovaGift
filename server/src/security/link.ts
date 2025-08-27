import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const LINK_SIGNING_KEY = process.env.LINK_SIGNING_KEY || 'dev-secret-key';
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5173';

export interface OpenLinkPayload {
  envId: string;
  jti: string;
  iat: number;
  exp: number;
}

/**
 * Create a signed open link for an envelope
 */
export function makeOpenLink(envId: string): {
  url: string;
  jti: string;
  expiresAt: number;
} {
  const jti = crypto.randomBytes(16).toString('hex');
  const expiresIn = 30 * 60; // 30 minutes in seconds
  
  const token = jwt.sign(
    { envId, jti },
    LINK_SIGNING_KEY,
    { 
      expiresIn,
      jwtid: jti,
    }
  );
  
  const url = `${APP_BASE_URL}/open/${envId}?t=${token}`;
  const expiresAt = Date.now() + (expiresIn * 1000);
  
  return { url, jti, expiresAt };
}

/**
 * Verify and decode an open token
 */
export function verifyOpenToken(token: string): OpenLinkPayload {
  try {
    const decoded = jwt.verify(token, LINK_SIGNING_KEY) as any;
    return {
      envId: decoded.envId,
      jti: decoded.jti || decoded.jwtid,
      iat: decoded.iat,
      exp: decoded.exp,
    };
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Generate a secure preimage
 */
export function generatePreimage(): string {
  return crypto.randomBytes(32).toString('hex');
}