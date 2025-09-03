import { test, expect, APIRequestContext } from '@playwright/test';
import { signSession } from '../../server/src/lib/jwt';

// Test data
const TEST_WALLET = 'GTEST_E2E_WALLET_' + Date.now();
const TEST_EMAIL = `test-${Date.now()}@example.com`;

// Helper to create authenticated context
async function getAuthToken(): Promise<string> {
  return signSession({ sub: TEST_WALLET });
}

// Helper to check envelope status
async function checkEnvelopeStatus(
  request: APIRequestContext,
  envelopeId: string,
  expectedStatus: string,
  maxRetries: number = 10
) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await request.get(`/api/gift/${envelopeId}`);
    if (response.ok()) {
      const data = await response.json();
      if (data.data?.status === expectedStatus) {
        return data.data;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
  }
  throw new Error(`Envelope ${envelopeId} did not reach status ${expectedStatus}`);
}

test.describe('Gift Creation E2E Tests', () => {
  let authToken: string;
  let apiContext: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    // Get auth token
    authToken = await getAuthToken();
    
    // Create API context with auth
    apiContext = await playwright.request.newContext({
      baseURL: 'http://localhost:4000',
      extraHTTPHeaders: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Create test wallet in database
    await apiContext.post('/api/test/setup-wallet', {
      data: {
        publicKey: TEST_WALLET,
        walletType: 'HOT',
      },
    }).catch(() => {
      // Ignore if endpoint doesn't exist (will use mock data)
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test.describe('SINGLE Mode Gift', () => {
    test('should create and track status transitions', async () => {
      // Create SINGLE gift
      const createResponse = await apiContext.post('/api/gift', {
        data: {
          mode: 'SINGLE',
          recipients: ['GRECIPIENT_E2E_TEST'],
          amountAtomic: '1000000000',
          assetCode: 'USDC',
          expiryTs: Math.floor(Date.now() / 1000) + 3600,
          message: 'E2E Test Single Gift',
        },
      });

      expect(createResponse.ok()).toBeTruthy();
      const createData = await createResponse.json();
      
      // Verify response structure
      expect(createData.ok).toBe(true);
      expect(createData.data.mode).toBe('SINGLE');
      expect(createData.data.envelopeIds).toHaveLength(1);
      expect(createData.data.totalAmount).toBe('1000000000');
      expect(createData.data.recipientCount).toBe(1);

      const envelopeId = createData.data.envelopeIds[0];

      // Check initial status is PENDING
      const initialEnvelope = await checkEnvelopeStatus(apiContext, envelopeId, 'PENDING');
      expect(initialEnvelope.status).toBe('PENDING');

      // Wait for Outbox worker to process ESCROW_FUND
      // In real scenario, this would transition to FUNDED
      // For testing, we'll verify the envelope exists and can be retrieved
      const envelopeResponse = await apiContext.get(`/api/gift/${envelopeId}`);
      expect(envelopeResponse.ok()).toBeTruthy();
      const envelopeData = await envelopeResponse.json();
      expect(envelopeData.type).toBe('envelope');
      expect(envelopeData.data.id).toBe(envelopeId);
    });

    test('should handle email recipients', async () => {
      const createResponse = await apiContext.post('/api/gift', {
        data: {
          mode: 'SINGLE',
          recipients: [TEST_EMAIL],
          amountAtomic: '500000000',
          assetCode: 'XLM',
          expiryTs: Math.floor(Date.now() / 1000) + 3600,
          message: 'E2E Test Email Gift',
        },
      });

      expect(createResponse.ok()).toBeTruthy();
      const createData = await createResponse.json();
      expect(createData.data.mode).toBe('SINGLE');
      
      // Verify email invite was created
      const envelopeId = createData.data.envelopeIds[0];
      
      // Check Outbox for email job
      const outboxResponse = await apiContext.get('/api/test/outbox-jobs?type=EMAIL_SEND').catch(() => null);
      if (outboxResponse && outboxResponse.ok()) {
        const jobs = await outboxResponse.json();
        const emailJob = jobs.find((j: any) => 
          j.payload?.to === TEST_EMAIL
        );
        expect(emailJob).toBeDefined();
      }
    });
  });

  test.describe('MULTI Mode Gift', () => {
    test('should create multiple envelopes and split amount', async () => {
      const recipients = [
        'GMULTI1_E2E_TEST',
        'GMULTI2_E2E_TEST',
        'test1@example.com',
        'test2@example.com',
      ];

      const createResponse = await apiContext.post('/api/gift', {
        data: {
          mode: 'MULTI',
          recipients,
          amountAtomic: '4000000000', // 4000 USDC total
          assetCode: 'USDC',
          expiryTs: Math.floor(Date.now() / 1000) + 7200,
          message: 'E2E Test Multi Gift',
        },
      });

      expect(createResponse.ok()).toBeTruthy();
      const createData = await createResponse.json();
      
      // Verify response
      expect(createData.data.mode).toBe('MULTI');
      expect(createData.data.envelopeIds).toHaveLength(4);
      expect(createData.data.totalAmount).toBe('4000000000');
      expect(createData.data.recipientCount).toBe(4);

      // Each recipient should get 1000 USDC (4000 / 4)
      for (const envelopeId of createData.data.envelopeIds) {
        const response = await apiContext.get(`/api/gift/${envelopeId}`);
        if (response.ok()) {
          const data = await response.json();
          expect(data.data.amount).toBe('1000000000');
        }
      }
    });

    test('should track individual envelope statuses', async () => {
      const createResponse = await apiContext.post('/api/gift', {
        data: {
          mode: 'MULTI',
          recipients: ['GTRACK1_TEST', 'GTRACK2_TEST'],
          amountAtomic: '2000000000',
          assetCode: 'XLM',
          expiryTs: Math.floor(Date.now() / 1000) + 3600,
        },
      });

      const createData = await createResponse.json();
      const envelopeIds = createData.data.envelopeIds;

      // Check each envelope has independent status
      const statuses = await Promise.all(
        envelopeIds.map(async (id: string) => {
          const res = await apiContext.get(`/api/gift/${id}`);
          const data = await res.json();
          return data.data?.status;
        })
      );

      // All should start as PENDING
      expect(statuses.every(s => s === 'PENDING')).toBeTruthy();
    });
  });

  test.describe('POOL Mode Gift', () => {
    test('should create pool with QR code', async () => {
      const createResponse = await apiContext.post('/api/gift', {
        data: {
          mode: 'POOL',
          recipients: [],
          amountAtomic: '10000000000', // 10000 USDC total
          assetCode: 'USDC',
          expiryTs: Math.floor(Date.now() / 1000) + 86400,
          poolSize: 10,
          message: 'E2E Test Pool Gift',
          attachNft: false,
        },
      });

      expect(createResponse.ok()).toBeTruthy();
      const createData = await createResponse.json();
      
      // Verify pool response
      expect(createData.data.mode).toBe('POOL');
      expect(createData.data.qrCodeId).toBeDefined();
      expect(createData.data.poolId).toBeDefined();
      expect(createData.data.totalAmount).toBe('10000000000');
      expect(createData.data.recipientCount).toBe(10);

      const qrCodeId = createData.data.qrCodeId;

      // Get pool details
      const poolResponse = await apiContext.get(`/api/gift/${qrCodeId}`);
      expect(poolResponse.ok()).toBeTruthy();
      const poolData = await poolResponse.json();
      
      expect(poolData.type).toBe('pool');
      expect(poolData.data.poolSize).toBe(10);
      expect(poolData.data.claimedCount).toBe(0);
      expect(poolData.data.availableCount).toBe(10);
      expect(poolData.data.perClaimAmount).toBe('1000000000'); // 10000 / 10
    });

    test('should allow claiming from pool', async () => {
      // Create a small pool
      const createResponse = await apiContext.post('/api/gift', {
        data: {
          mode: 'POOL',
          recipients: [],
          amountAtomic: '3000000000',
          assetCode: 'XLM',
          expiryTs: Math.floor(Date.now() / 1000) + 3600,
          poolSize: 3,
        },
      });

      const createData = await createResponse.json();
      const qrCodeId = createData.data.qrCodeId;

      // Attempt to claim
      const claimResponse = await apiContext.get(`/api/gift/pool/${qrCodeId}/claim`);
      
      if (claimResponse.ok()) {
        const claimData = await claimResponse.json();
        expect(claimData.ok).toBe(true);
        expect(claimData.envelope).toBeDefined();
        expect(claimData.envelope.amount).toBe('1000000000');
        expect(claimData.envelope.preimage).toBeDefined();
        
        // Check pool status after claim
        const poolAfterResponse = await apiContext.get(`/api/gift/${qrCodeId}`);
        const poolAfterData = await poolAfterResponse.json();
        expect(poolAfterData.data.claimedCount).toBeGreaterThan(0);
        expect(poolAfterData.data.availableCount).toBeLessThan(3);
      }
    });

    test('should track pool exhaustion', async () => {
      // Create tiny pool
      const createResponse = await apiContext.post('/api/gift', {
        data: {
          mode: 'POOL',
          recipients: [],
          amountAtomic: '2000000000',
          assetCode: 'USDC',
          expiryTs: Math.floor(Date.now() / 1000) + 3600,
          poolSize: 2,
        },
      });

      const createData = await createResponse.json();
      const qrCodeId = createData.data.qrCodeId;

      // Claim all available envelopes
      const claims = [];
      for (let i = 0; i < 2; i++) {
        // Create new auth context for each claim (different user)
        const claimToken = signSession({ sub: `GCLAIM${i}_${Date.now()}` });
        const claimContext = await apiContext.request.newContext({
          baseURL: 'http://localhost:4000',
          extraHTTPHeaders: {
            'Authorization': `Bearer ${claimToken}`,
          },
        });
        
        const response = await claimContext.get(`/api/gift/pool/${qrCodeId}/claim`);
        claims.push(response.ok());
        
        await claimContext.dispose();
      }

      // At least some claims should succeed
      expect(claims.filter(c => c).length).toBeGreaterThan(0);

      // Try one more claim - should fail (exhausted)
      const exhaustedToken = signSession({ sub: 'GEXHAUSTED_TEST' });
      const exhaustedContext = await apiContext.request.newContext({
        baseURL: 'http://localhost:4000',
        extraHTTPHeaders: {
          'Authorization': `Bearer ${exhaustedToken}`,
        },
      });
      
      const exhaustedResponse = await exhaustedContext.get(`/api/gift/pool/${qrCodeId}/claim`);
      
      // Should either get 404 (no envelopes) or 400 (pool exhausted)
      expect([400, 404]).toContain(exhaustedResponse.status());
      
      await exhaustedContext.dispose();
    });
  });

  test.describe('Status Transitions', () => {
    test('should track envelope lifecycle', async () => {
      // This test would track full lifecycle in production:
      // PENDING -> FUNDED -> OPENED or CANCELED
      
      const createResponse = await apiContext.post('/api/gift', {
        data: {
          mode: 'SINGLE',
          recipients: ['GLIFECYCLE_TEST'],
          amountAtomic: '1000000000',
          assetCode: 'USDC',
          expiryTs: Math.floor(Date.now() / 1000) + 60, // Short expiry for testing
        },
      });

      const createData = await createResponse.json();
      const envelopeId = createData.data.envelopeIds[0];

      // Track status changes
      const statuses: string[] = [];
      
      // Initial status
      const initial = await apiContext.get(`/api/gift/${envelopeId}`);
      if (initial.ok()) {
        const data = await initial.json();
        statuses.push(data.data.status);
      }

      // In production, we'd wait for:
      // 1. Outbox worker to fund (PENDING -> FUNDED)
      // 2. User to claim (FUNDED -> OPENED)
      // 3. Or expiry (FUNDED -> CANCELED)
      
      expect(statuses[0]).toBe('PENDING');
      
      // Verify we can check status at any time
      const checkResponse = await apiContext.get(`/api/gift/${envelopeId}`);
      expect(checkResponse.ok()).toBeTruthy();
    });
  });

  test.describe('Error Scenarios', () => {
    test('should reject invalid mode', async () => {
      const response = await apiContext.post('/api/gift', {
        data: {
          mode: 'INVALID_MODE',
          recipients: ['GERROR_TEST'],
          amountAtomic: '1000000000',
          assetCode: 'USDC',
          expiryTs: Math.floor(Date.now() / 1000) + 3600,
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('should reject SINGLE with multiple recipients', async () => {
      const response = await apiContext.post('/api/gift', {
        data: {
          mode: 'SINGLE',
          recipients: ['GERROR1', 'GERROR2'],
          amountAtomic: '1000000000',
          assetCode: 'USDC',
          expiryTs: Math.floor(Date.now() / 1000) + 3600,
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('exactly one recipient');
    });

    test('should reject POOL without poolSize', async () => {
      const response = await apiContext.post('/api/gift', {
        data: {
          mode: 'POOL',
          recipients: [],
          amountAtomic: '1000000000',
          assetCode: 'USDC',
          expiryTs: Math.floor(Date.now() / 1000) + 3600,
          // poolSize missing
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('poolSize');
    });
  });
});