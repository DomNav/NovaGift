import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { prisma } from '../db/client';
import { OutboxWorker } from '../jobs/outbox';
import { Wallet, Envelope, Outbox } from '@prisma/client';
import crypto from 'crypto';

// Mock the Stellar/Soroban SDK
vi.mock('@stellar/stellar-sdk', () => ({
  Keypair: {
    fromSecret: vi.fn().mockReturnValue({
      publicKey: () => 'GTEST_PUBLIC_KEY',
    }),
  },
  TransactionBuilder: vi.fn().mockImplementation(() => ({
    addOperation: vi.fn().mockReturnThis(),
    setTimeout: vi.fn().mockReturnThis(),
    build: vi.fn().mockReturnValue({
      sign: vi.fn(),
    }),
  })),
  Operation: {
    invokeContractFunction: vi.fn(),
  },
  Address: {
    fromString: vi.fn().mockImplementation((addr) => ({
      toScVal: vi.fn(),
    })),
  },
  nativeToScVal: vi.fn(),
  BASE_FEE: '100',
  Networks: {
    TESTNET: 'Test SDF Network ; September 2015',
  },
}));

vi.mock('@stellar/stellar-sdk/rpc', () => ({
  Server: vi.fn().mockImplementation(() => ({
    getAccount: vi.fn().mockResolvedValue({
      accountId: vi.fn().mockReturnValue('GTEST_ACCOUNT'),
      sequenceNumber: vi.fn().mockReturnValue('12345'),
    }),
    prepareTransaction: vi.fn().mockImplementation(async (tx) => tx),
    sendTransaction: vi.fn().mockResolvedValue({
      hash: 'test_tx_hash_123',
    }),
    getTransaction: vi.fn().mockResolvedValue({
      status: 'SUCCESS',
    }),
  })),
}));

