import { prisma } from '../db/client';
import { Envelope, QrCode, Outbox, Prisma } from '@prisma/client';
import crypto from 'crypto';
import { z } from 'zod';

// Gift modes
export enum GiftMode {
  SINGLE = 'SINGLE',   // One-off envelope to single recipient
  MULTI = 'MULTI',     // Multiple envelopes to multiple recipients
  POOL = 'POOL',       // Single pool that multiple recipients can claim from
}

// Supported assets
export enum AssetCode {
  USDC = 'USDC',
  XLM = 'XLM',
}

// Gift creation input schema
export const CreateGiftInputSchema = z.object({
  mode: z.nativeEnum(GiftMode),
  recipients: z.array(z.string()).min(1).max(100), // wallet addresses or emails
  amountAtomic: z.string().regex(/^\d+$/), // BigInt as string
  assetCode: z.nativeEnum(AssetCode),
  expiryTs: z.number().int().positive(),
  poolSize: z.number().int().positive().optional(), // Required for POOL mode
  message: z.string().max(280).optional(),
  senderWalletId: z.string(),
  attachNft: z.boolean().optional().default(false),
});

export type CreateGiftInput = z.infer<typeof CreateGiftInputSchema>;

// Gift creation result
export interface CreateGiftResult {
  mode: GiftMode;
  envelopeIds?: string[];
  qrCodeId?: string;
  poolId?: string;
  totalAmount: string;
  recipientCount: number;
  expiryTs: number;
}

/**
 * Unified gift service for all envelope creation modes
 */
export class GiftService {
  /**
   * Create gifts based on mode (SINGLE, MULTI, or POOL)
   */
  async create(input: CreateGiftInput): Promise<CreateGiftResult> {
    // Validate input
    const validated = CreateGiftInputSchema.parse(input);
    
    // Route to appropriate handler based on mode
    switch (validated.mode) {
      case GiftMode.SINGLE:
        return this.createSingle(validated);
      
      case GiftMode.MULTI:
        return this.createMulti(validated);
      
      case GiftMode.POOL:
        return this.createPool(validated);
      
      default:
        throw new Error(`Unsupported gift mode: ${validated.mode}`);
    }
  }

