import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import pricesRouter from './prices';
import * as reflectorPrices from '../lib/reflector-prices';

// Mock the reflector-prices module
vi.mock('../lib/reflector-prices', () => ({
  fetchReflectorPrices: vi.fn(),
}));

describe('Prices API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/prices', pricesRouter);
    vi.clearAllMocks();
  });

  describe('GET /api/prices', () => {
    it('should return default symbols when no symbols provided', async () => {
      const mockPrices = [
        { symbol: 'XLM', priceUsd: 0.45, updatedAt: '2024-01-01T00:00:00Z' },
        { symbol: 'USDC', priceUsd: 1.00, updatedAt: '2024-01-01T00:00:00Z' },
      ];

      vi.mocked(reflectorPrices.fetchReflectorPrices).mockResolvedValue(mockPrices);

      const response = await request(app)
        .get('/api/prices')
        .expect(200);

      expect(response.body).toEqual(mockPrices);
      expect(reflectorPrices.fetchReflectorPrices).toHaveBeenCalledWith(
        expect.arrayContaining(['XLM', 'USDC', 'AQUA', 'SHX'])
      );
    });

    it('should return specified symbols when provided', async () => {
      const mockPrices = [
        { symbol: 'XLM', priceUsd: 0.45, updatedAt: '2024-01-01T00:00:00Z' },
        { symbol: 'USDC', priceUsd: 1.00, updatedAt: '2024-01-01T00:00:00Z' },
      ];

      vi.mocked(reflectorPrices.fetchReflectorPrices).mockResolvedValue(mockPrices);

      const response = await request(app)
        .get('/api/prices?symbols=XLM,USDC')
        .expect(200);

      expect(response.body).toEqual(mockPrices);
      expect(reflectorPrices.fetchReflectorPrices).toHaveBeenCalledWith(['XLM', 'USDC']);
    });

    it('should handle empty symbols gracefully', async () => {
      const mockPrices = [];
      vi.mocked(reflectorPrices.fetchReflectorPrices).mockResolvedValue(mockPrices);

      const response = await request(app)
        .get('/api/prices?symbols=')
        .expect(200);

      // Should use default symbols when empty string provided
      expect(reflectorPrices.fetchReflectorPrices).toHaveBeenCalledWith(
        expect.arrayContaining(['XLM', 'USDC'])
      );
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(reflectorPrices.fetchReflectorPrices).mockRejectedValue(
        new Error('API Error')
      );

      const response = await request(app)
        .get('/api/prices')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should normalize symbol case', async () => {
      const mockPrices = [
        { symbol: 'XLM', priceUsd: 0.45, updatedAt: '2024-01-01T00:00:00Z' },
      ];

      vi.mocked(reflectorPrices.fetchReflectorPrices).mockResolvedValue(mockPrices);

      await request(app)
        .get('/api/prices?symbols=xlm,Usdc,AqUa')
        .expect(200);

      expect(reflectorPrices.fetchReflectorPrices).toHaveBeenCalledWith(['XLM', 'USDC', 'AQUA']);
    });

    it('should handle whitespace in symbols', async () => {
      const mockPrices = [
        { symbol: 'XLM', priceUsd: 0.45, updatedAt: '2024-01-01T00:00:00Z' },
      ];

      vi.mocked(reflectorPrices.fetchReflectorPrices).mockResolvedValue(mockPrices);

      await request(app)
        .get('/api/prices?symbols=XLM , USDC , AQUA')
        .expect(200);

      expect(reflectorPrices.fetchReflectorPrices).toHaveBeenCalledWith(['XLM', 'USDC', 'AQUA']);
    });
  });

  describe('GET /api/prices/single/:symbol', () => {
    it('should return price for single symbol', async () => {
      const mockPrice = [
        { symbol: 'XLM', priceUsd: 0.45, updatedAt: '2024-01-01T00:00:00Z' }
      ];

      vi.mocked(reflectorPrices.fetchReflectorPrices).mockResolvedValue(mockPrice);

      const response = await request(app)
        .get('/api/prices/single/XLM')
        .expect(200);

      expect(response.body).toEqual(mockPrice[0]);
      expect(reflectorPrices.fetchReflectorPrices).toHaveBeenCalledWith(['XLM']);
    });

    it('should return 404 for unavailable symbol', async () => {
      vi.mocked(reflectorPrices.fetchReflectorPrices).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/prices/single/UNKNOWN')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Price not available for UNKNOWN');
    });

    it('should normalize symbol case', async () => {
      const mockPrice = [
        { symbol: 'XLM', priceUsd: 0.45, updatedAt: '2024-01-01T00:00:00Z' }
      ];

      vi.mocked(reflectorPrices.fetchReflectorPrices).mockResolvedValue(mockPrice);

      await request(app)
        .get('/api/prices/single/xlm')
        .expect(200);

      expect(reflectorPrices.fetchReflectorPrices).toHaveBeenCalledWith(['XLM']);
    });
  });

  describe('GET /api/prices/health', () => {
    it('should return healthy status when prices available', async () => {
      const mockPrice = [
        { symbol: 'XLM', priceUsd: 0.45, updatedAt: '2024-01-01T00:00:00Z' }
      ];

      vi.mocked(reflectorPrices.fetchReflectorPrices).mockResolvedValue(mockPrice);

      const response = await request(app)
        .get('/api/prices/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        message: 'Price service operational',
        samplePrice: mockPrice[0],
      });
    });

    it('should return degraded status when using fallbacks', async () => {
      const mockPrice = [
        { symbol: 'XLM', priceUsd: 0, updatedAt: '2024-01-01T00:00:00Z' }
      ];

      vi.mocked(reflectorPrices.fetchReflectorPrices).mockResolvedValue(mockPrice);

      const response = await request(app)
        .get('/api/prices/health')
        .expect(503);

      expect(response.body).toMatchObject({
        status: 'degraded',
        message: 'Price service using fallbacks',
      });
    });

    it('should return unhealthy status on error', async () => {
      vi.mocked(reflectorPrices.fetchReflectorPrices).mockRejectedValue(
        new Error('Service unavailable')
      );

      const response = await request(app)
        .get('/api/prices/health')
        .expect(503);

      expect(response.body).toMatchObject({
        status: 'unhealthy',
        message: 'Price service error',
        error: 'Service unavailable',
      });
    });
  });
});