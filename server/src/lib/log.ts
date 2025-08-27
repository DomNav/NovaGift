import pino from 'pino';

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: {
    paths: ['req.headers.authorization','req.headers["x-api-key"]','req.headers.link','body.xdr'],
    censor: '[REDACTED]',
  },
});

import pinoHttp from 'pino-http';
export const httpLogger = pinoHttp({ logger });