  /**
   * Create a single envelope for one recipient
   */
  private async createSingle(input: CreateGiftInput): Promise<CreateGiftResult> {
    if (input.recipients.length !== 1) {
      throw new Error('SINGLE mode requires exactly one recipient');
    }

    const recipient = input.recipients[0];
    const envelopeId = this.generateId();
    const preimage = this.generatePreimage();
    const hash = this.sha256(preimage);

    // Check if recipient is email or wallet address
    const isEmail = recipient.includes('@');
    
    // Create envelope in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create envelope
      const envelope = await tx.envelope.create({
        data: {
          id: envelopeId,
          asset: input.assetCode,
          amount: BigInt(input.amountAtomic),
          decimals: input.assetCode === AssetCode.USDC ? 7 : 7, // Both use 7 decimals
          sender: await this.getSenderAddress(input.senderWalletId),
          recipient: isEmail ? null : recipient,
          hash,
          preimage,
          expiryTs: input.expiryTs,
          status: 'PENDING',
          message: input.message,
          attachNft: input.attachNft,
        },
      });

      // If email recipient, create email invite
      if (isEmail) {
        await tx.emailInvite.create({
          data: {
            id: crypto.randomUUID(),
            email: recipient,
            envelopeId: envelope.id,
            status: 'PENDING',
          },
        });

        // Queue email send
        await tx.outbox.create({
          data: {
            type: 'EMAIL_SEND',
            payload: {
              template: 'invite',
              to: recipient,
              data: {
                envelopeId: envelope.id,
                preimage,
                amount: input.amountAtomic,
                assetCode: input.assetCode,
                message: input.message,
                expiryTs: input.expiryTs,
              },
            },
            runAfter: new Date(),
          },
        });
      }

      // Queue escrow funding
      await tx.outbox.create({
        data: {
          type: 'ESCROW_FUND',
          payload: {
            senderWalletId: input.senderWalletId,
            recipientHash: hash,
            amountAtomic: input.amountAtomic,
            assetCode: input.assetCode,
            expiryTs: input.expiryTs,
            envelopeId: envelope.id,
          },
          runAfter: new Date(),
        },
      });

      return envelope;
    });

    return {
      mode: GiftMode.SINGLE,
      envelopeIds: [result.id],
      totalAmount: input.amountAtomic,
      recipientCount: 1,
      expiryTs: input.expiryTs,
    };
  }

  /**
   * Create multiple envelopes for multiple recipients
   */
  private async createMulti(input: CreateGiftInput): Promise<CreateGiftResult> {
    if (input.recipients.length < 2) {
      throw new Error('MULTI mode requires at least 2 recipients');
    }

    const envelopes: Envelope[] = [];
    const outboxJobs: Prisma.OutboxCreateManyInput[] = [];
    const emailInvites: Prisma.EmailInviteCreateManyInput[] = [];
    
    // Calculate amount per recipient
    const totalAmountBigInt = BigInt(input.amountAtomic);
    const perRecipientAmount = totalAmountBigInt / BigInt(input.recipients.length);
    const senderAddress = await this.getSenderAddress(input.senderWalletId);

    // Prepare data for all envelopes
    for (const recipient of input.recipients) {
      const envelopeId = this.generateId();
      const preimage = this.generatePreimage();
      const hash = this.sha256(preimage);
      const isEmail = recipient.includes('@');

      // Prepare envelope data
      envelopes.push({
        id: envelopeId,
        asset: input.assetCode as any,
        amount: new Prisma.Decimal(perRecipientAmount.toString()),
        decimals: 7,
        sender: senderAddress,
        recipient: isEmail ? null : recipient,
        hash,
        preimage,
        expiryTs: input.expiryTs,
        status: 'PENDING' as any,
        message: input.message || null,
        attachNft: input.attachNft || false,
        contractId: null,
        fundedAt: null,
        openedAt: null,
        canceledAt: null,
        cancelReason: null,
        claimedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Prepare email invite if needed
      if (isEmail) {
        emailInvites.push({
          id: crypto.randomUUID(),
          email: recipient,
          envelopeId,
          status: 'PENDING',
          sentAt: null,
          claimedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Queue email send
        outboxJobs.push({
          type: 'EMAIL_SEND',
          payload: {
            template: 'invite',
            to: recipient,
            data: {
              envelopeId,
              preimage,
              amount: perRecipientAmount.toString(),
              assetCode: input.assetCode,
              message: input.message,
              expiryTs: input.expiryTs,
            },
          } as any,
          runAfter: new Date(),
          attempts: 0,
          lockedBy: null,
          lockedAt: null,
          processedAt: null,
          failedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Queue escrow funding
      outboxJobs.push({
        type: 'ESCROW_FUND',
        payload: {
          senderWalletId: input.senderWalletId,
          recipientHash: hash,
          amountAtomic: perRecipientAmount.toString(),
          assetCode: input.assetCode,
          expiryTs: input.expiryTs,
          envelopeId,
        } as any,
        runAfter: new Date(),
        attempts: 0,
        lockedBy: null,
        lockedAt: null,
        processedAt: null,
        failedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Create all envelopes in a transaction
    await prisma.$transaction(async (tx) => {
      // Create all envelopes
      await tx.envelope.createMany({
        data: envelopes,
      });

      // Create email invites if any
      if (emailInvites.length > 0) {
        await tx.emailInvite.createMany({
          data: emailInvites,
        });
      }

      // Create all outbox jobs
      await tx.outbox.createMany({
        data: outboxJobs,
      });
    });

    return {
      mode: GiftMode.MULTI,
      envelopeIds: envelopes.map(e => e.id),
      totalAmount: input.amountAtomic,
      recipientCount: input.recipients.length,
      expiryTs: input.expiryTs,
    };
  }

  /**
   * Create a pool that multiple recipients can claim from
   */
  private async createPool(input: CreateGiftInput): Promise<CreateGiftResult> {
    if (!input.poolSize) {
      throw new Error('POOL mode requires poolSize parameter');
    }

    if (input.poolSize < 2) {
      throw new Error('Pool size must be at least 2');
    }

    // For pools, we create a QR code that can be scanned multiple times
    const qrCodeId = crypto.randomUUID();
    const poolId = this.generateId();
    const senderAddress = await this.getSenderAddress(input.senderWalletId);
    
    // Calculate amount per claim
    const totalAmountBigInt = BigInt(input.amountAtomic);
    const perClaimAmount = totalAmountBigInt / BigInt(input.poolSize);

    // Create pool structure in transaction
    await prisma.$transaction(async (tx) => {
      // Create QR code for the pool
      const qrCode = await tx.qrCode.create({
        data: {
          id: qrCodeId,
          projectId: poolId, // Use poolId as projectId for tracking
          description: `Pool gift: ${input.poolSize} claims of ${perClaimAmount.toString()} ${input.assetCode}`,
          maxUses: input.poolSize,
          currentUses: 0,
          expiresAt: new Date(input.expiryTs * 1000),
          isActive: true,
          metadata: {
            poolId,
            assetCode: input.assetCode,
            perClaimAmount: perClaimAmount.toString(),
            totalAmount: input.amountAtomic,
            message: input.message,
            attachNft: input.attachNft,
          } as any,
        },
      });

      // Pre-create envelopes for each potential claim
      const envelopes: Prisma.EnvelopeCreateManyInput[] = [];
      const escrowJobs: Prisma.OutboxCreateManyInput[] = [];

      for (let i = 0; i < input.poolSize; i++) {
        const envelopeId = this.generateId();
        const preimage = this.generatePreimage();
        const hash = this.sha256(preimage);

        envelopes.push({
          id: envelopeId,
          asset: input.assetCode as any,
          amount: new Prisma.Decimal(perClaimAmount.toString()),
          decimals: 7,
          sender: senderAddress,
          recipient: null, // Will be set when claimed
          hash,
          preimage,
          expiryTs: input.expiryTs,
          status: 'PENDING',
          message: input.message || null,
          attachNft: input.attachNft || false,
          contractId: null,
          fundedAt: null,
          openedAt: null,
          canceledAt: null,
          cancelReason: null,
          claimedBy: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Queue escrow funding for each envelope
        escrowJobs.push({
          type: 'ESCROW_FUND',
          payload: {
            senderWalletId: input.senderWalletId,
            recipientHash: hash,
            amountAtomic: perClaimAmount.toString(),
            assetCode: input.assetCode,
            expiryTs: input.expiryTs,
            envelopeId,
          } as any,
          runAfter: new Date(Date.now() + i * 100), // Stagger funding jobs
          attempts: 0,
          lockedBy: null,
          lockedAt: null,
          processedAt: null,
          failedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Create QR event to track which envelope belongs to which QR scan
        await tx.qrEvent.create({
          data: {
            id: crypto.randomUUID(),
            qrCodeId,
            envelopeId,
            eventType: 'POOL_ENVELOPE_CREATED',
            metadata: {
              claimIndex: i + 1,
              poolSize: input.poolSize,
            } as any,
          },
        });
      }

      // Create all envelopes
      await tx.envelope.createMany({
        data: envelopes,
      });

      // Create all escrow funding jobs
      await tx.outbox.createMany({
        data: escrowJobs,
      });
    });

    return {
      mode: GiftMode.POOL,
      qrCodeId,
      poolId,
      totalAmount: input.amountAtomic,
      recipientCount: input.poolSize,
      expiryTs: input.expiryTs,
    };
  }

  /**
   * Get sender address from wallet ID
   */
  private async getSenderAddress(walletId: string): Promise<string> {
    const wallet = await prisma.wallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new Error(`Wallet not found: ${walletId}`);
    }

    return wallet.publicKey;
  }

  /**
   * Generate a random 32-byte ID
   */
  private generateId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate a random preimage
   */
  private generatePreimage(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Calculate SHA256 hash
   */
  private sha256(data: string): string {
    return crypto.createHash('sha256').update(data, 'hex').digest('hex');
  }
}

// Export singleton instance
export const giftService = new GiftService();