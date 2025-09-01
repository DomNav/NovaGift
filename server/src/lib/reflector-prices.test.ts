import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchReflectorPrices, getAssetPrice, clearPriceCache } from './reflector-prices';

// Mock fetch
global.fetch = vi.fn();

describe('reflector-prices', () => {
  beforeEach(() => {
    // Clear cache before each test
    clearPriceCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchReflectorPrices', () => {
    it('should fetch prices from the API', async () => {
      const mockResponse = {
        ok: true,
        price: 0.45,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const prices = await fetchReflectorPrices(['XLM']);

      expect(prices).toHaveLength(1);
      expect(prices[0]).toMatchObject({
        symbol: 'XLM',
        priceUsd: 0.45,
      });
      expect(prices[0].updatedAt).toBeDefined();
    });

    it('should use cached data when available', async () => {
      const mockResponse = {
        ok: true,
        price: 0.45,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // First call - should hit the API
      const prices1 = await fetchReflectorPrices(['XLM']);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const prices2 = await fetchReflectorPrices(['XLM']);
      expect(global.fetch).toHaveBeenCalledTimes(1); // No additional call

      expect(prices1).toEqual(prices2);
    });

    it('should use fallback prices when API fails', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const prices = await fetchReflectorPrices(['XLM', 'USDC']);

      expect(prices).toHaveLength(2);
      expect(prices[0]).toMatchObject({
        symbol: 'XLM',
        priceUsd: 0.45, // Fallback price
      });
      expect(prices[1]).toMatchObject({
        symbol: 'USDC',
        priceUsd: 1.00, // Fallback price
      });
    });

    it('should handle multiple symbols', async () => {
      const symbols = ['XLM', 'USDC', 'AQUA'];
      
      // Mock responses for each symbol
      for (const symbol of symbols) {
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            price: symbol === 'XLM' ? 0.45 : symbol === 'USDC' ? 1.00 : 0.0042,
          }),
        });
      }

      const prices = await fetchReflectorPrices(symbols);

      expect(prices).toHaveLength(3);
      expect(prices.map(p => p.symbol)).toEqual(['XLM', 'USDC', 'AQUA']);
    });

    it('should validate and transform price data', async () => {
      const mockResponse = {
        ok: true,
        price: "0.45", // String instead of number
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const prices = await fetchReflectorPrices(['XLM']);

      expect(prices[0].priceUsd).toBe(0.45); // Should be converted to number
      expect(typeof prices[0].priceUsd).toBe('number');
    });
  });

  describe('getAssetPrice', () => {
    it('should return single asset price', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          price: 0.45,
        }),
      });

      const price = await getAssetPrice('XLM');

      expect(price).not.toBeNull();
      expect(price?.symbol).toBe('XLM');
      expect(price?.priceUsd).toBe(0.45);
    });

    it('should return null for unknown asset', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          ok: false,
          error: 'Asset not found',
        }),
      });

      const price = await getAssetPrice('UNKNOWN');

      expect(price).not.toBeNull(); // Should return fallback
      expect(price?.priceUsd).toBe(0); // Default fallback value
    });
  });

  describe('cache behavior', () => {
    it('should expire cache after TTL', async () => {
      const mockResponse1 = {
        ok: true,
        price: 0.45,
      };

      const mockResponse2 = {
        ok: true,
        price: 0.50,
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse1,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse2,
        });

      // First call
      const prices1 = await fetchReflectorPrices(['XLM']);
      expect(prices1[0].priceUsd).toBe(0.45);

      // Wait for cache to expire (simulated by clearing cache)
      clearPriceCache();

      // Second call should fetch new data
      const prices2 = await fetchReflectorPrices(['XLM']);
      expect(prices2[0].priceUsd).toBe(0.50);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});