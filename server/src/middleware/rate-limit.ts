import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';

// Rate limiter configuration
interface RateLimitConfig {
  points: number;      // Number of requests
  duration: number;    // Per duration in seconds
  blockDuration?: number; // Block duration in seconds when limit exceeded
  keyPrefix?: string;  // Prefix for rate limit keys
}

// Create rate limiter instance based on environment
function createRateLimiter(config: RateLimitConfig) {
  // Use Redis in production for distributed rate limiting
  if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
    const redis = new Redis(process.env.REDIS_URL);
    
    return new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: config.keyPrefix || 'rl',
      points: config.points,
      duration: config.duration,
      blockDuration: config.blockDuration || 60, // Block for 1 minute by default
    });
  }
  
  // Use in-memory rate limiter for development/testing
  return new RateLimiterMemory({
    keyPrefix: config.keyPrefix || 'rl',
    points: config.points,
    duration: config.duration,
    blockDuration: config.blockDuration || 60,
  });
}

// Rate limiters for different endpoints
const rateLimiters = {
  // Gift endpoint: 100 requests per minute per user/IP
  gift: createRateLimiter({
    points: 100,
    duration: 60,
    blockDuration: 60,
    keyPrefix: 'gift',
  }),
  
  // Strict limit for gift creation: 20 per hour per user
  giftCreate: createRateLimiter({
    points: 20,
    duration: 3600,
    blockDuration: 300, // Block for 5 minutes
    keyPrefix: 'gift_create',
  }),
  
  // Auth endpoints: 5 attempts per minute
  auth: createRateLimiter({
    points: 5,
    duration: 60,
    blockDuration: 300, // Block for 5 minutes
    keyPrefix: 'auth',
  }),
  
  // General API: 1000 requests per minute
  api: createRateLimiter({
    points: 1000,
    duration: 60,
    blockDuration: 60,
    keyPrefix: 'api',
  }),
  
  // Metrics endpoint: 10 requests per minute (prevent scraping abuse)
  metrics: createRateLimiter({
    points: 10,
    duration: 60,
    blockDuration: 60,
    keyPrefix: 'metrics',
  }),
};

// Get identifier for rate limiting (user ID or IP)
function getRateLimitKey(req: Request): string {
  // Prefer user ID if authenticated
  if ((req as any).user?.id) {
    return `user_${(req as any).user.id}`;
  }
  
  // Fall back to IP address
  const ip = req.headers['x-forwarded-for'] || 
             req.headers['x-real-ip'] || 
             req.socket.remoteAddress || 
             'unknown';
  
  return `ip_${Array.isArray(ip) ? ip[0] : ip}`;
}

// Rate limiting middleware factory
export function createRateLimitMiddleware(
  limiterName: keyof typeof rateLimiters,
  customMessage?: string
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const limiter = rateLimiters[limiterName];
    const key = getRateLimitKey(req);
    
    try {
      await limiter.consume(key);
      
      // Add rate limit headers
      const rateLimitInfo = await limiter.get(key);
      if (rateLimitInfo) {
        res.setHeader('X-RateLimit-Limit', limiter.points);
        res.setHeader('X-RateLimit-Remaining', rateLimitInfo.remainingPoints);
        res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimitInfo.msBeforeNext).toISOString());
      }
      
      next();
    } catch (rejRes: any) {
      // Rate limit exceeded
      res.setHeader('X-RateLimit-Limit', limiter.points);
      res.setHeader('X-RateLimit-Remaining', rejRes.remainingPoints || 0);
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rejRes.msBeforeNext).toISOString());
      res.setHeader('Retry-After', Math.round(rejRes.msBeforeNext / 1000) || 60);
      
      res.status(429).json({
        ok: false,
        error: customMessage || 'Too many requests. Please try again later.',
        retryAfter: Math.round(rejRes.msBeforeNext / 1000) || 60,
      });
    }
  };
}

// Pre-configured middleware for common endpoints
export const rateLimitGift = createRateLimitMiddleware('gift', 
  'Gift endpoint rate limit exceeded. Maximum 100 requests per minute.');

export const rateLimitGiftCreate = createRateLimitMiddleware('giftCreate',
  'Gift creation rate limit exceeded. Maximum 20 gifts per hour.');

export const rateLimitAuth = createRateLimitMiddleware('auth',
  'Authentication rate limit exceeded. Maximum 5 attempts per minute.');

export const rateLimitApi = createRateLimitMiddleware('api',
  'API rate limit exceeded. Maximum 1000 requests per minute.');

export const rateLimitMetrics = createRateLimitMiddleware('metrics',
  'Metrics endpoint rate limit exceeded. Maximum 10 requests per minute.');

// Middleware to apply different rate limits based on request method
export function rateLimitGiftByMethod(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'POST') {
    // Stricter limit for creation
    rateLimitGiftCreate(req, res, next);
  } else {
    // Standard limit for reading
    rateLimitGift(req, res, next);
  }
}

// IP-based rate limiter for unauthenticated requests
export function createIpRateLimiter(config: RateLimitConfig) {
  const limiter = createRateLimiter(config);
  
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.headers['x-forwarded-for'] || 
               req.headers['x-real-ip'] || 
               req.socket.remoteAddress || 
               'unknown';
    
    const key = `ip_${Array.isArray(ip) ? ip[0] : ip}`;
    
    try {
      await limiter.consume(key);
      next();
    } catch (rejRes: any) {
      res.status(429).json({
        ok: false,
        error: 'Too many requests from this IP address',
        retryAfter: Math.round(rejRes.msBeforeNext / 1000) || 60,
      });
    }
  };
}

// Reset rate limit for a specific user (admin function)
export async function resetRateLimit(
  limiterName: keyof typeof rateLimiters,
  userId: string
) {
  const limiter = rateLimiters[limiterName];
  const key = `user_${userId}`;
  
  try {
    await limiter.delete(key);
    return { ok: true, message: `Rate limit reset for user ${userId}` };
  } catch (error) {
    return { ok: false, error: 'Failed to reset rate limit' };
  }
}

// Get current rate limit status for a user
export async function getRateLimitStatus(
  limiterName: keyof typeof rateLimiters,
  userId: string
) {
  const limiter = rateLimiters[limiterName];
  const key = `user_${userId}`;
  
  try {
    const rateLimitInfo = await limiter.get(key);
    
    if (!rateLimitInfo) {
      return {
        limit: limiter.points,
        remaining: limiter.points,
        reset: new Date(Date.now() + limiter.duration * 1000),
      };
    }
    
    return {
      limit: limiter.points,
      remaining: rateLimitInfo.remainingPoints,
      reset: new Date(Date.now() + rateLimitInfo.msBeforeNext),
    };
  } catch (error) {
    return null;
  }
}