import express from 'express';
import cors from 'cors';
import { config, validateConfig } from './config';
import { httpLogger } from './lib/log';
import { errorMiddleware } from './middleware/error';
import envelopeRoutes from './routes/envelope';
import stellarRoutes from './routes/stellar';
import profileRoutes from './routes/profile';
import authRoutes from './routes/auth';
import kaleRoutes from './routes/kale-gating';
import kalePublicRoutes from './routes/kale-public';
import walletRoutes from './routes/wallet';
import walletXlmRoutes from './routes/wallet.xlm';
import ratesRoutes from './routes/rates';
import pricesRoutes from './routes/prices';
import healthRoutes from './routes/health';
import notificationRoutes from './routes/notifications';
import passkeyRoutes from './routes/passkey';
import { apiLimiter } from './middlewares/rate';
import { requireConsent, checkConsent } from './middlewares/consent';

// Validate configuration
try {
  validateConfig();
} catch (error) {
  console.error('Configuration error:', error);
  if (config.nodeEnv === 'production') {
    process.exit(1);
  }
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(httpLogger); // request logging
app.use(apiLimiter); // Global rate limiting

// Routes
app.use('/auth', authRoutes);
app.use('/api/kale', kaleRoutes);
app.use('/api/kale-public', kalePublicRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/wallet', walletXlmRoutes);
app.use('/api/rates', ratesRoutes);
app.use('/api/prices', pricesRoutes);
app.use('/api/envelope', envelopeRoutes);
app.use('/api/stellar', stellarRoutes);
app.use('/api/profile', profileRoutes); // Profile routes include consent middleware
app.use('/api/notifications', notificationRoutes);
app.use('/api/passkey', passkeyRoutes);

// Health check
app.use('/api/health', healthRoutes);

// Error handler (must be last)
app.use(errorMiddleware);

// Start server
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(config.port, () => {
    console.log(`NovaGift server running on port ${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Network: ${config.nodeEnv === 'production' ? 'mainnet' : 'testnet'}`);
    console.log(`Fee sponsorship: ${config.enableFeeSponsorship ? 'enabled' : 'disabled'}`);
    console.log(`Reflector: ${config.enableReflector ? 'enabled' : 'disabled'}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}


export default app;