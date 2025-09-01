/**
 * Unit tests for claim store functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchEnvelope, buildClaimTx, formatEnvelopeAmount, shortenAddress } from '../claim';

// Mock the env module
vi.mock('../../config/env', () => ({
  API_URL: 'https://test-api.example.com',
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Claim Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchEnvelope', () => {
    it('should fetch envelope data successfully', async () => {
      const mockEnvelopeData = {
        id: 'test-envelope-id',
        status: 'FUNDED',
        amount: '100',
        assetCode: 'XLM',
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEnvelopeData),
      });

      const result = await fetchEnvelope('test-envelope-id');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/api/claim/test-envelope-id',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      expect(result).toEqual(mockEnvelopeData);
    });

    it('should throw error for 404 not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({}),
      });

      await expect(fetchEnvelope('nonexistent-id')).rejects.toThrow('Envelope not found');
    });

    it('should throw error for network failures', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchEnvelope('test-id')).rejects.toThrow('Network error');
    });

    it('should throw error for invalid envelope data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'data' }),
      });

      await expect(fetchEnvelope('test-id')).rejects.toThrow('Invalid envelope data received');
    });
  });

  describe('buildClaimTx', () => {
    it('should build claim transaction successfully', async () => {
      const mockXdr = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ xdr: mockXdr }),
      });

      const params = {
        id: 'test-envelope-id',
        recipient: 'GRECIPIENT123456789',
        senderPublicKey: 'GSENDER123456789',
      };

      const result = await buildClaimTx(params);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/api/claim/test-envelope-id/build',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipient: params.recipient,
          }),
        }
      );

      expect(result).toBe(mockXdr);
    });

    it('should include invite token when provided', async () => {
      const mockXdr = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ xdr: mockXdr }),
      });

      const params = {
        id: 'test-envelope-id',
        recipient: 'GRECIPIENT123456789',
        invite: 'test-invite-token',
      };

      await buildClaimTx(params);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/api/claim/test-envelope-id/build',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipient: params.recipient,
            t: params.invite,
          }),
        }
      );
    });

    it('should throw error for missing required parameters', async () => {
      const params = {
        id: '',
        recipient: 'GRECIPIENT123456789',
      };

      await expect(buildClaimTx(params)).rejects.toThrow(
        'Missing required parameters for building claim transaction'
      );
    });

    it('should handle 400 bad request errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Invalid parameters' }),
      });

      const params = {
        id: 'test-envelope-id',
        recipient: 'invalid-recipient',
      };

      await expect(buildClaimTx(params)).rejects.toThrow('Invalid parameters');
    });

    it('should handle 404 not found errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({}),
      });

      const params = {
        id: 'nonexistent-envelope',
        recipient: 'GRECIPIENT123456789',
      };

      await expect(buildClaimTx(params)).rejects.toThrow('Envelope not found or already claimed');
    });

    it('should handle 409 conflict errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ message: 'Already claimed' }),
      });

      const params = {
        id: 'claimed-envelope',
        recipient: 'GRECIPIENT123456789',
      };

      await expect(buildClaimTx(params)).rejects.toThrow('Envelope already claimed or not available for claiming');
    });

    it('should throw error for missing XDR in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' }),
      });

      const params = {
        id: 'test-envelope-id',
        recipient: 'GRECIPIENT123456789',
      };

      await expect(buildClaimTx(params)).rejects.toThrow('Invalid response: missing XDR');
    });
  });

  describe('formatEnvelopeAmount', () => {
    it('should format amounts correctly', () => {
      expect(formatEnvelopeAmount('100', 'XLM')).toBe('100 XLM');
      expect(formatEnvelopeAmount('100.5', 'XLM')).toBe('100.5 XLM');
      expect(formatEnvelopeAmount('1000.123456', 'USDC')).toBe('1,000.123456 USDC');
      expect(formatEnvelopeAmount('0.0000001', 'XLM')).toBe('0.0000001 XLM');
    });

    it('should handle invalid amounts gracefully', () => {
      expect(formatEnvelopeAmount('invalid', 'XLM')).toBe('invalid XLM');
      expect(formatEnvelopeAmount('', 'XLM')).toBe(' XLM');
    });

    it('should format large numbers with commas', () => {
      expect(formatEnvelopeAmount('1000000', 'XLM')).toBe('1,000,000 XLM');
      expect(formatEnvelopeAmount('1234567.89', 'USDC')).toBe('1,234,567.89 USDC');
    });
  });

  describe('shortenAddress', () => {
    it('should shorten long addresses correctly', () => {
      const longAddress = 'GCKFBEIYTKP633JNPZ2VSNQHBJQLGZS5NZSAOBVQ7W5TFBP2Y4ZCNBJI';
      expect(shortenAddress(longAddress)).toBe('GCKF...NBJI');
    });

    it('should return short addresses unchanged', () => {
      expect(shortenAddress('GCKF')).toBe('GCKF');
      expect(shortenAddress('SHORT')).toBe('SHORT');
    });

    it('should handle empty or undefined addresses', () => {
      expect(shortenAddress('')).toBe('');
      expect(shortenAddress(undefined as any)).toBe(undefined);
    });

    it('should handle edge case addresses', () => {
      expect(shortenAddress('G123456789')).toBe('G123...6789');
    });
  });
});
