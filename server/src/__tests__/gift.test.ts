import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GiftService, GiftMode, AssetCode } from '../services/gift';
import { prisma } from '../db/client';

// Mock Prisma client
vi.mock('../db/client', () => ({
  prisma: {
    $transaction: vi.fn(),
    envelope: {
      create: vi.fn(),
      createMany: vi.fn(),
    },
    wallet: {
      findUnique: vi.fn(),
    },
    emailInvite: {
      create: vi.fn(),
      createMany: vi.fn(),
    },
    outbox: {
      create: vi.fn(),
      createMany: vi.fn(),
    },
    qrCode: {
      create: vi.fn(),
    },
    qrEvent: {
      create: vi.fn(),
    },
  },
}));

describe('GiftService', () => {
  let giftService: GiftService;
  
  beforeEach(() => {
    giftService = new GiftService();
    vi.clearAllMocks();
  });

  describe('SINGLE mode', () => {
    it('should create a single envelope for a wallet address', async () => {
      const mockWallet = {
        id: 'wallet-123',
        publicKey: 'GSENDER_PUBLIC_KEY',
      };

      const mockEnvelope = {
        id: 'envelope-123',
        status: 'PENDING',
      };

      vi.mocked(prisma.wallet.findUnique).mockResolvedValue(mockWallet as any);
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        const tx = {
          envelope: {
            create: vi.fn().mockResolvedValue(mockEnvelope),
          },
          outbox: {
            create: vi.fn(),
          },
        };
        return fn(tx);
      });

      const result = await giftService.create({
        mode: GiftMode.SINGLE,
        recipients: ['GRECIPIENT_PUBLIC_KEY'],
        amountAtomic: '1000000000',
        assetCode: AssetCode.USDC,
        expiryTs: Math.floor(Date.now() / 1000) + 3600,
        senderWalletId: 'wallet-123',
      });

      expect(result.mode).toBe(GiftMode.SINGLE);
      expect(result.envelopeIds).toHaveLength(1);
      expect(result.totalAmount).toBe('1000000000');
      expect(result.recipientCount).toBe(1);
    });

    it('should create email invite for email recipient', async () => {
      const mockWallet = {
        id: 'wallet-123',
        publicKey: 'GSENDER_PUBLIC_KEY',
      };

      vi.mocked(prisma.wallet.findUnique).mockResolvedValue(mockWallet as any);
      
      let emailInviteCreated = false;
      let emailJobQueued = false;
      
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        const tx = {
          envelope: {
            create: vi.fn().mockResolvedValue({ id: 'env-123' }),
          },
          emailInvite: {
            create: vi.fn().mockImplementation(() => {
              emailInviteCreated = true;
              return Promise.resolve();
            }),
          },
          outbox: {
            create: vi.fn().mockImplementation((data) => {
              if (data.data.type === 'EMAIL_SEND') {
                emailJobQueued = true;
              }
              return Promise.resolve();
            }),
          },
        };
        return fn(tx);
      });

      await giftService.create({
        mode: GiftMode.SINGLE,
        recipients: ['user@example.com'],
        amountAtomic: '500000000',
        assetCode: AssetCode.XLM,
        expiryTs: Math.floor(Date.now() / 1000) + 3600,
        senderWalletId: 'wallet-123',
      });

      expect(emailInviteCreated).toBe(true);
      expect(emailJobQueued).toBe(true);
    });

    it('should throw error if more than one recipient for SINGLE mode', async () => {
      await expect(
        giftService.create({
          mode: GiftMode.SINGLE,
          recipients: ['recipient1', 'recipient2'],
          amountAtomic: '1000000000',
          assetCode: AssetCode.USDC,
          expiryTs: Math.floor(Date.now() / 1000) + 3600,
          senderWalletId: 'wallet-123',
        })
      ).rejects.toThrow('SINGLE mode requires exactly one recipient');
    });
  });

  describe('MULTI mode', () => {
    it('should create multiple envelopes for multiple recipients', async () => {
      const mockWallet = {
        id: 'wallet-123',
        publicKey: 'GSENDER_PUBLIC_KEY',
      };

      vi.mocked(prisma.wallet.findUnique).mockResolvedValue(mockWallet as any);
      
      const envelopesCreated: any[] = [];
      
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        const tx = {
          envelope: {
            createMany: vi.fn().mockImplementation((params) => {
              envelopesCreated.push(...params.data);
              return Promise.resolve();
            }),
          },
          emailInvite: {
            createMany: vi.fn(),
          },
          outbox: {
            createMany: vi.fn(),
          },
        };
        return fn(tx);
      });

      const result = await giftService.create({
        mode: GiftMode.MULTI,
        recipients: ['GRECIPIENT1', 'GRECIPIENT2', 'GRECIPIENT3'],
        amountAtomic: '3000000000', // 3000 USDC total
        assetCode: AssetCode.USDC,
        expiryTs: Math.floor(Date.now() / 1000) + 3600,
        senderWalletId: 'wallet-123',
      });

      expect(result.mode).toBe(GiftMode.MULTI);
      expect(result.envelopeIds).toHaveLength(3);
      expect(result.totalAmount).toBe('3000000000');
      expect(result.recipientCount).toBe(3);
      expect(envelopesCreated).toHaveLength(3);
      
      // Each recipient should get 1000 USDC
      envelopesCreated.forEach(env => {
        expect(env.amount.toString()).toBe('1000000000');
      });
    });

    it('should handle mixed wallet and email recipients', async () => {
      const mockWallet = {
        id: 'wallet-123',
        publicKey: 'GSENDER_PUBLIC_KEY',
      };

      vi.mocked(prisma.wallet.findUnique).mockResolvedValue(mockWallet as any);
      
      let emailInvitesCount = 0;
      
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        const tx = {
          envelope: {
            createMany: vi.fn(),
          },
          emailInvite: {
            createMany: vi.fn().mockImplementation((params) => {
              emailInvitesCount = params.data.length;
              return Promise.resolve();
            }),
          },
          outbox: {
            createMany: vi.fn(),
          },
        };
        return fn(tx);
      });

      await giftService.create({
        mode: GiftMode.MULTI,
        recipients: ['GWALLET1', 'email1@test.com', 'GWALLET2', 'email2@test.com'],
        amountAtomic: '4000000000',
        assetCode: AssetCode.XLM,
        expiryTs: Math.floor(Date.now() / 1000) + 3600,
        senderWalletId: 'wallet-123',
      });

      expect(emailInvitesCount).toBe(2); // Two email recipients
    });

    it('should throw error if less than 2 recipients for MULTI mode', async () => {
      await expect(
        giftService.create({
          mode: GiftMode.MULTI,
          recipients: ['recipient1'],
          amountAtomic: '1000000000',
          assetCode: AssetCode.USDC,
          expiryTs: Math.floor(Date.now() / 1000) + 3600,
          senderWalletId: 'wallet-123',
        })
      ).rejects.toThrow('MULTI mode requires at least 2 recipients');
    });
  });

  describe('POOL mode', () => {
    it('should create a pool with QR code and pre-created envelopes', async () => {
      const mockWallet = {
        id: 'wallet-123',
        publicKey: 'GSENDER_PUBLIC_KEY',
      };

      vi.mocked(prisma.wallet.findUnique).mockResolvedValue(mockWallet as any);
      
      let qrCodeCreated = false;
      let envelopesCount = 0;
      let qrEventsCreated = 0;
      
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        const tx = {
          qrCode: {
            create: vi.fn().mockImplementation(() => {
              qrCodeCreated = true;
              return Promise.resolve({ id: 'qr-123' });
            }),
          },
          envelope: {
            createMany: vi.fn().mockImplementation((params) => {
              envelopesCount = params.data.length;
              return Promise.resolve();
            }),
          },
          qrEvent: {
            create: vi.fn().mockImplementation(() => {
              qrEventsCreated++;
              return Promise.resolve();
            }),
          },
          outbox: {
            createMany: vi.fn(),
          },
        };
        return fn(tx);
      });

      const result = await giftService.create({
        mode: GiftMode.POOL,
        recipients: [], // Pool doesn't require initial recipients
        amountAtomic: '5000000000', // 5000 USDC total
        assetCode: AssetCode.USDC,
        expiryTs: Math.floor(Date.now() / 1000) + 3600,
        poolSize: 10, // 10 people can claim
        senderWalletId: 'wallet-123',
      });

      expect(result.mode).toBe(GiftMode.POOL);
      expect(result.qrCodeId).toBeDefined();
      expect(result.poolId).toBeDefined();
      expect(result.totalAmount).toBe('5000000000');
      expect(result.recipientCount).toBe(10);
      expect(qrCodeCreated).toBe(true);
      expect(envelopesCount).toBe(10);
      expect(qrEventsCreated).toBe(10);
    });

    it('should throw error if poolSize is missing', async () => {
      await expect(
        giftService.create({
          mode: GiftMode.POOL,
          recipients: [],
          amountAtomic: '1000000000',
          assetCode: AssetCode.USDC,
          expiryTs: Math.floor(Date.now() / 1000) + 3600,
          senderWalletId: 'wallet-123',
          // poolSize missing
        })
      ).rejects.toThrow('POOL mode requires poolSize parameter');
    });

    it('should throw error if poolSize is less than 2', async () => {
      await expect(
        giftService.create({
          mode: GiftMode.POOL,
          recipients: [],
          amountAtomic: '1000000000',
          assetCode: AssetCode.USDC,
          expiryTs: Math.floor(Date.now() / 1000) + 3600,
          senderWalletId: 'wallet-123',
          poolSize: 1,
        })
      ).rejects.toThrow('Pool size must be at least 2');
    });
  });

  describe('Error handling', () => {
    it('should throw error if wallet not found', async () => {
      vi.mocked(prisma.wallet.findUnique).mockResolvedValue(null);

      await expect(
        giftService.create({
          mode: GiftMode.SINGLE,
          recipients: ['GRECIPIENT'],
          amountAtomic: '1000000000',
          assetCode: AssetCode.USDC,
          expiryTs: Math.floor(Date.now() / 1000) + 3600,
          senderWalletId: 'nonexistent-wallet',
        })
      ).rejects.toThrow('Wallet not found');
    });

    it('should validate input schema', async () => {
      await expect(
        giftService.create({
          mode: 'INVALID_MODE' as any,
          recipients: ['GRECIPIENT'],
          amountAtomic: '1000000000',
          assetCode: AssetCode.USDC,
          expiryTs: Math.floor(Date.now() / 1000) + 3600,
          senderWalletId: 'wallet-123',
        })
      ).rejects.toThrow();
    });

    it('should validate amountAtomic is numeric string', async () => {
      await expect(
        giftService.create({
          mode: GiftMode.SINGLE,
          recipients: ['GRECIPIENT'],
          amountAtomic: 'not-a-number',
          assetCode: AssetCode.USDC,
          expiryTs: Math.floor(Date.now() / 1000) + 3600,
          senderWalletId: 'wallet-123',
        })
      ).rejects.toThrow();
    });
  });
});