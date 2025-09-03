import { describe, it, expect, beforeEach, vi } from 'vitest';

// Define WalletType enum for tests
enum WalletType {
  HOT = 'HOT',
  HARDWARE = 'HARDWARE',
  CONTRACT = 'CONTRACT'
}

// Mock both the prisma client and WalletType
vi.mock('../db/client', () => ({
  prisma: {
    wallet: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock @prisma/client to provide WalletType enum
vi.mock('@prisma/client', () => ({
  WalletType: {
    HOT: 'HOT',
    HARDWARE: 'HARDWARE',
    CONTRACT: 'CONTRACT'
  }
}));

// Import after mocking
import { getPrimaryWallet, createWallet, getUserWallets, findOrCreateUserWithWallet } from '../services/wallet';
import { prisma } from '../db/client';

// Type cast prisma for test usage
const mockPrisma = prisma as any;

describe('Wallet Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPrimaryWallet', () => {
    it('should return the first HOT wallet for a user', async () => {
      const mockWallet = {
        id: 'wallet1',
        userId: 'user1',
        publicKey: 'GDTEST123...',
        type: WalletType.HOT,
        createdAt: new Date('2025-01-01'),
      };

      mockPrisma.wallet.findFirst.mockResolvedValue(mockWallet);

      const result = await getPrimaryWallet('user1');

      expect(mockPrisma.wallet.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user1',
          type: WalletType.HOT,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
      expect(result).toEqual(mockWallet);
    });

    it('should throw an error if no primary wallet is found', async () => {
      mockPrisma.wallet.findFirst.mockResolvedValue(null);

      await expect(getPrimaryWallet('user1')).rejects.toThrow(
        'No primary wallet found for user user1'
      );
    });
  });

  describe('createWallet', () => {
    it('should create a new wallet with default HOT type', async () => {
      const mockWallet = {
        id: 'wallet1',
        userId: 'user1',
        publicKey: 'GDTEST123...',
        type: WalletType.HOT,
        createdAt: new Date(),
      };

      mockPrisma.wallet.create.mockResolvedValue(mockWallet);

      const result = await createWallet('user1', 'GDTEST123...');

      expect(mockPrisma.wallet.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          publicKey: 'GDTEST123...',
          type: WalletType.HOT,
        },
      });
      expect(result).toEqual(mockWallet);
    });

    it('should create a wallet with specified type', async () => {
      const mockWallet = {
        id: 'wallet1',
        userId: 'user1',
        publicKey: 'GDTEST123...',
        type: WalletType.HARDWARE,
        createdAt: new Date(),
      };

      mockPrisma.wallet.create.mockResolvedValue(mockWallet);

      const result = await createWallet('user1', 'GDTEST123...', WalletType.HARDWARE);

      expect(mockPrisma.wallet.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          publicKey: 'GDTEST123...',
          type: WalletType.HARDWARE,
        },
      });
      expect(result).toEqual(mockWallet);
    });
  });

  describe('getUserWallets', () => {
    it('should return all wallets for a user ordered by createdAt', async () => {
      const mockWallets = [
        {
          id: 'wallet1',
          userId: 'user1',
          publicKey: 'GDTEST123...',
          type: WalletType.HOT,
          createdAt: new Date('2025-01-01'),
        },
        {
          id: 'wallet2',
          userId: 'user1',
          publicKey: 'GDTEST456...',
          type: WalletType.HARDWARE,
          createdAt: new Date('2025-01-02'),
        },
      ];

      mockPrisma.wallet.findMany.mockResolvedValue(mockWallets);

      const result = await getUserWallets('user1');

      expect(mockPrisma.wallet.findMany).toHaveBeenCalledWith({
        where: { userId: 'user1' },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toEqual(mockWallets);
    });
  });

  describe('findOrCreateUserWithWallet', () => {
    it('should return existing wallet and user if wallet exists', async () => {
      const mockUser = {
        id: 'user1',
        publicKey: 'GDTEST123...',
        credits: 100,
      };
      const mockWallet = {
        id: 'wallet1',
        userId: 'user1',
        publicKey: 'GDTEST123...',
        type: WalletType.HOT,
        createdAt: new Date(),
        user: mockUser,
      };

      mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);

      const result = await findOrCreateUserWithWallet('GDTEST123...');

      expect(mockPrisma.wallet.findUnique).toHaveBeenCalledWith({
        where: { publicKey: 'GDTEST123...' },
        include: { user: true },
      });
      expect(result).toEqual({ user: mockUser, wallet: mockWallet });
    });

    it('should create user and wallet if neither exists', async () => {
      const mockUser = {
        id: 'user1',
        publicKey: 'GDTEST123...',
        credits: 0,
      };
      const mockWallet = {
        id: 'wallet1',
        userId: 'user1',
        publicKey: 'GDTEST123...',
        type: WalletType.HOT,
        createdAt: new Date(),
      };

      mockPrisma.wallet.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.wallet.create.mockResolvedValue(mockWallet);

      const result = await findOrCreateUserWithWallet('GDTEST123...');

      expect(mockPrisma.wallet.findUnique).toHaveBeenCalledWith({
        where: { publicKey: 'GDTEST123...' },
        include: { user: true },
      });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { publicKey: 'GDTEST123...' },
      });
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          publicKey: 'GDTEST123...',
          credits: 0,
        },
      });
      expect(mockPrisma.wallet.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          publicKey: 'GDTEST123...',
          type: WalletType.HOT,
        },
      });
      expect(result).toEqual({ user: mockUser, wallet: mockWallet });
    });

    it('should create wallet for existing user', async () => {
      const mockUser = {
        id: 'user1',
        publicKey: 'GDTEST123...',
        credits: 50,
      };
      const mockWallet = {
        id: 'wallet1',
        userId: 'user1',
        publicKey: 'GDTEST123...',
        type: WalletType.HOT,
        createdAt: new Date(),
      };

      mockPrisma.wallet.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.wallet.create.mockResolvedValue(mockWallet);

      const result = await findOrCreateUserWithWallet('GDTEST123...');

      expect(mockPrisma.wallet.findUnique).toHaveBeenCalledWith({
        where: { publicKey: 'GDTEST123...' },
        include: { user: true },
      });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { publicKey: 'GDTEST123...' },
      });
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(mockPrisma.wallet.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          publicKey: 'GDTEST123...',
          type: WalletType.HOT,
        },
      });
      expect(result).toEqual({ user: mockUser, wallet: mockWallet });
    });
  });

  describe('Prisma validation errors', () => {
    it('should handle duplicate publicKey error', async () => {
      const prismaError: any = new Error('Unique constraint failed on the fields: (`publicKey`)');
      prismaError.code = 'P2002';

      mockPrisma.wallet.create.mockRejectedValue(prismaError);

      await expect(createWallet('user1', 'GDTEST123...')).rejects.toThrow(
        'Unique constraint failed on the fields: (`publicKey`)'
      );
    });
  });
});