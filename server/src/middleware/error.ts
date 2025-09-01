import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/log';

export function errorMiddleware(err: any, _req: Request, res: Response, _next: NextFunction) {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: err.issues
      }
    });
  }

  const status = Number.isInteger(err?.status) ? err.status : 500;
  const code = err?.code ?? (status < 500 ? 'BAD_REQUEST' : 'INTERNAL');
  const message = status < 500 ? String(err?.message ?? 'Bad Request') : 'Something went wrong';
  if (status >= 500) logger.error({ err }, 'Unhandled error');
  res.status(status).json({ ok: false, error: { code, message } });
}