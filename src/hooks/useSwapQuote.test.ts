import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSwapQuote } from './useSwapQuote';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useSwapQuote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns direct quote for same asset conversion', async () => {
    const { result } = renderHook(() =>
      useSwapQuote({
        from: 'USDC',
        to: 'USDC',
        amount: '100',
        side: 'exactOut',
        venue: 'best',
      })
    );

    await waitFor(() => {
      expect(result.current.quote).toEqual({
        venue: 'Direct',
        inAmount: '100',
        outAmount: '100',
        price: '1.0000',
        feePct: '0.0',
      });
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fetches quote for different asset conversion', async () => {
    const mockQuoteResponse = {
      venue: 'best',
      inAmount: '55.56',
      outAmount: '25.00',
      price: '0.4500',
      feePct: '0.1',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockQuoteResponse),
    });

    const { result } = renderHook(() =>
      useSwapQuote({
        from: 'XLM',
        to: 'USDC',
        amount: '25.00',
        side: 'exactOut',
        venue: 'best',
      })
    );

    await waitFor(() => {
      expect(result.current.quote).toEqual(mockQuoteResponse);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(mockFetch).toHaveBeenCalledWith('/api/swap/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        side: 'exactOut',
        from: 'XLM',
        to: 'USDC',
        amount: '25.00',
        venue: 'best',
      }),
    });
  });

  it('handles NO_ROUTE error correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: () => Promise.resolve({ code: 'NO_ROUTE' }),
    });

    const { result } = renderHook(() =>
      useSwapQuote({
        from: 'XLM',
        to: 'USDC',
        amount: '25.00',
        side: 'exactOut',
        venue: 'best',
      })
    );

    await waitFor(() => {
      expect(result.current.error).toBe('No liquidity now—try another asset or venue.');
    });

    expect(result.current.quote).toBe(null);
    expect(result.current.isLoading).toBe(false);
  });

  it('handles ORACLE_UNAVAILABLE error correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: () => Promise.resolve({ code: 'ORACLE_UNAVAILABLE' }),
    });

    const { result } = renderHook(() =>
      useSwapQuote({
        from: 'XLM',
        to: 'USDC',
        amount: '25.00',
        side: 'exactOut',
        venue: 'best',
      })
    );

    await waitFor(() => {
      expect(result.current.error).toBe('Price oracle offline. Please try later.');
    });

    expect(result.current.quote).toBe(null);
    expect(result.current.isLoading).toBe(false);
  });

  it('skips fetch when disabled', () => {
    const { result } = renderHook(() =>
      useSwapQuote({
        from: 'XLM',
        to: 'USDC',
        amount: '25.00',
        side: 'exactOut',
        venue: 'best',
        enabled: false,
      })
    );

    expect(result.current.quote).toBe(null);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('skips fetch when amount is empty or zero', () => {
    const { result } = renderHook(() =>
      useSwapQuote({
        from: 'XLM',
        to: 'USDC',
        amount: '',
        side: 'exactOut',
        venue: 'best',
      })
    );

    expect(result.current.quote).toBe(null);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('refetches when dependencies change', async () => {
    const mockQuoteResponse1 = {
      venue: 'best',
      inAmount: '55.56',
      outAmount: '25.00',
      price: '0.4500',
      feePct: '0.1',
    };

    const mockQuoteResponse2 = {
      venue: 'dex',
      inAmount: '60.00',
      outAmount: '25.00',
      price: '0.4167',
      feePct: '0.2',
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockQuoteResponse1),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockQuoteResponse2),
      });

    const { result, rerender } = renderHook(
      ({ venue }) =>
        useSwapQuote({
          from: 'XLM',
          to: 'USDC',
          amount: '25.00',
          side: 'exactOut',
          venue,
        }),
      { initialProps: { venue: 'best' as const } }
    );

    await waitFor(() => {
      expect(result.current.quote).toEqual(mockQuoteResponse1);
    });

    rerender({ venue: 'dex' as const });

    await waitFor(() => {
      expect(result.current.quote).toEqual(mockQuoteResponse2);
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
