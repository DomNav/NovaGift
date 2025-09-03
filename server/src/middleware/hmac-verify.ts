import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

interface HMACConfig {
  secret: string;
  header?: string;
  algorithm?: string;
  encoding?: 'hex' | 'base64';
  tolerance?: number; // Timestamp tolerance in seconds
}

/**
 * Enhanced HMAC signature verification middleware
 * Provides defense in depth for webhook endpoints
 */
export function createHMACVerificationMiddleware(config: HMACConfig) {
  const {
    secret,
    header = 'x-webhook-signature',
    algorithm = 'sha256',
    encoding = 'hex',
    tolerance = 300, // 5 minutes default
  } = config;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get signature from header
      const signatureHeader = req.headers[header.toLowerCase()] as string;
      
      if (!signatureHeader) {
        return res.status(401).json({
          error: 'Missing signature header',
          header: header,
        });
      }

      // Parse signature header (format: "t=timestamp,v1=signature")
      const elements = signatureHeader.split(',');
      let timestamp: number | null = null;
      let signature: string | null = null;

      for (const element of elements) {
        const [key, value] = element.split('=');
        if (key === 't') {
          timestamp = parseInt(value, 10);
        } else if (key === 'v1') {
          signature = value;
        }
      }

      // Fallback for simple signature format (just the signature)
      if (!timestamp && !signature && signatureHeader.length > 0) {
        signature = signatureHeader;
        timestamp = Math.floor(Date.now() / 1000);
      }

      if (!signature) {
        return res.status(401).json({
          error: 'Invalid signature format',
        });
      }

      // Verify timestamp if provided (prevent replay attacks)
      if (timestamp) {
        const currentTime = Math.floor(Date.now() / 1000);
        const timeDiff = Math.abs(currentTime - timestamp);
        
        if (timeDiff > tolerance) {
          return res.status(401).json({
            error: 'Request timestamp too old',
            maxAge: tolerance,
            actualAge: timeDiff,
          });
        }
      }

      // Get raw body for signature verification
      // Note: This requires the raw body to be available
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      
      // Create signed payload
      const signedPayload = timestamp 
        ? `${timestamp}.${rawBody}`
        : rawBody;

      // Calculate expected signature
      const expectedSignature = crypto
        .createHmac(algorithm, secret)
        .update(signedPayload)
        .digest(encoding);

      // Timing-safe comparison
      const signatureBuffer = Buffer.from(signature, encoding);
      const expectedBuffer = Buffer.from(expectedSignature, encoding);

      if (signatureBuffer.length !== expectedBuffer.length) {
        return res.status(401).json({
          error: 'Invalid signature',
        });
      }

      const isValid = crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

      if (!isValid) {
        // Log failed attempts for monitoring
        console.warn(`[HMAC] Signature verification failed from ${req.ip}`, {
          path: req.path,
          timestamp,
          providedSignature: signature.substring(0, 8) + '...',
        });

        return res.status(401).json({
          error: 'Invalid signature',
        });
      }

      // Add verified timestamp to request for downstream use
      (req as any).webhookTimestamp = timestamp;
      (req as any).webhookVerified = true;

      next();
    } catch (error: any) {
      console.error('[HMAC] Verification error:', error);
      
      res.status(500).json({
        error: 'Signature verification failed',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  };
}

/**
 * Generate HMAC signature for outgoing webhooks
 */
export function generateHMACSignature(
  payload: string | Buffer,
  secret: string,
  options: {
    algorithm?: string;
    encoding?: 'hex' | 'base64';
    includeTimestamp?: boolean;
  } = {}
): string {
  const {
    algorithm = 'sha256',
    encoding = 'hex',
    includeTimestamp = true,
  } = options;

  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = includeTimestamp 
    ? `${timestamp}.${payload}`
    : payload.toString();

  const signature = crypto
    .createHmac(algorithm, secret)
    .update(signedPayload)
    .digest(encoding);

  return includeTimestamp 
    ? `t=${timestamp},v1=${signature}`
    : signature;
}

/**
 * Verify HMAC signature manually (for testing or one-off verification)
 */
export function verifyHMACSignature(
  payload: string | Buffer,
  signature: string,
  secret: string,
  options: {
    algorithm?: string;
    encoding?: 'hex' | 'base64';
    tolerance?: number;
  } = {}
): { valid: boolean; reason?: string } {
  const {
    algorithm = 'sha256',
    encoding = 'hex',
    tolerance = 300,
  } = options;

  try {
    // Parse signature
    const elements = signature.split(',');
    let timestamp: number | null = null;
    let sig: string | null = null;

    for (const element of elements) {
      const [key, value] = element.split('=');
      if (key === 't') {
        timestamp = parseInt(value, 10);
      } else if (key === 'v1') {
        sig = value;
      }
    }

    // Handle simple signature format
    if (!timestamp && !sig && signature.length > 0) {
      sig = signature;
    }

    if (!sig) {
      return { valid: false, reason: 'Invalid signature format' };
    }

    // Check timestamp
    if (timestamp) {
      const currentTime = Math.floor(Date.now() / 1000);
      const timeDiff = Math.abs(currentTime - timestamp);
      
      if (timeDiff > tolerance) {
        return { 
          valid: false, 
          reason: `Timestamp too old: ${timeDiff}s (max: ${tolerance}s)` 
        };
      }
    }

    // Calculate expected signature
    const signedPayload = timestamp 
      ? `${timestamp}.${payload}`
      : payload.toString();

    const expectedSignature = crypto
      .createHmac(algorithm, secret)
      .update(signedPayload)
      .digest(encoding);

    // Timing-safe comparison
    const sigBuffer = Buffer.from(sig, encoding);
    const expectedBuffer = Buffer.from(expectedSignature, encoding);

    if (sigBuffer.length !== expectedBuffer.length) {
      return { valid: false, reason: 'Signature length mismatch' };
    }

    const isValid = crypto.timingSafeEqual(sigBuffer, expectedBuffer);

    return isValid 
      ? { valid: true }
      : { valid: false, reason: 'Signature mismatch' };

  } catch (error: any) {
    return { 
      valid: false, 
      reason: `Verification error: ${error.message}` 
    };
  }
}

/**
 * Express middleware to capture raw body for HMAC verification
 */
export function captureRawBody(req: Request, res: Response, next: NextFunction) {
  const chunks: Buffer[] = [];
  
  req.on('data', (chunk: Buffer) => {
    chunks.push(chunk);
  });
  
  req.on('end', () => {
    const rawBody = Buffer.concat(chunks);
    (req as any).rawBody = rawBody.toString('utf8');
    next();
  });
}

// Pre-configured middleware for common webhooks
export const verifyEscrowWebhook = createHMACVerificationMiddleware({
  secret: process.env.ESCROW_WEBHOOK_SECRET || 'development-webhook-secret',
  header: 'x-webhook-signature',
  tolerance: 300,
});

export const verifyStripeWebhook = createHMACVerificationMiddleware({
  secret: process.env.STRIPE_WEBHOOK_SECRET || '',
  header: 'stripe-signature',
  tolerance: 300,
});

export const verifyGitHubWebhook = createHMACVerificationMiddleware({
  secret: process.env.GITHUB_WEBHOOK_SECRET || '',
  header: 'x-hub-signature-256',
  algorithm: 'sha256',
});

// Utility to test webhook endpoints
export async function testWebhookEndpoint(
  url: string,
  payload: any,
  secret: string
): Promise<{ status: number; body: any }> {
  const payloadString = JSON.stringify(payload);
  const signature = generateHMACSignature(payloadString, secret);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-signature': signature,
    },
    body: payloadString,
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}