import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prisma } from '../src/db/client';
import { OutboxWorker } from '../src/jobs/outbox';

// Mock Resend
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ data: { id: 'mock-email-id' }, error: null })
    }
  }))
}));

// Mock sendInviteEmail
vi.mock('../../lib/email', () => ({
  sendInviteEmail: vi.fn().mockResolvedValue({ id: 'mock-invite-id' })
}));

describe('Notification Integration Tests', () => {
  let worker: OutboxWorker;

  beforeEach(async () => {
    // Clean up any existing outbox jobs
    await prisma.outbox.deleteMany();
    worker = new OutboxWorker();
  });

  afterEach(async () => {
    worker.stop();
    await prisma.outbox.deleteMany();
  });

  describe('Email notifications via Outbox', () => {
    it('should process invite email through outbox', async () => {
      // Create an invite email job
      const job = await prisma.outbox.create({
        data: {
          type: 'EMAIL_SEND',
          payload: {
            template: 'invite',
            to: 'recipient@example.com',
            data: {
              recipientEmail: 'recipient@example.com',
              amount: '100',
              assetCode: 'USDC',
              envelopeId: 'test-envelope-123',
              inviteToken: 'test-token-456',
              senderName: 'Test Sender'
            }
          }
        }
      });

      // Process the job
      await worker.tick();

      // Verify job was processed
      const processedJob = await prisma.outbox.findUnique({
        where: { id: job.id }
      });

      expect(processedJob?.processedAt).toBeTruthy();
      expect(processedJob?.failedAt).toBeNull();
      expect(processedJob?.attempts).toBe(0);
    });

    it('should process walletless claim email through outbox', async () => {
      // Create a walletless claim email job
      const job = await prisma.outbox.create({
        data: {
          type: 'EMAIL_SEND',
          payload: {
            template: 'walletless_claim',
            to: 'recipient@example.com',
            data: {
              subject: 'Your NovaGift is waiting!',
              claimUrl: 'https://novagift.app/claim/xyz',
              html: '<h1>Claim your gift</h1>'
            }
          }
        }
      });

      // Process the job
      await worker.tick();

      // Verify job was processed
      const processedJob = await prisma.outbox.findUnique({
        where: { id: job.id }
      });

      expect(processedJob?.processedAt).toBeTruthy();
      expect(processedJob?.failedAt).toBeNull();
    });

    it('should retry failed email sends with exponential backoff', async () => {
      // Mock email service to fail
      const mockSend = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: { id: 'success-id' }, error: null });

      vi.mock('resend', () => ({
        Resend: vi.fn().mockImplementation(() => ({
          emails: { send: mockSend }
        }))
      }));

      // Create a job
      const job = await prisma.outbox.create({
        data: {
          type: 'EMAIL_SEND',
          payload: {
            template: 'generic',
            to: 'test@example.com',
            data: { subject: 'Test', html: '<p>Test</p>' }
          }
        }
      });

      // First attempt - should fail
      await worker.tick();
      
      let updatedJob = await prisma.outbox.findUnique({
        where: { id: job.id }
      });
      
      expect(updatedJob?.attempts).toBe(1);
      expect(updatedJob?.processedAt).toBeNull();
      expect(updatedJob?.failedAt).toBeNull();
      expect(updatedJob?.runAfter).toBeTruthy();

      // Simulate time passing
      await prisma.outbox.update({
        where: { id: job.id },
        data: { runAfter: new Date() }
      });

      // Second attempt - should fail
      await worker.tick();
      
      updatedJob = await prisma.outbox.findUnique({
        where: { id: job.id }
      });
      
      expect(updatedJob?.attempts).toBe(2);
      expect(updatedJob?.processedAt).toBeNull();

      // Simulate time passing
      await prisma.outbox.update({
        where: { id: job.id },
        data: { runAfter: new Date() }
      });

      // Third attempt - should succeed
      await worker.tick();
      
      updatedJob = await prisma.outbox.findUnique({
        where: { id: job.id }
      });
      
      expect(updatedJob?.processedAt).toBeTruthy();
      expect(updatedJob?.failedAt).toBeNull();
    });

    it('should mark job as failed after max attempts', async () => {
      // Create a job that will always fail
      const job = await prisma.outbox.create({
        data: {
          type: 'EMAIL_SEND',
          payload: {
            template: 'invalid_template',
            to: 'test@example.com',
            data: {}
          },
          attempts: 4 // Already at 4 attempts
        }
      });

      // Mock email service to always fail
      vi.mock('resend', () => ({
        Resend: vi.fn().mockImplementation(() => ({
          emails: {
            send: vi.fn().mockRejectedValue(new Error('Permanent failure'))
          }
        }))
      }));

      // Process - should fail permanently
      await worker.tick();
      
      const updatedJob = await prisma.outbox.findUnique({
        where: { id: job.id }
      });
      
      expect(updatedJob?.attempts).toBe(5);
      expect(updatedJob?.failedAt).toBeTruthy();
      expect(updatedJob?.processedAt).toBeNull();
    });
  });

  describe('Push notifications via Outbox', () => {
    it('should process push notification through outbox', async () => {
      // Create a push notification job
      const job = await prisma.outbox.create({
        data: {
          type: 'PUSH_SEND',
          payload: {
            token: 'device-token-123',
            title: 'NovaGift Received',
            body: 'You have received a gift!'
          }
        }
      });

      // Process the job
      await worker.tick();

      // Verify job was processed (stub implementation)
      const processedJob = await prisma.outbox.findUnique({
        where: { id: job.id }
      });

      expect(processedJob?.processedAt).toBeTruthy();
      expect(processedJob?.failedAt).toBeNull();
    });
  });

  describe('Concurrent job processing', () => {
    it('should process multiple jobs in parallel', async () => {
      // Create multiple jobs
      const jobs = await Promise.all([
        prisma.outbox.create({
          data: {
            type: 'EMAIL_SEND',
            payload: { template: 'generic', to: 'user1@example.com', data: {} }
          }
        }),
        prisma.outbox.create({
          data: {
            type: 'EMAIL_SEND',
            payload: { template: 'generic', to: 'user2@example.com', data: {} }
          }
        }),
        prisma.outbox.create({
          data: {
            type: 'PUSH_SEND',
            payload: { token: 'token1', title: 'Title', body: 'Body' }
          }
        })
      ]);

      // Process all jobs
      await worker.tick();

      // Verify all jobs were processed
      const processedJobs = await prisma.outbox.findMany({
        where: {
          id: { in: jobs.map(j => j.id) }
        }
      });

      processedJobs.forEach(job => {
        expect(job.processedAt).toBeTruthy();
        expect(job.failedAt).toBeNull();
      });
    });
  });
});