import type { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/log';

export function errorMiddleware(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = Number.isInteger(err?.status) ? err.status : 500;
  const code = err?.code ?? (status < 500 ? 'BAD_REQUEST' : 'INTERNAL');
  const message = status < 500 ? String(err?.message ?? 'Bad Request') : 'Something went wrong';
  if (status >= 500) logger.error({ err }, 'Unhandled error');
  res.status(status).json({ ok: false, error: { code, message } });
}