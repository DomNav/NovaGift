import { prisma } from '../db/client';
import { Outbox } from '@prisma/client';
import { hostname } from 'os';
import { sendInviteEmail } from '../../lib/email';
import { Resend } from 'resend';
import { 
  TransactionBuilder, 
  Operation, 
  Address, 
  nativeToScVal,
  Networks,
  BASE_FEE,
  Keypair
} from '@stellar/stellar-sdk';
import { Server as SorobanServer } from '@stellar/stellar-sdk/rpc';
import crypto from 'crypto';

const WORKER_ID = `${hostname()}-${process.pid}`;
const BATCH_SIZE = 20;
const POLL_INTERVAL = 2000; // 2 seconds
const MAX_ATTEMPTS = 5;
const LOCK_TIMEOUT_MS = 60000; // 1 minute

// Initialize email service if configured
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'NovaGift <noreply@novagift.dev>';
const resend = RESEND_API_KEY && RESEND_API_KEY !== 're_dummy_key_for_testing' 
  ? new Resend(RESEND_API_KEY) 
  : null;

// Stellar/Soroban configuration
const SOROBAN_RPC_URL = process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';
const ESCROW_CONTRACT_ID = process.env.ESCROW_CONTRACT_ID || '';
const FUNDING_SECRET_KEY = process.env.FUNDING_SECRET_KEY || process.env.SOROBAN_ACCOUNT || '';

// Initialize Soroban server when needed
let sorobanServerInstance: SorobanServer | null = null;

function getSorobanServer(): SorobanServer {
  if (!sorobanServerInstance) {
    sorobanServerInstance = new SorobanServer(SOROBAN_RPC_URL);
  }
  return sorobanServerInstance;
}

/**
 * Outbox pattern worker for durable, idempotent side-effect handling
 * Processes jobs from the Outbox table with retry logic
 */
