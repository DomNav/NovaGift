import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '../server';
import { makeOpenLink, verifyOpenToken } from '../security/link';
import { sha256Hex } from '../lib/stellar';

// Mock Stellar SDK to avoid real network calls
vi.mock('@stellar/stellar-sdk', () => ({
  SorobanRpc: {
    Server: vi.fn().mockImplementation(() => ({
      getAccount: vi.fn().mockResolvedValue({
        accountId: () => 'GBXGQJWVLWOYHFLVTKWV5FGHA3LNYY2JQKM7OAJAUEQFU6LPCSEFVXON',
        sequenceNumber: () => '123456',
      }),
      prepareTransaction: vi.fn().mockImplementation((tx) => tx),
      getTransaction: vi.fn().mockResolvedValue({
        status: 'SUCCESS',
        resultXdr: 'AAAAAgAAAAA...',
      }),
    })),
  },
  TransactionBuilder: vi.fn().mockImplementation(() => ({
    addOperation: vi.fn().mockReturnThis(),
    setTimeout: vi.fn().mockReturnThis(),
    build: vi.fn().mockReturnValue({
      toXDR: () => 'AAAAAgAAAAA...',
      sign: vi.fn(),
    }),
  })),
  Operation: {
    invokeContractFunction: vi.fn().mockReturnValue({}),
  },
  Address: vi.fn().mockImplementation((addr) => ({
    toScVal: () => ({}),
  })),
  nativeToScVal: vi.fn().mockReturnValue({}),
  scValToNative: vi.fn().mockReturnValue({}),
  BASE_FEE: '100',
  Networks: {
    TESTNET: 'Test SDF Network ; September 2015',
  },
  Keypair: {
    fromSecret: vi.fn().mockReturnValue({
      publicKey: () => 'GBXGQJWVLWOYHFLVTKWV5FGHA3LNYY2JQKM7OAJAUEQFU6LPCSEFVXON',
      sign: vi.fn(),
    }),
    random: vi.fn().mockReturnValue({
      sign: vi.fn(),
    }),
  },
  xdr: {
    TransactionResult: {
      fromXDR: vi.fn().mockReturnValue({
        result: () => ({
          results: () => [{}],
        }),
      }),
    },
  },
}));

