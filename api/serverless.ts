import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import { config, validateConfig } from '../server/src/config';
import envelopeRoutes from '../server/src/routes/envelope';
import stellarRoutes from '../server/src/routes/stellar';
import profileRoutes from '../server/src/routes/profile';
import { apiLimiter } from '../server/src/middlewares/rate';

// Validate configuration
try {
  validateConfig();
} catch (error) {
  console.error('Configuration error:', error);
}

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(apiLimiter);

// Routes - mounted without /api prefix since Vercel handles that
app.use('/envelope', envelopeRoutes);
app.use('/stellar', stellarRoutes);
app.use('/profile', profileRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    env: config.nodeEnv === 'production' ? 'mainnet' : 'testnet',
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? err.message : undefined,
  });
});

// Export handler for Vercel
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle the request through Express
  await new Promise<void>((resolve, reject) => {
    app(req as any, res as any, (err: any) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}