export class OutboxWorker {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Start the outbox worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[Outbox] Worker already running');
      return;
    }

    console.log(`[Outbox] Starting worker (${WORKER_ID})`);
    this.isRunning = true;

    // Initial tick
    await this.tick();

    // Schedule periodic ticks
    this.intervalId = setInterval(async () => {
      if (this.isRunning) {
        await this.tick();
      }
    }, POLL_INTERVAL);
  }

  /**
   * Stop the outbox worker
   */
  stop(): void {
    console.log('[Outbox] Stopping worker');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Process a single batch of jobs
   */
  async tick(): Promise<void> {
    try {
      // Release stale locks
      await this.releaseStaleLocks();

      // Lock and fetch jobs
      const jobs = await this.lockJobs();

      if (jobs.length === 0) {
        return;
      }

      console.log(`[Outbox] Processing ${jobs.length} jobs`);

      // Process jobs in parallel
      await Promise.all(jobs.map(job => this.processJob(job)));
    } catch (error) {
      console.error('[Outbox] Tick failed:', error);
    }
  }

  /**
   * Release locks that have been held too long
   */
  private async releaseStaleLocks(): Promise<void> {
    const staleTime = new Date(Date.now() - LOCK_TIMEOUT_MS);

    await prisma.outbox.updateMany({
      where: {
        lockedAt: { lt: staleTime },
        processedAt: null,
        failedAt: null
      },
      data: {
        lockedBy: null,
        lockedAt: null
      }
    });
  }

  /**
   * Lock and fetch jobs ready for processing
   */
  private async lockJobs(): Promise<Outbox[]> {
    const now = new Date();

    // Find unlocked jobs ready to run
    const jobsToLock = await prisma.outbox.findMany({
      where: {
        runAfter: { lte: now },
        lockedBy: null,
        processedAt: null,
        failedAt: null,
        attempts: { lt: MAX_ATTEMPTS }
      },
      orderBy: [
        { runAfter: 'asc' },
        { createdAt: 'asc' }
      ],
      take: BATCH_SIZE
    });

    if (jobsToLock.length === 0) {
      return [];
    }

    // Lock the jobs
    const jobIds = jobsToLock.map(j => j.id);
    await prisma.outbox.updateMany({
      where: {
        id: { in: jobIds },
        lockedBy: null // Double-check to prevent race conditions
      },
      data: {
        lockedBy: WORKER_ID,
        lockedAt: now
      }
    });

    // Fetch the locked jobs
    return prisma.outbox.findMany({
      where: {
        id: { in: jobIds },
        lockedBy: WORKER_ID
      }
    });
  }

  /**
   * Process a single job
   */
  private async processJob(job: Outbox): Promise<void> {
    try {
      console.log(`[Outbox] Processing job ${job.id} (type: ${job.type}, attempt: ${job.attempts + 1})`);

      // Route to appropriate handler
      await this.handleJob(job);

      // Mark as processed
      await prisma.outbox.update({
        where: { id: job.id },
        data: {
          processedAt: new Date(),
          lockedBy: null,
          lockedAt: null
        }
      });

      console.log(`[Outbox] Job ${job.id} completed successfully`);
    } catch (error) {
      console.error(`[Outbox] Job ${job.id} failed:`, error);
      await this.handleJobError(job, error);
    }
  }

  /**
   * Route job to appropriate handler based on type
   */
  private async handleJob(job: Outbox): Promise<void> {
    const payload = job.payload as any;

    switch (job.type) {
      case 'EMAIL_SEND':
        await this.handleEmailSend(payload);
        break;
      
      case 'PUSH_SEND':
        await this.handlePushSend(payload);
        break;
      
      case 'ESCROW_FUND':
        await this.handleEscrowFund(payload);
        break;
      
      case 'NFT_MINT':
        // Stub for future implementation
        console.log('[Outbox] NFT_MINT handler not implemented yet', payload);
        break;
      
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  }

  /**
   * Handle email send job
   */
  private async handleEmailSend(payload: any): Promise<void> {
    const { template, to, data } = payload;
    
    console.log(`[Outbox] Sending ${template} email to ${to}`);
    
    if (!resend) {
      console.log('[Outbox] Email service not configured, skipping send');
      return;
    }
    
    try {
      switch (template) {
        case 'invite':
          // Use the existing sendInviteEmail function for invite emails
          await sendInviteEmail(data);
          break;
          
        case 'walletless_claim':
          // Send simple HTML email for walletless claims
          const { data: emailData, error } = await resend.emails.send({
            from: EMAIL_FROM,
            to,
            subject: data.subject || 'NovaGift Notification',
            html: data.html,
          });
          
          if (error) {
            throw new Error(`Email send failed: ${error.message}`);
          }
          
          console.log(`[Outbox] Email sent successfully: ${emailData?.id}`);
          break;
          
        default:
          // Generic email send
          const { data: genericData, error: genericError } = await resend.emails.send({
            from: EMAIL_FROM,
            to,
            subject: data.subject || 'NovaGift Notification',
            html: data.html || '<p>You have a notification from NovaGift</p>',
            text: data.text,
          });
          
          if (genericError) {
            throw new Error(`Email send failed: ${genericError.message}`);
          }
          
          console.log(`[Outbox] Email sent successfully: ${genericData?.id}`);
      }
    } catch (error) {
      console.error(`[Outbox] Email send error:`, error);
      throw error; // Re-throw to trigger retry logic
    }
  }

  /**
   * Handle push notification send job
   */
  private async handlePushSend(payload: any): Promise<void> {
    // Stub implementation - will be replaced in PROMPT #3
    console.log('[Outbox] Sending push notification:', {
      token: payload.token,
      title: payload.title,
      body: payload.body
    });
    
    // Simulate push sending
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // In real implementation, this would call the push service
    // e.g., await pushService.send(payload);
  }

  /**
   * Handle escrow fund job - creates an escrow on the blockchain
   */
  private async handleEscrowFund(payload: {
    senderWalletId: string;
    recipientHash: string;
    amountAtomic: string;
    assetCode: string;
    expiryTs: number;
    envelopeId: string;
  }): Promise<void> {
    const { senderWalletId, recipientHash, amountAtomic, assetCode, expiryTs, envelopeId } = payload;
    
    console.log(`[Outbox] Creating escrow for envelope ${envelopeId}`);
    
    try {
      // Check if escrow contract is configured
      if (!ESCROW_CONTRACT_ID) {
        throw new Error('ESCROW_CONTRACT_ID not configured');
      }
      
      if (!FUNDING_SECRET_KEY) {
        throw new Error('Funding account not configured (FUNDING_SECRET_KEY or SOROBAN_ACCOUNT)');
      }

      // Get the sender wallet to get the sender address
      const wallet = await prisma.wallet.findUnique({
        where: { id: senderWalletId }
      });
      
      if (!wallet) {
        throw new Error(`Wallet not found: ${senderWalletId}`);
      }

      // Parse the funding keypair
      const fundingKeypair = Keypair.fromSecret(FUNDING_SECRET_KEY);
      const fundingAccount = await getSorobanServer().getAccount(fundingKeypair.publicKey());
      
      // Generate a unique escrow ID from the envelope ID
      const escrowId = crypto.createHash('sha256').update(envelopeId).digest();
      
      // Determine the asset contract address based on assetCode
      // For MVP, we'll use a mapping. In production, this should come from configuration
      const assetContracts: Record<string, string> = {
        'XLM': 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC', // Native XLM wrapper
        'USDC': process.env.USDC_CONTRACT_ID || 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75' // USDC on testnet
      };
      
      const assetContract = assetContracts[assetCode];
      if (!assetContract) {
        throw new Error(`Unsupported asset: ${assetCode}`);
      }
      
      // Build the transaction to create escrow
      const tx = new TransactionBuilder(fundingAccount, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          Operation.invokeContractFunction({
            contract: ESCROW_CONTRACT_ID,
            function: 'create_escrow',
            args: [
              nativeToScVal(escrowId, { type: 'bytes' }), // escrow_id
              Address.fromString(wallet.publicKey).toScVal(), // sender
              nativeToScVal(Buffer.from(recipientHash, 'hex'), { type: 'bytes' }), // recipient_hash
              Address.fromString(assetContract).toScVal(), // token
              nativeToScVal(BigInt(amountAtomic), { type: 'i128' }), // amount
              nativeToScVal(Math.floor(expiryTs / 1000), { type: 'u32' }), // expiry_ledger (approximate)
            ],
          })
        )
        .setTimeout(180)
        .build();

      // Prepare and submit transaction
      const preparedTx = await getSorobanServer().prepareTransaction(tx);
      preparedTx.sign(fundingKeypair);
      
      const submitResult = await getSorobanServer().sendTransaction(preparedTx);
      
      // Wait for confirmation
      let getTransactionResponse = await getSorobanServer().getTransaction(submitResult.hash);
      let retries = 0;
      const maxRetries = 20;
      
      while (getTransactionResponse.status === 'NOT_FOUND' && retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        getTransactionResponse = await getSorobanServer().getTransaction(submitResult.hash);
        retries++;
      }
      
      if (getTransactionResponse.status === 'SUCCESS') {
        // Update envelope status to FUNDED
        await prisma.envelope.update({
          where: { id: envelopeId },
          data: {
            status: 'FUNDED',
            contractId: ESCROW_CONTRACT_ID,
            fundedAt: new Date(),
          }
        });
        
        console.log(`[Outbox] Escrow created successfully for envelope ${envelopeId}, tx: ${submitResult.hash}`);
      } else {
        throw new Error(`Transaction failed with status: ${getTransactionResponse.status}`);
      }
      
    } catch (error) {
      console.error(`[Outbox] Failed to create escrow for envelope ${envelopeId}:`, error);
      
      // Update envelope status to CANCELED with reason
      await prisma.envelope.update({
        where: { id: envelopeId },
        data: {
          status: 'CANCELED',
          cancelReason: `Escrow creation failed: ${error.message}`,
          canceledAt: new Date(),
        }
      });
      
      // Re-throw to trigger retry logic
      throw error;
    }
  }

  /**
   * Handle job processing error
   */
  private async handleJobError(job: Outbox, error: any): Promise<void> {
    const attempts = job.attempts + 1;

    if (attempts >= MAX_ATTEMPTS) {
      // Mark as permanently failed
      await prisma.outbox.update({
        where: { id: job.id },
        data: {
          failedAt: new Date(),
          attempts,
          lockedBy: null,
          lockedAt: null
        }
      });
      console.error(`[Outbox] Job ${job.id} permanently failed after ${attempts} attempts`);
    } else {
      // Retry with exponential backoff
      const backoffMs = Math.min(Math.pow(2, attempts) * 1000, 60000); // Max 1 minute
      const runAfter = new Date(Date.now() + backoffMs);

      await prisma.outbox.update({
        where: { id: job.id },
        data: {
          attempts,
          runAfter,
          lockedBy: null,
          lockedAt: null
        }
      });
      console.log(`[Outbox] Job ${job.id} will retry in ${backoffMs}ms (attempt ${attempts}/${MAX_ATTEMPTS})`);
    }
  }
}

// Singleton instance
let workerInstance: OutboxWorker | null = null;

/**
 * Get or create the singleton worker instance
 */
export function getWorker(): OutboxWorker {
  if (!workerInstance) {
    workerInstance = new OutboxWorker();
  }
  return workerInstance;
}

/**
 * Start the outbox worker
 */
export async function startWorker(): Promise<void> {
  const worker = getWorker();
  await worker.start();
}

/**
 * Stop the outbox worker
 */
export function stopWorker(): void {
  const worker = getWorker();
  worker.stop();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('[Outbox] Received SIGINT, shutting down gracefully');
  stopWorker();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[Outbox] Received SIGTERM, shutting down gracefully');
  stopWorker();
  process.exit(0);
});

// If run directly, start the worker
if (require.main === module) {
  startWorker()
    .then(() => {
      console.log('[Outbox] Worker started successfully');
    })
    .catch((error) => {
      console.error('[Outbox] Failed to start worker:', error);
      process.exit(1);
    });
}