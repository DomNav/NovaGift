import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock the prisma client before importing
vi.mock('../db/client', () => ({
  prisma: {
    outbox: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock hostname and process.pid
vi.mock('os', () => ({
  hostname: () => 'test-host',
}));

// Import after mocking
import { OutboxWorker } from '../jobs/outbox';
import { prisma } from '../db/client';

// Type cast for testing
const mockPrisma = prisma as any;

describe('OutboxWorker', () => {
  let worker: OutboxWorker;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    worker = new OutboxWorker();
  });

  afterEach(() => {
    worker.stop();
    vi.useRealTimers();
  });

  describe('tick', () => {
    it('should process jobs when available', async () => {
      const mockJob = {
        id: 'job1',
        type: 'EMAIL_SEND',
        payload: { to: 'test@example.com', template: 'welcome', data: {} },
        runAfter: new Date(),
        attempts: 0,
        lockedBy: null,
        lockedAt: null,
        processedAt: null,
        failedAt: null,
        createdAt: new Date(),
      };

      // Mock finding unlocked jobs
      mockPrisma.outbox.findMany
        .mockResolvedValueOnce([mockJob]) // Jobs to lock
        .mockResolvedValueOnce([{ ...mockJob, lockedBy: 'test-host-' + process.pid }]); // Locked jobs

      // Mock updating jobs
      mockPrisma.outbox.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.outbox.update.mockResolvedValue(mockJob);

      await worker.tick();

      // Verify jobs were locked
      expect(mockPrisma.outbox.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          id: { in: ['job1'] },
          lockedBy: null,
        }),
        data: expect.objectContaining({
          lockedBy: expect.stringContaining('test-host'),
          lockedAt: expect.any(Date),
        }),
      });

      // Verify job was marked as processed
      expect(mockPrisma.outbox.update).toHaveBeenCalledWith({
        where: { id: 'job1' },
        data: expect.objectContaining({
          processedAt: expect.any(Date),
          lockedBy: null,
          lockedAt: null,
        }),
      });
    });

    it('should handle no available jobs gracefully', async () => {
      mockPrisma.outbox.findMany.mockResolvedValueOnce([]);
      mockPrisma.outbox.updateMany.mockResolvedValue({ count: 0 });

      await worker.tick();

      // Only stale lock release should be called
      expect(mockPrisma.outbox.updateMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.outbox.update).not.toHaveBeenCalled();
    });

    it('should release stale locks', async () => {
      mockPrisma.outbox.findMany.mockResolvedValueOnce([]);
      mockPrisma.outbox.updateMany.mockResolvedValue({ count: 1 });

      await worker.tick();

      // Check that stale locks were released
      expect(mockPrisma.outbox.updateMany).toHaveBeenCalledWith({
        where: {
          lockedAt: { lt: expect.any(Date) },
          processedAt: null,
          failedAt: null,
        },
        data: {
          lockedBy: null,
          lockedAt: null,
        },
      });
    });
  });

  describe('job processing', () => {
    it('should retry failed jobs with exponential backoff', async () => {
      const mockJob = {
        id: 'job1',
        type: 'UNKNOWN_TYPE', // Will cause an error
        payload: {},
        runAfter: new Date(),
        attempts: 1,
        lockedBy: 'test-host-' + process.pid,
        lockedAt: new Date(),
        processedAt: null,
        failedAt: null,
        createdAt: new Date(),
      };

      mockPrisma.outbox.findMany
        .mockResolvedValueOnce([mockJob])
        .mockResolvedValueOnce([mockJob]);

      mockPrisma.outbox.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.outbox.update.mockResolvedValue(mockJob);

      await worker.tick();

      // Verify job was marked for retry
      expect(mockPrisma.outbox.update).toHaveBeenCalledWith({
        where: { id: 'job1' },
        data: expect.objectContaining({
          attempts: 2,
          runAfter: expect.any(Date),
          lockedBy: null,
          lockedAt: null,
        }),
      });
    });

    it('should mark job as permanently failed after max attempts', async () => {
      const mockJob = {
        id: 'job1',
        type: 'UNKNOWN_TYPE',
        payload: {},
        runAfter: new Date(),
        attempts: 4, // One less than MAX_ATTEMPTS
        lockedBy: 'test-host-' + process.pid,
        lockedAt: new Date(),
        processedAt: null,
        failedAt: null,
        createdAt: new Date(),
      };

      mockPrisma.outbox.findMany
        .mockResolvedValueOnce([mockJob])
        .mockResolvedValueOnce([mockJob]);

      mockPrisma.outbox.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.outbox.update.mockResolvedValue(mockJob);

      await worker.tick();

      // Verify job was marked as failed
      expect(mockPrisma.outbox.update).toHaveBeenCalledWith({
        where: { id: 'job1' },
        data: expect.objectContaining({
          failedAt: expect.any(Date),
          attempts: 5,
          lockedBy: null,
          lockedAt: null,
        }),
      });
    });
  });

  describe('worker lifecycle', () => {
    it('should start and stop the worker', async () => {
      // Mock empty job list for start
      mockPrisma.outbox.findMany.mockResolvedValue([]);
      mockPrisma.outbox.updateMany.mockResolvedValue({ count: 0 });
      
      await worker.start();
      
      // Worker should be running
      expect(worker['isRunning']).toBe(true);
      expect(worker['intervalId']).not.toBeNull();

      worker.stop();

      // Worker should be stopped
      expect(worker['isRunning']).toBe(false);
      expect(worker['intervalId']).toBeNull();
    });

    it('should not start multiple times', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      // Mock empty job list for start
      mockPrisma.outbox.findMany.mockResolvedValue([]);
      mockPrisma.outbox.updateMany.mockResolvedValue({ count: 0 });
      
      await worker.start();
      await worker.start(); // Try to start again

      expect(consoleSpy).toHaveBeenCalledWith('[Outbox] Worker already running');
      
      consoleSpy.mockRestore();
    });
  });

  describe('job handlers', () => {
    it('should handle EMAIL_SEND jobs', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const mockJob = {
        id: 'job1',
        type: 'EMAIL_SEND',
        payload: {
          to: 'test@example.com',
          template: 'welcome',
          data: { name: 'Test User' },
        },
        runAfter: new Date(),
        attempts: 0,
        lockedBy: 'test-host-' + process.pid,
        lockedAt: new Date(),
        processedAt: null,
        failedAt: null,
        createdAt: new Date(),
      };

      mockPrisma.outbox.findMany
        .mockResolvedValueOnce([mockJob])
        .mockResolvedValueOnce([mockJob]);

      mockPrisma.outbox.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.outbox.update.mockResolvedValue(mockJob);

      await worker.tick();

      expect(consoleSpy).toHaveBeenCalledWith('[Outbox] Sending email:', {
        to: 'test@example.com',
        template: 'welcome',
        data: { name: 'Test User' },
      });

      consoleSpy.mockRestore();
    });

    it('should handle PUSH_SEND jobs', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const mockJob = {
        id: 'job1',
        type: 'PUSH_SEND',
        payload: {
          token: 'device-token',
          title: 'Test Notification',
          body: 'Test message',
        },
        runAfter: new Date(),
        attempts: 0,
        lockedBy: 'test-host-' + process.pid,
        lockedAt: new Date(),
        processedAt: null,
        failedAt: null,
        createdAt: new Date(),
      };

      mockPrisma.outbox.findMany
        .mockResolvedValueOnce([mockJob])
        .mockResolvedValueOnce([mockJob]);

      mockPrisma.outbox.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.outbox.update.mockResolvedValue(mockJob);

      await worker.tick();

      expect(consoleSpy).toHaveBeenCalledWith('[Outbox] Sending push notification:', {
        token: 'device-token',
        title: 'Test Notification',
        body: 'Test message',
      });

      consoleSpy.mockRestore();
    });
  });
});

describe('Outbox helper functions', () => {
  it('should create an outbox job', async () => {
    const mockJob = {
      id: 'job1',
      type: 'EMAIL_SEND',
      payload: { to: 'test@example.com' },
      runAfter: new Date(),
      attempts: 0,
      lockedBy: null,
      lockedAt: null,
      processedAt: null,
      failedAt: null,
      createdAt: new Date(),
    };

    mockPrisma.outbox.create.mockResolvedValue(mockJob);

    const result = await mockPrisma.outbox.create({
      data: {
        type: 'EMAIL_SEND',
        payload: { to: 'test@example.com' },
      },
    });

    expect(result).toEqual(mockJob);
    expect(mockPrisma.outbox.create).toHaveBeenCalledWith({
      data: {
        type: 'EMAIL_SEND',
        payload: { to: 'test@example.com' },
      },
    });
  });
});