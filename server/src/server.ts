import express from 'express';
import cors from 'cors';
import { config, validateConfig } from './config';
import { httpLogger } from './lib/log';
import { errorMiddleware } from './middleware/error';
import envelopeRoutes from './routes/envelope';
import stellarRoutes from './routes/stellar';
import profileRoutes from './routes/profile';
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
app.use('/api/envelope', envelopeRoutes);
app.use('/api/stellar', stellarRoutes);
app.use('/api/profile', profileRoutes); // Profile routes include consent middleware

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    env: config.nodeEnv === 'production' ? 'mainnet' : 'testnet',
    timestamp: new Date().toISOString(),
  });
});

// Error handler (must be last)
app.use(errorMiddleware);

// Start server
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

export default app;