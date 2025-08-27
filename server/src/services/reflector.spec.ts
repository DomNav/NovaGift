import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { quoteAndSwap } from './reflector';
import { config } from '../config';
import prisma from '../db/client';

vi.mock('../config', () => ({
  config: {
    enableReflector: true,
    reflectorApiUrl: 'https://api.reflector.testnet.example',
  },
}));

vi.mock('../db/client', () => ({
  default: {
    swapReceipt: {
      create: vi.fn(),
    },
  },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('quoteAndSwap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    config.enableReflector = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return direct route when ENABLE_REFLECTOR is false', async () => {
    config.enableReflector = false;

    const result = await quoteAndSwap({
      payAsset: 'USDC',
      amount: '100',
      toAsset: 'XLM',
      address: 'GDTEST123...',
    });

    expect(result).toEqual({
      route: 'direct',
      price: 100,
      txId: '',
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should successfully quote and swap when Reflector is enabled', async () => {
    const mockQuoteResponse = {
      route: {
        path: ['USDC', 'AQUA', 'XLM'],
        protocols: ['soroswap', 'phoenix'],
      },
      priceImpact: 0.005,
      estimatedOut: '495.50',
      estimatedPrice: 4.955,
    };

    const mockSwapResponse = {
      success: true,
      txId: 'abc123def456',
    };

    const mockSwapReceipt = {
      id: 'receipt-123',
      envelopeId: 'GDTEST123...',
      route: 'USDC -> AQUA -> XLM',
      price: 4.955,
      txId: 'abc123def456',
      createdAt: new Date(),
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockQuoteResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSwapResponse,
      });

    (prisma.swapReceipt.create as any).mockResolvedValue(mockSwapReceipt);

    const result = await quoteAndSwap({
      payAsset: 'USDC',
      amount: '100',
      toAsset: 'XLM',
      address: 'GDTEST123...',
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      'https://api.reflector.testnet.example/v1/quote',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromAsset: 'USDC',
          toAsset: 'XLM',
          amount: '100',
          slippageTolerance: 0.01,
        }),
      })
    );

    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      'https://api.reflector.testnet.example/v1/swap',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromAsset: 'USDC',
          toAsset: 'XLM',
          amount: '100',
          recipient: 'GDTEST123...',
          quote: mockQuoteResponse,
        }),
      })
    );

    expect(prisma.swapReceipt.create).toHaveBeenCalledWith({
      data: {
        envelopeId: 'GDTEST123...',
        route: 'USDC -> AQUA -> XLM',
        price: 4.955,
        txId: 'abc123def456',
      },
    });

    expect(result).toEqual({
      route: 'USDC -> AQUA -> XLM',
      price: 4.955,
      txId: 'abc123def456',
    });
  });

  it('should handle timeout and retry with exponential backoff', async () => {
    const abortError = new Error('AbortError');
    abortError.name = 'AbortError';

    const mockQuoteResponse = {
      route: {
        path: ['USDC', 'XLM'],
        protocols: ['soroswap'],
      },
      priceImpact: 0.001,
      estimatedOut: '99.9',
      estimatedPrice: 0.999,
    };

    const mockSwapResponse = {
      success: true,
      txId: 'timeout-retry-tx',
    };

    mockFetch
      .mockRejectedValueOnce(abortError)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockQuoteResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSwapResponse,
      });

    (prisma.swapReceipt.create as any).mockResolvedValue({
      id: 'receipt-retry',
      envelopeId: 'GDTEST123...',
      route: 'USDC -> XLM',
      price: 0.999,
      txId: 'timeout-retry-tx',
      createdAt: new Date(),
    });

    const result = await quoteAndSwap({
      payAsset: 'USDC',
      amount: '100',
      toAsset: 'XLM',
      address: 'GDTEST123...',
    });

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result).toEqual({
      route: 'USDC -> XLM',
      price: 0.999,
      txId: 'timeout-retry-tx',
    });
  });

  it('should handle server errors with retry', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          route: {
            path: ['USDC', 'XLM'],
            protocols: ['soroswap'],
          },
          priceImpact: 0.001,
          estimatedOut: '99.9',
          estimatedPrice: 0.999,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          txId: 'server-error-retry-tx',
        }),
      });

    (prisma.swapReceipt.create as any).mockResolvedValue({
      id: 'receipt-server-error',
      envelopeId: 'GDTEST123...',
      route: 'USDC -> XLM',
      price: 0.999,
      txId: 'server-error-retry-tx',
      createdAt: new Date(),
    });

    const result = await quoteAndSwap({
      payAsset: 'USDC',
      amount: '100',
      toAsset: 'XLM',
      address: 'GDTEST123...',
    });

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result).toEqual({
      route: 'USDC -> XLM',
      price: 0.999,
      txId: 'server-error-retry-tx',
    });
  });

  it('should return fallback when swap fails', async () => {
    const mockQuoteResponse = {
      route: {
        path: ['USDC', 'XLM'],
        protocols: ['soroswap'],
      },
      priceImpact: 0.001,
      estimatedOut: '99.9',
      estimatedPrice: 0.999,
    };

    const mockSwapResponse = {
      success: false,
      error: 'Insufficient liquidity',
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockQuoteResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSwapResponse,
      });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await quoteAndSwap({
      payAsset: 'USDC',
      amount: '100',
      toAsset: 'XLM',
      address: 'GDTEST123...',
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Reflector swap failed:',
      expect.any(Error)
    );
    expect(result).toEqual({
      route: 'direct',
      price: 100,
      txId: '',
    });

    consoleErrorSpy.mockRestore();
  });

  it('should return fallback when all retries fail', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'));

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await quoteAndSwap({
      payAsset: 'USDC',
      amount: '100',
      toAsset: 'XLM',
      address: 'GDTEST123...',
    });

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Reflector swap failed:',
      expect.any(Error)
    );
    expect(result).toEqual({
      route: 'direct',
      price: 100,
      txId: '',
    });

    consoleErrorSpy.mockRestore();
  });

  it('should handle missing txId in swap response', async () => {
    const mockQuoteResponse = {
      route: {
        path: ['USDC', 'XLM'],
        protocols: ['soroswap'],
      },
      priceImpact: 0.001,
      estimatedOut: '99.9',
      estimatedPrice: 0.999,
    };

    const mockSwapResponse = {
      success: true,
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockQuoteResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSwapResponse,
      });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await quoteAndSwap({
      payAsset: 'USDC',
      amount: '100',
      toAsset: 'XLM',
      address: 'GDTEST123...',
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Reflector swap failed:',
      expect.any(Error)
    );
    expect(result).toEqual({
      route: 'direct',
      price: 100,
      txId: '',
    });

    consoleErrorSpy.mockRestore();
  });
});