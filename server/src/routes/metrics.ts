import { Router } from 'express';
import client from 'prom-client';
import { prisma } from '../lib/prisma';

const router = Router();

// Create a Registry
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics for Outbox pattern
const outboxMetrics = {
  queued: new client.Gauge({
    name: 'outbox_queued_total',
    help: 'Total number of queued outbox messages',
    labelNames: ['type', 'status'],
  }),
  
  inFlight: new client.Gauge({
    name: 'outbox_in_flight_total',
    help: 'Total number of in-flight outbox messages',
    labelNames: ['type'],
  }),
  
  processed: new client.Counter({
    name: 'outbox_processed_total',
    help: 'Total number of processed outbox messages',
    labelNames: ['type', 'status'],
  }),
  
  failed: new client.Counter({
    name: 'outbox_failed_total',
    help: 'Total number of failed outbox messages',
    labelNames: ['type', 'error_type'],
  }),
  
  processingDuration: new client.Histogram({
    name: 'outbox_processing_duration_seconds',
    help: 'Duration of outbox message processing',
    labelNames: ['type'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  }),
  
  retryCount: new client.Histogram({
    name: 'outbox_retry_count',
    help: 'Number of retries for outbox messages',
    labelNames: ['type'],
    buckets: [0, 1, 2, 3, 4, 5, 10],
  }),
};

// Gift metrics
const giftMetrics = {
  created: new client.Counter({
    name: 'gifts_created_total',
    help: 'Total number of gifts created',
    labelNames: ['mode', 'theme'],
  }),
  
  claimed: new client.Counter({
    name: 'gifts_claimed_total',
    help: 'Total number of gifts claimed',
    labelNames: ['mode'],
  }),
  
  expired: new client.Counter({
    name: 'gifts_expired_total',
    help: 'Total number of expired gifts',
    labelNames: ['mode'],
  }),
  
  value: new client.Histogram({
    name: 'gift_value_usd',
    help: 'Gift values in USD',
    labelNames: ['mode'],
    buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
  }),
  
  claimDuration: new client.Histogram({
    name: 'gift_claim_duration_seconds',
    help: 'Time between gift creation and claim',
    labelNames: ['mode'],
    buckets: [60, 300, 900, 3600, 86400, 604800], // 1min, 5min, 15min, 1hr, 1day, 1week
  }),
};

// API metrics
const apiMetrics = {
  requestDuration: new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2.5, 5, 10],
  }),
  
  requestsTotal: new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
  }),
  
  activeConnections: new client.Gauge({
    name: 'http_active_connections',
    help: 'Number of active HTTP connections',
  }),
};

// Wallet metrics
const walletMetrics = {
  created: new client.Counter({
    name: 'wallets_created_total',
    help: 'Total number of wallets created',
    labelNames: ['type'],
  }),
  
  balance: new client.Gauge({
    name: 'wallet_balance_xlm',
    help: 'Wallet balances in XLM',
    labelNames: ['wallet_type', 'wallet_id'],
  }),
  
  transactions: new client.Counter({
    name: 'wallet_transactions_total',
    help: 'Total number of wallet transactions',
    labelNames: ['type', 'status'],
  }),
};

// Register all metrics
Object.values(outboxMetrics).forEach(metric => register.registerMetric(metric));
Object.values(giftMetrics).forEach(metric => register.registerMetric(metric));
Object.values(apiMetrics).forEach(metric => register.registerMetric(metric));
Object.values(walletMetrics).forEach(metric => register.registerMetric(metric));

