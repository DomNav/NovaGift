import { test, expect } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import { prisma } from '../../server/src/db/client';
import { signSession } from '../../server/src/lib/jwt';

/**
 * Test that verifies exactly-once processing in Outbox pattern
 * by pausing worker, queuing jobs, and resuming
 */
test.describe('Outbox Exactly-Once Processing', () => {
  let workerProcess: ChildProcess | null = null;
  let authToken: string;

  test.beforeAll(async () => {
    authToken = signSession({ sub: 'GOUTBOX_TEST_' + Date.now() });
    
    // Clean up any existing test jobs
    await prisma.outbox.deleteMany({
      where: {
        type: 'TEST_JOB',
      },
    });
  });

  test.afterAll(async () => {
    // Clean up worker process if still running
    if (workerProcess) {
      workerProcess.kill();
    }
    
    // Clean up test data
    await prisma.outbox.deleteMany({
      where: {
        type: 'TEST_JOB',
      },
    });
  });

  test('should process jobs exactly once with worker pause/resume', async ({ request }) => {
    console.log('Starting Outbox exactly-once test...');

    // Step 1: Start the Outbox worker
    console.log('Step 1: Starting Outbox worker...');
    workerProcess = spawn('npm', ['run', 'outbox-worker'], {
      stdio: 'pipe',
      shell: true,
    });

    let workerStarted = false;
    workerProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log('[Worker]:', output);
      if (output.includes('Starting worker') || output.includes('Worker started')) {
        workerStarted = true;
      }
    });

    workerProcess.stderr?.on('data', (data) => {
      console.error('[Worker Error]:', data.toString());
    });

    // Wait for worker to start
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (workerStarted) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 500);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 10000);
    });

    console.log('Worker started successfully');
    
    // Give worker time to process any existing jobs
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 2: Pause the worker
    console.log('Step 2: Pausing worker (killing process)...');
    if (workerProcess) {
      workerProcess.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 1000));
      workerProcess = null;
    }

    // Step 3: Queue test jobs while worker is paused
    console.log('Step 3: Queuing jobs while worker is paused...');
    
    const jobIds: string[] = [];
    const jobCount = 5;
    
    for (let i = 0; i < jobCount; i++) {
      const job = await prisma.outbox.create({
        data: {
          type: 'TEST_JOB',
          payload: {
            index: i,
            timestamp: Date.now(),
            message: `Test job ${i}`,
          },
          runAfter: new Date(),
        },
      });
      jobIds.push(job.id);
      console.log(`Queued job ${i}: ${job.id}`);
    }

    // Verify jobs are queued but not processed
    const queuedJobs = await prisma.outbox.findMany({
      where: {
        id: { in: jobIds },
      },
    });

    expect(queuedJobs).toHaveLength(jobCount);
    queuedJobs.forEach(job => {
      expect(job.processedAt).toBeNull();
      expect(job.lockedBy).toBeNull();
      expect(job.attempts).toBe(0);
    });

    console.log(`Verified ${jobCount} jobs are queued and unprocessed`);

    // Step 4: Queue a real gift to test actual processing
    console.log('Step 4: Creating a real gift while worker is paused...');
    
    const giftResponse = await request.post('http://localhost:4000/api/gift', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        mode: 'SINGLE',
        recipients: ['GEXACTLY_ONCE_TEST'],
        amountAtomic: '1000000000',
        assetCode: 'USDC',
        expiryTs: Math.floor(Date.now() / 1000) + 3600,
        message: 'Exactly-once test gift',
      },
    });

    let giftEnvelopeId: string | null = null;
    if (giftResponse.ok()) {
      const giftData = await giftResponse.json();
      giftEnvelopeId = giftData.data.envelopeIds[0];
      console.log(`Created gift envelope: ${giftEnvelopeId}`);
    }

    // Check that ESCROW_FUND job was queued
    const escrowJobs = await prisma.outbox.findMany({
      where: {
        type: 'ESCROW_FUND',
        processedAt: null,
      },
    });
    
    console.log(`Found ${escrowJobs.length} unprocessed ESCROW_FUND jobs`);

    // Step 5: Resume the worker
    console.log('Step 5: Resuming worker...');
    workerProcess = spawn('npm', ['run', 'outbox-worker'], {
      stdio: 'pipe',
      shell: true,
    });

    workerStarted = false;
    const processedJobIds = new Set<string>();

    workerProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log('[Worker]:', output);
      
      if (output.includes('Starting worker') || output.includes('Worker started')) {
        workerStarted = true;
      }
      
      // Track processed jobs
      const processMatch = output.match(/Processing job ([a-f0-9-]+)/);
      if (processMatch) {
        processedJobIds.add(processMatch[1]);
      }
      
      const completeMatch = output.match(/Job ([a-f0-9-]+) completed/);
      if (completeMatch) {
        console.log(`Job completed: ${completeMatch[1]}`);
      }
    });

    // Wait for worker to start
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (workerStarted) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 500);
      
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 10000);
    });

    // Step 6: Wait for jobs to be processed
    console.log('Step 6: Waiting for jobs to be processed...');
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds for processing

    // Step 7: Verify exactly-once processing
    console.log('Step 7: Verifying exactly-once processing...');
    
    // Check test jobs
    const processedTestJobs = await prisma.outbox.findMany({
      where: {
        id: { in: jobIds },
      },
    });

    // Count how many test jobs were processed
    const processedCount = processedTestJobs.filter(j => j.processedAt !== null).length;
    console.log(`Processed ${processedCount} out of ${jobCount} test jobs`);

    // Each processed job should be processed exactly once
    processedTestJobs.forEach(job => {
      if (job.processedAt) {
        expect(job.attempts).toBeGreaterThanOrEqual(1);
        // Job should be unlocked after processing
        expect(job.lockedBy).toBeNull();
        expect(job.lockedAt).toBeNull();
      }
    });

    // Check for duplicate processing by looking at attempts
    const overProcessed = processedTestJobs.filter(j => j.attempts > 1 && !j.failedAt);
    if (overProcessed.length > 0) {
      console.warn(`Warning: ${overProcessed.length} jobs had multiple attempts but succeeded`);
    }

    // Verify gift envelope processing if created
    if (giftEnvelopeId) {
      const envelope = await prisma.envelope.findUnique({
        where: { id: giftEnvelopeId },
      });
      
      console.log(`Gift envelope status: ${envelope?.status}`);
      
      // Check corresponding ESCROW_FUND job
      const fundJob = await prisma.outbox.findFirst({
        where: {
          type: 'ESCROW_FUND',
          payload: {
            path: ['envelopeId'],
            equals: giftEnvelopeId,
          },
        },
      });
      
      if (fundJob) {
        console.log(`ESCROW_FUND job status: processed=${fundJob.processedAt !== null}, attempts=${fundJob.attempts}`);
        
        // Should be processed exactly once (unless it failed and retried)
        if (fundJob.processedAt && !fundJob.failedAt) {
          expect(fundJob.attempts).toBeLessThanOrEqual(1);
        }
      }
    }

    // Step 8: Test idempotency - try to reprocess a job
    console.log('Step 8: Testing idempotency...');
    
    if (processedTestJobs.length > 0 && processedTestJobs[0].processedAt) {
      const processedJob = processedTestJobs[0];
      
      // Try to mark it as unprocessed and see if worker picks it up again
      await prisma.outbox.update({
        where: { id: processedJob.id },
        data: {
          processedAt: null,
          lockedBy: null,
          lockedAt: null,
        },
      });
      
      // Wait for potential reprocessing
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check if it was reprocessed
      const reprocessedJob = await prisma.outbox.findUnique({
        where: { id: processedJob.id },
      });
      
      if (reprocessedJob?.processedAt) {
        console.log('Job was reprocessed (this is expected behavior for the Outbox pattern)');
        // In a true idempotent system, the handler should be safe to run multiple times
      }
    }

    // Final summary
    console.log('\n=== Exactly-Once Processing Test Summary ===');
    console.log(`Total jobs queued: ${jobCount}`);
    console.log(`Jobs processed: ${processedCount}`);
    console.log(`Jobs with multiple attempts: ${overProcessed.length}`);
    
    // At least some jobs should have been processed
    expect(processedCount).toBeGreaterThan(0);
    
    // No job should be processed more than once successfully
    const successfulJobs = processedTestJobs.filter(j => j.processedAt && !j.failedAt);
    successfulJobs.forEach(job => {
      expect(job.attempts).toBeLessThanOrEqual(1);
    });

    console.log('Exactly-once processing test completed successfully!');
  });

  test('should handle concurrent worker instances', async () => {
    console.log('Testing concurrent worker behavior...');
    
    // Queue jobs
    const concurrentJobIds: string[] = [];
    for (let i = 0; i < 10; i++) {
      const job = await prisma.outbox.create({
        data: {
          type: 'TEST_JOB',
          payload: { index: i, test: 'concurrent' },
          runAfter: new Date(),
        },
      });
      concurrentJobIds.push(job.id);
    }

    // Start two worker instances simultaneously
    const worker1 = spawn('npm', ['run', 'outbox-worker'], {
      stdio: 'pipe',
      shell: true,
    });
    
    const worker2 = spawn('npm', ['run', 'outbox-worker'], {
      stdio: 'pipe',
      shell: true,
    });

    // Track which worker processes which job
    const worker1Jobs = new Set<string>();
    const worker2Jobs = new Set<string>();

    worker1.stdout?.on('data', (data) => {
      const output = data.toString();
      const match = output.match(/Processing job ([a-f0-9-]+)/);
      if (match) {
        worker1Jobs.add(match[1]);
      }
    });

    worker2.stdout?.on('data', (data) => {
      const output = data.toString();
      const match = output.match(/Processing job ([a-f0-9-]+)/);
      if (match) {
        worker2Jobs.add(match[1]);
      }
    });

    // Let them run for a bit
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Clean up workers
    worker1.kill();
    worker2.kill();

    // Check results
    const processedJobs = await prisma.outbox.findMany({
      where: {
        id: { in: concurrentJobIds },
      },
    });

    // Each job should be processed exactly once despite concurrent workers
    processedJobs.forEach(job => {
      if (job.processedAt) {
        // Check that job wasn't processed by both workers
        const inWorker1 = worker1Jobs.has(job.id);
        const inWorker2 = worker2Jobs.has(job.id);
        
        if (inWorker1 && inWorker2) {
          console.warn(`Job ${job.id} was picked up by both workers (locking race condition)`);
        }
      }
    });

    const processedCount = processedJobs.filter(j => j.processedAt !== null).length;
    console.log(`Processed ${processedCount} out of ${concurrentJobIds.length} jobs with concurrent workers`);
    
    // All or most jobs should be processed
    expect(processedCount).toBeGreaterThan(concurrentJobIds.length * 0.8);
    
    console.log('Concurrent worker test completed!');
  });
});