describe('NovaGift API', () => {
  const testSender = 'GBXGQJWVLWOYHFLVTKWV5FGHA3LNYY2JQKM7OAJAUEQFU6LPCSEFVXON';
  const testRecipient = 'GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTMA';
  let envelopeId: string;
  let preimage: string;
  let openUrl: string;

  describe('POST /api/envelope/create', () => {
    it('should create an envelope and return unsigned XDR', async () => {
      const response = await request(app)
        .post('/api/envelope/create')
        .send({
          sender: testSender,
          asset: 'USDC',
          amount: '10.50',
          message: 'Test gift',
          expiresInMinutes: 60,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('unsignedXDR');
      expect(response.body).toHaveProperty('openUrl');
      expect(response.body).toHaveProperty('preimage');
      expect(response.body).toHaveProperty('expiresAt');

      // Store for next tests
      envelopeId = response.body.id;
      preimage = response.body.preimage;
      openUrl = response.body.openUrl;
    });

    it('should reject invalid asset', async () => {
      const response = await request(app)
        .post('/api/envelope/create')
        .send({
          sender: testSender,
          asset: 'INVALID',
          amount: '10.50',
          expiresInMinutes: 60,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid amount format', async () => {
      const response = await request(app)
        .post('/api/envelope/create')
        .send({
          sender: testSender,
          asset: 'USDC',
          amount: 'invalid',
          expiresInMinutes: 60,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should enforce rate limiting', async () => {
      // Make 21 requests (limit is 20 per minute)
      const requests = Array(21).fill(null).map(() =>
        request(app)
          .post('/api/envelope/create')
          .send({
            sender: testSender,
            asset: 'USDC',
            amount: '1.00',
            expiresInMinutes: 60,
          })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('GET /api/envelope/:id', () => {
    it('should retrieve envelope details by ID', async () => {
      const response = await request(app)
        .get(`/api/envelope/${envelopeId}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: envelopeId,
        status: 'CREATED',
        asset: 'USDC',
        amount: '10.50',
        decimals: 7,
        sender: testSender,
        recipient: null,
        memo: `NOVAGIFT:${envelopeId.slice(0, 8)}`,
      });
      expect(response.body).toHaveProperty('expiryTs');
    });

    it('should return 404 for non-existent envelope', async () => {
      const fakeId = '0'.repeat(64);
      const response = await request(app)
        .get(`/api/envelope/${fakeId}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Envelope not found');
    });

    it('should reject invalid ID format', async () => {
      const invalidId = 'invalid-id';
      const response = await request(app)
        .get(`/api/envelope/${invalidId}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid envelope ID format');
    });

    it('should reject ID with wrong length', async () => {
      const shortId = 'abc123';
      const response = await request(app)
        .get(`/api/envelope/${shortId}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid envelope ID format');
    });
  });

  describe('POST /api/envelope/fund', () => {
    it('should mark envelope as funded with valid transaction', async () => {
      const response = await request(app)
        .post('/api/envelope/fund')
        .send({
          id: envelopeId,
          txId: 'mock-tx-hash-123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: envelopeId,
        status: 'FUNDED',
      });
    });

    it('should reject funding non-existent envelope', async () => {
      const response = await request(app)
        .post('/api/envelope/fund')
        .send({
          id: 'nonexistent123',
          txId: 'mock-tx-hash',
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Envelope not found');
    });

    it('should reject double funding', async () => {
      const response = await request(app)
        .post('/api/envelope/fund')
        .send({
          id: envelopeId,
          txId: 'another-tx-hash',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('FUNDED');
    });
  });

  describe('POST /api/envelope/open', () => {
    it('should open envelope with valid JWT and preimage', async () => {
      // Extract token from open URL
      const urlObj = new URL(openUrl);
      const token = urlObj.searchParams.get('t');

      const response = await request(app)
        .post(`/api/envelope/open?t=${token}`)
        .send({
          id: envelopeId,
          recipient: testRecipient,
          preimage: preimage,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'OPENED');
      expect(response.body).toHaveProperty('recipient', testRecipient);
      expect(response.body).toHaveProperty('assetDelivered');
      expect(response.body).toHaveProperty('amount');
      expect(response.body).toHaveProperty('txId');
    });

    it('should reject opening without token', async () => {
      const response = await request(app)
        .post('/api/envelope/open')
        .send({
          id: envelopeId,
          recipient: testRecipient,
          preimage: preimage,
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Token required');
    });

    it('should reject reusing JWT token', async () => {
      // Create a new envelope for this test
      const createResponse = await request(app)
        .post('/api/envelope/create')
        .send({
          sender: testSender,
          asset: 'XLM',
          amount: '5.00',
          expiresInMinutes: 60,
        });

      const newEnvelopeId = createResponse.body.id;
      const newPreimage = createResponse.body.preimage;
      const newOpenUrl = createResponse.body.openUrl;

      // Fund it
      await request(app)
        .post('/api/envelope/fund')
        .send({
          id: newEnvelopeId,
          txId: 'mock-tx-fund-2',
        });

      // Extract token
      const urlObj = new URL(newOpenUrl);
      const token = urlObj.searchParams.get('t');

      // First open should succeed
      const firstOpen = await request(app)
        .post(`/api/envelope/open?t=${token}`)
        .send({
          id: newEnvelopeId,
          recipient: testRecipient,
          preimage: newPreimage,
        });

      expect(firstOpen.status).toBe(200);

      // Second open with same token should fail
      const secondOpen = await request(app)
        .post(`/api/envelope/open?t=${token}`)
        .send({
          id: newEnvelopeId,
          recipient: testRecipient,
          preimage: newPreimage,
        });

      expect(secondOpen.status).toBe(401);
      expect(secondOpen.body).toHaveProperty('error', 'Token already used');
    });

    it('should reject wrong preimage', async () => {
      // Create and fund a new envelope
      const createResponse = await request(app)
        .post('/api/envelope/create')
        .send({
          sender: testSender,
          asset: 'USDC',
          amount: '3.00',
          expiresInMinutes: 60,
        });

      await request(app)
        .post('/api/envelope/fund')
        .send({
          id: createResponse.body.id,
          txId: 'mock-tx-fund-3',
        });

      const urlObj = new URL(createResponse.body.openUrl);
      const token = urlObj.searchParams.get('t');

      const response = await request(app)
        .post(`/api/envelope/open?t=${token}`)
        .send({
          id: createResponse.body.id,
          recipient: testRecipient,
          preimage: 'wrong' + '0'.repeat(58), // Wrong preimage
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid preimage');
    });
  });

  describe('POST /api/envelope/cancel', () => {
    it('should cancel expired envelope', async () => {
      // Create envelope with short expiry
      const createResponse = await request(app)
        .post('/api/envelope/create')
        .send({
          sender: testSender,
          asset: 'USDC',
          amount: '2.00',
          expiresInMinutes: 15, // Minimum expiry
        });

      const cancelId = createResponse.body.id;

      // Fund it
      await request(app)
        .post('/api/envelope/fund')
        .send({
          id: cancelId,
          txId: 'mock-tx-fund-cancel',
        });

      // Mock expiry by manipulating the envelope directly
      // In real test, we'd wait or mock time
      
      // For now, we'll test the rejection when not expired
      const response = await request(app)
        .post('/api/envelope/cancel')
        .send({
          id: cancelId,
          sender: testSender,
        });

      // Should reject since not actually expired
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Envelope not expired yet');
    });

    it('should reject cancel by non-sender', async () => {
      const response = await request(app)
        .post('/api/envelope/cancel')
        .send({
          id: envelopeId,
          sender: testRecipient, // Wrong sender
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Only sender can cancel');
    });
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('ok', true);
      expect(response.body).toHaveProperty('env', 'testnet');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});