// Update metrics from database
async function updateOutboxMetrics() {
  try {
    // Get outbox statistics
    const stats = await prisma.outbox.groupBy({
      by: ['type', 'status'],
      _count: true,
    });

    // Reset gauges
    outboxMetrics.queued.reset();
    outboxMetrics.inFlight.reset();

    // Update gauges
    stats.forEach(stat => {
      if (stat.status === 'PENDING') {
        outboxMetrics.queued.set(
          { type: stat.type, status: stat.status },
          stat._count
        );
      } else if (stat.status === 'PROCESSING') {
        outboxMetrics.inFlight.set(
          { type: stat.type },
          stat._count
        );
      }
    });

    // Get retry statistics
    const retryStats = await prisma.outbox.aggregate({
      _avg: { retry_count: true },
      _max: { retry_count: true },
    });

    if (retryStats._avg.retry_count) {
      outboxMetrics.retryCount.observe(
        { type: 'all' },
        retryStats._avg.retry_count
      );
    }

    // Get failed message count
    const failedCount = await prisma.outbox.count({
      where: { status: 'FAILED' },
    });

    if (failedCount > 0) {
      outboxMetrics.failed.inc({ type: 'all', error_type: 'permanent' }, failedCount);
    }

  } catch (error) {
    console.error('Error updating outbox metrics:', error);
  }
}

// Update gift metrics
async function updateGiftMetrics() {
  try {
    // Get envelope statistics
    const envelopeStats = await prisma.envelope.groupBy({
      by: ['status', 'metadata'],
      _count: true,
      _sum: { amount_usd: true },
    });

    // Process envelope stats
    envelopeStats.forEach(stat => {
      const metadata = stat.metadata as any;
      const mode = metadata?.mode || 'SINGLE';
      const theme = metadata?.theme || 'RED';

      if (stat.status === 'CLAIMED') {
        giftMetrics.claimed.inc({ mode }, stat._count);
        if (stat._sum.amount_usd) {
          giftMetrics.value.observe({ mode }, stat._sum.amount_usd);
        }
      } else if (stat.status === 'EXPIRED') {
        giftMetrics.expired.inc({ mode }, stat._count);
      }
    });

    // Get claim duration statistics
    const claimedEnvelopes = await prisma.envelope.findMany({
      where: { 
        status: 'CLAIMED',
        claimed_at: { not: null },
      },
      select: {
        created_at: true,
        claimed_at: true,
        metadata: true,
      },
    });

    claimedEnvelopes.forEach(envelope => {
      if (envelope.claimed_at) {
        const duration = 
          (envelope.claimed_at.getTime() - envelope.created_at.getTime()) / 1000;
        const metadata = envelope.metadata as any;
        const mode = metadata?.mode || 'SINGLE';
        giftMetrics.claimDuration.observe({ mode }, duration);
      }
    });

  } catch (error) {
    console.error('Error updating gift metrics:', error);
  }
}

// Update wallet metrics
async function updateWalletMetrics() {
  try {
    const walletCount = await prisma.wallet.count();
    walletMetrics.created.inc({ type: 'custodial' }, walletCount);

  } catch (error) {
    console.error('Error updating wallet metrics:', error);
  }
}

// Middleware to track API metrics
export function metricsMiddleware(req: any, res: any, next: any) {
  const start = Date.now();
  
  // Track active connections
  apiMetrics.activeConnections.inc();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const labels = {
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode.toString(),
    };

    apiMetrics.requestDuration.observe(labels, duration);
    apiMetrics.requestsTotal.inc(labels);
    apiMetrics.activeConnections.dec();
  });

  next();
}

import { rateLimitMetrics } from '../middleware/rate-limit';

// Metrics endpoint
router.get('/metrics', rateLimitMetrics, async (req, res) => {
  try {
    // Update metrics from database
    await Promise.all([
      updateOutboxMetrics(),
      updateGiftMetrics(),
      updateWalletMetrics(),
    ]);

    // Set response headers
    res.set('Content-Type', register.contentType);
    
    // Return metrics
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    console.error('Error generating metrics:', error);
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
});

// Health check endpoint (for Prometheus scraping)
router.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Export metrics for use in other modules
export const metrics = {
  outbox: outboxMetrics,
  gift: giftMetrics,
  api: apiMetrics,
  wallet: walletMetrics,
};

export default router;