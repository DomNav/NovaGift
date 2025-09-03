import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../server';
import { prisma } from '../db/client';
import { signSession } from '../lib/jwt';
import { Wallet, Envelope } from '@prisma/client';

describe('Gift API Integration Tests', () => {
  let authToken: string;
  let testWallet: Wallet;

  beforeAll(async () => {
    // Clean up test data
    await prisma.outbox.deleteMany({});
    await prisma.qrEvent.deleteMany({});
    await prisma.qrCode.deleteMany({});
    await prisma.emailInvite.deleteMany({});
    await prisma.envelope.deleteMany({});
    await prisma.wallet.deleteMany({});
    
    // Create test wallet
    testWallet = await prisma.wallet.create({
      data: {
        profileId: 'test-profile-' + Date.now(),
        publicKey: 'GTEST' + Date.now() + '_PUBLIC_KEY',
        walletType: 'HOT',
      },
    });

    // Create auth token
    authToken = signSession({ sub: testWallet.publicKey });
  });

  afterAll(async () => {
    // Clean up
    await prisma.outbox.deleteMany({});
    await prisma.qrEvent.deleteMany({});
    await prisma.qrCode.deleteMany({});
    await prisma.emailInvite.deleteMany({});
    await prisma.envelope.deleteMany({});
    await prisma.wallet.deleteMany({});
  });

  beforeEach(async () => {
    // Clean up between tests
    await prisma.outbox.deleteMany({});
    await prisma.qrEvent.deleteMany({});
    await prisma.qrCode.deleteMany({});
    await prisma.emailInvite.deleteMany({});
    await prisma.envelope.deleteMany({});
  });

  describe('POST /api/gift', () => {
    it('should create a SINGLE mode gift', async () => {
      const response = await request(app)
        .post('/api/gift')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          mode: 'SINGLE',
          recipients: ['GRECIPIENT_TEST_KEY'],
          amountAtomic: '1000000000',
          assetCode: 'USDC',
          expiryTs: Math.floor(Date.now() / 1000) + 3600,
          message: 'Test gift',
        });

      expect(response.status).toBe(201);
      expect(response.body.ok).toBe(true);
      expect(response.body.data.mode).toBe('SINGLE');
      expect(response.body.data.envelopeIds).toHaveLength(1);
      expect(response.body.data.totalAmount).toBe('1000000000');
      expect(response.body.data.recipientCount).toBe(1);

      // Verify envelope was created
      const envelope = await prisma.envelope.findUnique({
        where: { id: response.body.data.envelopeIds[0] },
      });
      expect(envelope).toBeTruthy();
      expect(envelope?.status).toBe('PENDING');
      expect(envelope?.amount.toString()).toBe('1000000000');

      // Verify outbox job was created
      const outboxJobs = await prisma.outbox.findMany({
        where: {
          type: 'ESCROW_FUND',
        },
      });
      expect(outboxJobs).toHaveLength(1);
    });

    it('should create a MULTI mode gift with email recipients', async () => {
      const response = await request(app)
        .post('/api/gift')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          mode: 'MULTI',
          recipients: [
            'GWALLET1_TEST',
            'user1@test.com',
            'GWALLET2_TEST',
            'user2@test.com',
          ],
          amountAtomic: '4000000000',
          assetCode: 'XLM',
          expiryTs: Math.floor(Date.now() / 1000) + 7200,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.mode).toBe('MULTI');
      expect(response.body.data.envelopeIds).toHaveLength(4);
      expect(response.body.data.recipientCount).toBe(4);

      // Verify envelopes were created
      const envelopes = await prisma.envelope.findMany({});
      expect(envelopes).toHaveLength(4);
      
      // Each should get 1000 XLM
      envelopes.forEach(env => {
        expect(env.amount.toString()).toBe('1000000000');
      });

      // Verify email invites were created
      const emailInvites = await prisma.emailInvite.findMany({});
      expect(emailInvites).toHaveLength(2); // Two email recipients

      // Verify outbox jobs
      const emailJobs = await prisma.outbox.findMany({
        where: { type: 'EMAIL_SEND' },
      });
      expect(emailJobs).toHaveLength(2);

      const escrowJobs = await prisma.outbox.findMany({
        where: { type: 'ESCROW_FUND' },
      });
      expect(escrowJobs).toHaveLength(4);
    });

    it('should create a POOL mode gift', async () => {
      const response = await request(app)
        .post('/api/gift')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          mode: 'POOL',
          recipients: [],
          amountAtomic: '10000000000',
          assetCode: 'USDC',
          expiryTs: Math.floor(Date.now() / 1000) + 86400,
          poolSize: 5,
          message: 'Pool party!',
          attachNft: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.mode).toBe('POOL');
      expect(response.body.data.qrCodeId).toBeTruthy();
      expect(response.body.data.poolId).toBeTruthy();
      expect(response.body.data.totalAmount).toBe('10000000000');
      expect(response.body.data.recipientCount).toBe(5);

      // Verify QR code was created
      const qrCode = await prisma.qrCode.findUnique({
        where: { id: response.body.data.qrCodeId },
      });
      expect(qrCode).toBeTruthy();
      expect(qrCode?.maxUses).toBe(5);

      // Verify envelopes were pre-created
      const envelopes = await prisma.envelope.findMany({});
      expect(envelopes).toHaveLength(5);
      
      // Each should get 2000 USDC
      envelopes.forEach(env => {
        expect(env.amount.toString()).toBe('2000000000');
        expect(env.attachNft).toBe(true);
      });

      // Verify QR events were created
      const qrEvents = await prisma.qrEvent.findMany({
        where: { qrCodeId: response.body.data.qrCodeId },
      });
      expect(qrEvents).toHaveLength(5);
    });

    it('should reject invalid mode', async () => {
      const response = await request(app)
        .post('/api/gift')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          mode: 'INVALID',
          recipients: ['GRECIPIENT'],
          amountAtomic: '1000000000',
          assetCode: 'USDC',
          expiryTs: Math.floor(Date.now() / 1000) + 3600,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });

    it('should reject SINGLE mode with multiple recipients', async () => {
      const response = await request(app)
        .post('/api/gift')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          mode: 'SINGLE',
          recipients: ['GRECIPIENT1', 'GRECIPIENT2'],
          amountAtomic: '1000000000',
          assetCode: 'USDC',
          expiryTs: Math.floor(Date.now() / 1000) + 3600,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('exactly one recipient');
    });

    it('should reject POOL mode without poolSize', async () => {
      const response = await request(app)
        .post('/api/gift')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          mode: 'POOL',
          recipients: [],
          amountAtomic: '1000000000',
          assetCode: 'USDC',
          expiryTs: Math.floor(Date.now() / 1000) + 3600,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('poolSize parameter');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/gift')
        .send({
          mode: 'SINGLE',
          recipients: ['GRECIPIENT'],
          amountAtomic: '1000000000',
          assetCode: 'USDC',
          expiryTs: Math.floor(Date.now() / 1000) + 3600,
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/gift/:id', () => {
    it('should retrieve envelope details', async () => {
      // Create an envelope first
      const envelope = await prisma.envelope.create({
        data: {
          id: 'test-envelope-' + Date.now(),
          asset: 'USDC',
          amount: 500000000,
          decimals: 7,
          sender: testWallet.publicKey,
          recipient: 'GRECIPIENT_TEST',
          hash: 'test-hash',
          preimage: 'test-preimage',
          expiryTs: Math.floor(Date.now() / 1000) + 3600,
          status: 'FUNDED',
          message: 'Test envelope',
        },
      });

      const response = await request(app)
        .get(`/api/gift/${envelope.id}`);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.type).toBe('envelope');
      expect(response.body.data.id).toBe(envelope.id);
      expect(response.body.data.amount).toBe('500000000');
      expect(response.body.data.status).toBe('FUNDED');
    });

    it('should retrieve pool details', async () => {
      // Create a pool
      const poolId = 'test-pool-' + Date.now();
      const qrCode = await prisma.qrCode.create({
        data: {
          projectId: poolId,
          description: 'Test pool',
          maxUses: 3,
          currentUses: 0,
          expiresAt: new Date(Date.now() + 86400000),
          isActive: true,
          metadata: {
            poolId,
            assetCode: 'XLM',
            perClaimAmount: '1000000000',
            totalAmount: '3000000000',
            message: 'Pool test',
          },
        },
      });

      // Create pool envelopes
      for (let i = 0; i < 3; i++) {
        const envelope = await prisma.envelope.create({
          data: {
            id: `pool-env-${i}-${Date.now()}`,
            asset: 'XLM',
            amount: 1000000000,
            decimals: 7,
            sender: testWallet.publicKey,
            hash: `hash-${i}`,
            preimage: `preimage-${i}`,
            expiryTs: Math.floor(Date.now() / 1000) + 86400,
            status: 'FUNDED',
          },
        });

        await prisma.qrEvent.create({
          data: {
            qrCodeId: qrCode.id,
            envelopeId: envelope.id,
            eventType: 'POOL_ENVELOPE_CREATED',
            metadata: {
              claimIndex: i + 1,
              poolSize: 3,
            },
          },
        });
      }

      const response = await request(app)
        .get(`/api/gift/${qrCode.id}`);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.type).toBe('pool');
      expect(response.body.data.poolId).toBe(poolId);
      expect(response.body.data.poolSize).toBe(3);
      expect(response.body.data.claimedCount).toBe(0);
      expect(response.body.data.availableCount).toBe(3);
      expect(response.body.data.perClaimAmount).toBe('1000000000');
    });

    it('should return 404 for non-existent gift', async () => {
      const response = await request(app)
        .get('/api/gift/nonexistent-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Gift not found');
    });
  });

  describe('GET /api/gift/pool/:qrCodeId/claim', () => {
    it('should claim from pool successfully', async () => {
      // Create a pool with available envelopes
      const qrCode = await prisma.qrCode.create({
        data: {
          projectId: 'claim-test-pool',
          description: 'Claim test pool',
          maxUses: 2,
          currentUses: 0,
          expiresAt: new Date(Date.now() + 86400000),
          isActive: true,
          metadata: {},
        },
      });

      // Create funded envelopes
      const envelope1 = await prisma.envelope.create({
        data: {
          id: 'claim-env-1-' + Date.now(),
          asset: 'USDC',
          amount: 1000000000,
          decimals: 7,
          sender: testWallet.publicKey,
          hash: 'hash-1',
          preimage: 'preimage-1',
          expiryTs: Math.floor(Date.now() / 1000) + 86400,
          status: 'FUNDED',
        },
      });

      await prisma.qrEvent.create({
        data: {
          qrCodeId: qrCode.id,
          envelopeId: envelope1.id,
          eventType: 'POOL_ENVELOPE_CREATED',
          metadata: {},
        },
      });

      const response = await request(app)
        .get(`/api/gift/pool/${qrCode.id}/claim`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.envelope).toBeTruthy();
      expect(response.body.envelope.id).toBe(envelope1.id);
      expect(response.body.envelope.preimage).toBe('preimage-1');

      // Verify envelope was reserved
      const updatedEnvelope = await prisma.envelope.findUnique({
        where: { id: envelope1.id },
      });
      expect(updatedEnvelope?.recipient).toBe(testWallet.publicKey);

      // Verify QR code usage was incremented
      const updatedQr = await prisma.qrCode.findUnique({
        where: { id: qrCode.id },
      });
      expect(updatedQr?.currentUses).toBe(1);
    });

    it('should return 404 when pool is exhausted', async () => {
      // Create exhausted pool
      const qrCode = await prisma.qrCode.create({
        data: {
          projectId: 'exhausted-pool',
          description: 'Exhausted pool',
          maxUses: 1,
          currentUses: 0,
          expiresAt: new Date(Date.now() + 86400000),
          isActive: true,
          metadata: {},
        },
      });

      // Create already claimed envelope
      const envelope = await prisma.envelope.create({
        data: {
          id: 'exhausted-env-' + Date.now(),
          asset: 'USDC',
          amount: 1000000000,
          decimals: 7,
          sender: testWallet.publicKey,
          recipient: 'GALREADY_CLAIMED',
          hash: 'hash',
          preimage: 'preimage',
          expiryTs: Math.floor(Date.now() / 1000) + 86400,
          status: 'OPENED',
        },
      });

      await prisma.qrEvent.create({
        data: {
          qrCodeId: qrCode.id,
          envelopeId: envelope.id,
          eventType: 'POOL_ENVELOPE_CREATED',
          metadata: {},
        },
      });

      const response = await request(app)
        .get(`/api/gift/pool/${qrCode.id}/claim`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('No envelopes available');
    });

    it('should reject claim from expired pool', async () => {
      const qrCode = await prisma.qrCode.create({
        data: {
          projectId: 'expired-pool',
          description: 'Expired pool',
          maxUses: 1,
          currentUses: 0,
          expiresAt: new Date(Date.now() - 1000), // Already expired
          isActive: true,
          metadata: {},
        },
      });

      const response = await request(app)
        .get(`/api/gift/pool/${qrCode.id}/claim`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('expired');
    });

    it('should require authentication for claiming', async () => {
      const response = await request(app)
        .get('/api/gift/pool/some-qr-id/claim');

      expect(response.status).toBe(401);
    });
  });
});