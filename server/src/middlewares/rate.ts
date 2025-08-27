import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for envelope creation
 * Limit: 20 requests per minute per IP
 */
export const createLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many envelope creation requests, please try again later',
});

/**
 * Rate limiter for envelope opening
 * Limit: 60 requests per minute per IP
 */
export const openLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many open requests, please try again later',
});

/**
 * General API rate limiter
 * Limit: 100 requests per minute per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});