import { describe, it, expect, vi, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import swapRouter from '../routes/swap';

// Mock the environment
vi.mock('../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    HORIZON_URL: 'https://horizon-testnet.stellar.org',
    NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
    USDC_ISSUER: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    EURC_ISSUER: 'GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2',
    AQUA_ISSUER: 'GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA',
    ENABLE_AMM: false,
    REFLECTOR_URL: '',
  },
}));

// Mock the horizon module to avoid real API calls
vi.mock('../lib/horizon', () => ({
  findStrictReceivePaths: vi.fn().mockResolvedValue([
    {
      source_asset_type: 'native',
      source_amount: '100.0000000',
      destination_asset_type: 'credit_alphanum4',
      destination_asset_code: 'USDC',
      destination_asset_issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      destination_amount: '25.0000000',
      path: [],
    },
  ]),
}));

describe('Swap API Endpoints', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/swap', swapRouter);
  });

  describe('POST /api/swap/quote', () => {
    it('should return a valid quote for XLM to USDC swap', async () => {
      const response = await request(app)
        .post('/api/swap/quote')
        .send({
          side: 'exactOut',
          from: 'XLM',
          to: 'USDC',
          amount: '25.00',
          venue: 'dex',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('venue', 'dex');
      expect(response.body).toHaveProperty('inAmount', '100.0000000');
      expect(response.body).toHaveProperty('outAmount', '25.00');
      expect(response.body).toHaveProperty('price', 0.25);
      expect(response.body).toHaveProperty('feePct', 0.1);
      
      console.log('Quote response:', JSON.stringify(response.body, null, 2));
    });

    it('should return 409 when no route is available', async () => {
      // Mock no paths found
      const { findStrictReceivePaths } = await import('../lib/horizon');
      vi.mocked(findStrictReceivePaths).mockResolvedValueOnce([]);

      const response = await request(app)
        .post('/api/swap/quote')
        .send({
          side: 'exactOut',
          from: 'XLM',
          to: 'USDC',
          amount: '25.00',
          venue: 'dex',
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('code', 'NO_ROUTE');
    });

    it('should return 400 for invalid input', async () => {
      const response = await request(app)
        .post('/api/swap/quote')
        .send({
          side: 'exactOut',
          from: 'INVALID',
          to: 'USDC',
          amount: '25.00',
          venue: 'dex',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });

  describe('POST /api/swap/build', () => {
    it('should build a swap transaction', async () => {
      const response = await request(app)
        .post('/api/swap/build')
        .send({
          from: 'XLM',
          to: 'USDC',
          amount: '25.00',
          maxSlippageBps: 100,
          payerPublicKey: 'GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTMA',
        });

      if (response.status !== 200) {
        console.error('Build error:', response.body);
      }
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('xdr');
      expect(typeof response.body.xdr).toBe('string');
      
      console.log('Build response XDR length:', response.body.xdr?.length);
    });

    it('should include memo in transaction', async () => {
      const response = await request(app)
        .post('/api/swap/build')
        .send({
          from: 'XLM',
          to: 'USDC',
          amount: '25.00',
          maxSlippageBps: 100,
          payerPublicKey: 'GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTMA',
          memo: 'Test swap',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('xdr');
    });
  });

  describe('POST /api/swap/change-trust', () => {
    it('should build a change trust transaction', async () => {
      const response = await request(app)
        .post('/api/swap/change-trust')
        .send({
          asset: 'USDC',
          account: 'GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTMA',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('xdr');
      expect(typeof response.body.xdr).toBe('string');
      
      console.log('ChangeTrust XDR length:', response.body.xdr.length);
    });

    it('should return 400 for invalid public key', async () => {
      const response = await request(app)
        .post('/api/swap/change-trust')
        .send({
          asset: 'USDC',
          account: 'INVALID_KEY',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });
});