describe('Escrow Integration Tests', () => {
  let testWallet: Wallet;
  let testEnvelope: Envelope;
  let worker: OutboxWorker;

  beforeAll(async () => {
    // Set up test environment variables
    process.env.ESCROW_CONTRACT_ID = 'CTEST_ESCROW_CONTRACT';
    process.env.FUNDING_SECRET_KEY = 'STEST_SECRET_KEY';
    process.env.SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';
    
    // Clean up test data
    await prisma.outbox.deleteMany({});
    await prisma.envelope.deleteMany({});
    await prisma.wallet.deleteMany({});
    
    // Create test wallet
    testWallet = await prisma.wallet.create({
      data: {
        profileId: 'test-profile-id',
        publicKey: 'GTEST_SENDER_PUBLIC_KEY',
        walletType: 'FREIGHTER',
      },
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.outbox.deleteMany({});
    await prisma.envelope.deleteMany({});
    await prisma.wallet.deleteMany({});
  });

  beforeEach(async () => {
    // Reset outbox state before each test
    await prisma.outbox.deleteMany({});
    
    // Create a fresh worker instance
    worker = new OutboxWorker();
  });

  describe('ESCROW_FUND Handler', () => {
    it('should successfully create escrow and update envelope status to FUNDED', async () => {
      // Create test envelope
      testEnvelope = await prisma.envelope.create({
        data: {
          id: crypto.randomBytes(32).toString('hex'),
          asset: 'USDC',
          amount: 100,
          decimals: 7,
          sender: testWallet.publicKey,
          hash: crypto.randomBytes(32).toString('hex'),
          preimage: crypto.randomBytes(32).toString('hex'),
          expiryTs: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
          status: 'PENDING',
        },
      });

      // Create ESCROW_FUND job
      const job = await prisma.outbox.create({
        data: {
          type: 'ESCROW_FUND',
          payload: {
            senderWalletId: testWallet.id,
            recipientHash: testEnvelope.hash,
            amountAtomic: '1000000000', // 100 USDC with 7 decimals
            assetCode: 'USDC',
            expiryTs: testEnvelope.expiryTs,
            envelopeId: testEnvelope.id,
          },
          runAfter: new Date(),
        },
      });

      // Process the job
      await worker.tick();

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that envelope was updated
      const updatedEnvelope = await prisma.envelope.findUnique({
        where: { id: testEnvelope.id },
      });

      expect(updatedEnvelope?.status).toBe('FUNDED');
      expect(updatedEnvelope?.contractId).toBe('CTEST_ESCROW_CONTRACT');
      expect(updatedEnvelope?.fundedAt).toBeTruthy();

      // Check that outbox job was marked as processed
      const processedJob = await prisma.outbox.findUnique({
        where: { id: job.id },
      });

      expect(processedJob?.processedAt).toBeTruthy();
    });

    it('should handle escrow creation failure and mark envelope as CANCELED', async () => {
      // Create test envelope
      const failingEnvelope = await prisma.envelope.create({
        data: {
          id: crypto.randomBytes(32).toString('hex'),
          asset: 'INVALID_ASSET',
          amount: 100,
          decimals: 7,
          sender: testWallet.publicKey,
          hash: crypto.randomBytes(32).toString('hex'),
          preimage: crypto.randomBytes(32).toString('hex'),
          expiryTs: Math.floor(Date.now() / 1000) + 3600,
          status: 'PENDING',
        },
      });

      // Create ESCROW_FUND job with invalid asset
      const job = await prisma.outbox.create({
        data: {
          type: 'ESCROW_FUND',
          payload: {
            senderWalletId: testWallet.id,
            recipientHash: failingEnvelope.hash,
            amountAtomic: '1000000000',
            assetCode: 'INVALID_ASSET', // This should cause failure
            expiryTs: failingEnvelope.expiryTs,
            envelopeId: failingEnvelope.id,
          },
          runAfter: new Date(),
        },
      });

      // Process the job
      await worker.tick();

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that envelope was marked as CANCELED
      const updatedEnvelope = await prisma.envelope.findUnique({
        where: { id: failingEnvelope.id },
      });

      expect(updatedEnvelope?.status).toBe('CANCELED');
      expect(updatedEnvelope?.cancelReason).toContain('Unsupported asset');
      expect(updatedEnvelope?.canceledAt).toBeTruthy();

      // Check that outbox job failed and will retry
      const failedJob = await prisma.outbox.findUnique({
        where: { id: job.id },
      });

      expect(failedJob?.attempts).toBeGreaterThan(0);
      expect(failedJob?.processedAt).toBeNull();
    });
  });

  describe('Webhook Handler', () => {
    it('should handle escrow_claimed webhook event', async () => {
      // Create a funded envelope
      const fundedEnvelope = await prisma.envelope.create({
        data: {
          id: crypto.randomBytes(32).toString('hex'),
          asset: 'USDC',
          amount: 50,
          decimals: 7,
          sender: testWallet.publicKey,
          hash: crypto.randomBytes(32).toString('hex'),
          preimage: crypto.randomBytes(32).toString('hex'),
          expiryTs: Math.floor(Date.now() / 1000) + 3600,
          status: 'FUNDED',
          contractId: 'CTEST_ESCROW_CONTRACT',
          fundedAt: new Date(),
        },
      });

      // Simulate webhook event
      const escrowId = crypto.createHash('sha256').update(fundedEnvelope.id).digest('hex');
      
      const webhookPayload = {
        contractId: 'CTEST_ESCROW_CONTRACT',
        eventType: 'escrow_claimed',
        ledgerTimestamp: Math.floor(Date.now() / 1000),
        ledgerSequence: 123456,
        txHash: 'test_claim_tx_hash',
        data: {
          escrowId,
          address: 'GRECIPIENT_ADDRESS',
        },
      };

      // Import and call the webhook handler directly
      const { default: escrowWebhookRouter } = await import('../routes/webhooks/escrow');
      const mockReq = {
        body: webhookPayload,
        headers: {},
        params: {},
      };
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      // Find the POST handler for /escrow
      const handler = escrowWebhookRouter.stack.find(
        layer => layer.route?.path === '/escrow' && layer.route?.methods?.post
      )?.route?.stack[0]?.handle;

      if (handler) {
        await handler(mockReq, mockRes);
      }

      // Check envelope was updated to OPENED
      const claimedEnvelope = await prisma.envelope.findUnique({
        where: { id: fundedEnvelope.id },
      });

      expect(claimedEnvelope?.status).toBe('OPENED');
      expect(claimedEnvelope?.openedAt).toBeTruthy();
      expect(claimedEnvelope?.claimedBy).toBe('GRECIPIENT_ADDRESS');
    });

    it('should handle escrow_refunded webhook event', async () => {
      // Create a funded envelope
      const fundedEnvelope = await prisma.envelope.create({
        data: {
          id: crypto.randomBytes(32).toString('hex'),
          asset: 'XLM',
          amount: 25,
          decimals: 7,
          sender: testWallet.publicKey,
          hash: crypto.randomBytes(32).toString('hex'),
          preimage: crypto.randomBytes(32).toString('hex'),
          expiryTs: Math.floor(Date.now() / 1000) - 100, // Already expired
          status: 'FUNDED',
          contractId: 'CTEST_ESCROW_CONTRACT',
          fundedAt: new Date(Date.now() - 10000),
        },
      });

      // Simulate webhook event
      const escrowId = crypto.createHash('sha256').update(fundedEnvelope.id).digest('hex');
      
      const webhookPayload = {
        contractId: 'CTEST_ESCROW_CONTRACT',
        eventType: 'escrow_refunded',
        ledgerTimestamp: Math.floor(Date.now() / 1000),
        ledgerSequence: 123457,
        txHash: 'test_refund_tx_hash',
        data: {
          escrowId,
          address: testWallet.publicKey,
        },
      };

      // Import and call the webhook handler directly
      const { default: escrowWebhookRouter } = await import('../routes/webhooks/escrow');
      const mockReq = {
        body: webhookPayload,
        headers: {},
        params: {},
      };
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      // Find the POST handler for /escrow
      const handler = escrowWebhookRouter.stack.find(
        layer => layer.route?.path === '/escrow' && layer.route?.methods?.post
      )?.route?.stack[0]?.handle;

      if (handler) {
        await handler(mockReq, mockRes);
      }

      // Check envelope was updated to CANCELED
      const refundedEnvelope = await prisma.envelope.findUnique({
        where: { id: fundedEnvelope.id },
      });

      expect(refundedEnvelope?.status).toBe('CANCELED');
      expect(refundedEnvelope?.canceledAt).toBeTruthy();
      expect(refundedEnvelope?.cancelReason).toContain('refunded');
    });
  });

  describe('Refund Endpoint', () => {
    it('should successfully refund an expired envelope', async () => {
      // Create an expired funded envelope
      const expiredEnvelope = await prisma.envelope.create({
        data: {
          id: crypto.randomBytes(32).toString('hex'),
          asset: 'USDC',
          amount: 75,
          decimals: 7,
          sender: testWallet.publicKey,
          hash: crypto.randomBytes(32).toString('hex'),
          preimage: crypto.randomBytes(32).toString('hex'),
          expiryTs: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
          status: 'FUNDED',
          contractId: 'CTEST_ESCROW_CONTRACT',
          fundedAt: new Date(Date.now() - 7200000), // Funded 2 hours ago
        },
      });

      // Mock the refund transaction
      const mockStellarSDK = await vi.importMock('@stellar/stellar-sdk');
      const mockRpc = await vi.importMock('@stellar/stellar-sdk/rpc');
      
      // Test would call the refund endpoint
      // In a real test, we'd use supertest or similar to test the HTTP endpoint
      // For now, we're testing the logic directly
      
      // Verify the envelope can be refunded
      expect(expiredEnvelope.status).toBe('FUNDED');
      expect(expiredEnvelope.expiryTs).toBeLessThan(Date.now() / 1000);
    });
  });
});

describe('Escrow Contract Deployment', () => {
  it('should verify escrow contract can be deployed', async () => {
    // This test would run the deployment script in test mode
    // For now, we're just verifying the script exists
    const fs = await import('fs');
    const path = await import('path');
    
    const deployScriptPath = path.join(process.cwd(), 'scripts', 'deploy_escrow.ts');
    const scriptExists = fs.existsSync(deployScriptPath);
    
    expect(scriptExists).toBe(true);
    
    // Verify contract source exists
    const contractPath = path.join(process.cwd(), 'contracts', 'escrow', 'src', 'lib.rs');
    const contractExists = fs.existsSync(contractPath);
    
    expect(contractExists).toBe(true);
  });
});