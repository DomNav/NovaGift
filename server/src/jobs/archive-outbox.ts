#!/usr/bin/env tsx
/**
 * Outbox Archival Job
 * Archives processed outbox records older than 30 days to keep table small
 * Run daily via cron: 0 2 * * * tsx server/src/jobs/archive-outbox.ts
 */

import { prisma } from '../lib/prisma';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createWriteStream, createReadStream, unlinkSync } from 'fs';
import { pipeline } from 'stream/promises';
import { createGzip } from 'zlib';
import { format } from 'date-fns';
import * as path from 'path';
import * as os from 'os';

// Configuration
const ARCHIVE_DAYS = parseInt(process.env.OUTBOX_ARCHIVE_DAYS || '30');
const BATCH_SIZE = 1000;
const S3_BUCKET = process.env.S3_ARCHIVE_BUCKET || 'novagift-archives';
const S3_PREFIX = process.env.S3_ARCHIVE_PREFIX || 'outbox/';
const KEEP_LOCAL_BACKUP = process.env.KEEP_LOCAL_BACKUP === 'true';
const LOCAL_BACKUP_DIR = process.env.LOCAL_BACKUP_DIR || './backups/outbox';

// S3 client (only if configured)
const s3Client = process.env.AWS_REGION ? new S3Client({
  region: process.env.AWS_REGION,
  credentials: process.env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  } : undefined,
}) : null;

interface ArchiveResult {
  totalRecords: number;
  archivedRecords: number;
  deletedRecords: number;
  archiveFile?: string;
  s3Location?: string;
  error?: string;
}

/**
 * Archive old outbox records
 */
export async function archiveOutboxRecords(): Promise<ArchiveResult> {
  const startTime = Date.now();
  const cutoffDate = new Date(Date.now() - ARCHIVE_DAYS * 24 * 60 * 60 * 1000);
  
  console.log(`📦 Starting Outbox archival for records older than ${cutoffDate.toISOString()}`);
  
  const result: ArchiveResult = {
    totalRecords: 0,
    archivedRecords: 0,
    deletedRecords: 0,
  };

  try {
    // Count total records to archive
    result.totalRecords = await prisma.outbox.count({
      where: {
        OR: [
          { processedAt: { lt: cutoffDate } },
          { failedAt: { lt: cutoffDate } },
        ],
      },
    });

    if (result.totalRecords === 0) {
      console.log('✅ No records to archive');
      return result;
    }

    console.log(`Found ${result.totalRecords} records to archive`);

    // Create archive file
    const archiveFileName = `outbox_${format(new Date(), 'yyyyMMdd_HHmmss')}.jsonl.gz`;
    const tempFilePath = path.join(os.tmpdir(), archiveFileName.replace('.gz', ''));
    const compressedPath = path.join(os.tmpdir(), archiveFileName);
    
    const writeStream = createWriteStream(tempFilePath);

    // Process records in batches
    let processed = 0;
    let hasMore = true;
    let lastId: string | undefined;

    while (hasMore) {
      // Fetch batch with cursor-based pagination
      const batch = await prisma.outbox.findMany({
        where: {
          OR: [
            { processedAt: { lt: cutoffDate } },
            { failedAt: { lt: cutoffDate } },
          ],
          ...(lastId ? { id: { gt: lastId } } : {}),
        },
        orderBy: { id: 'asc' },
        take: BATCH_SIZE,
      });

      if (batch.length === 0) {
        hasMore = false;
        break;
      }

      // Write to JSONL file
      for (const record of batch) {
        const line = JSON.stringify({
          ...record,
          archivedAt: new Date().toISOString(),
        }) + '\n';
        
        writeStream.write(line);
        processed++;
      }

      lastId = batch[batch.length - 1].id;
      
      // Progress update
      if (processed % 5000 === 0) {
        console.log(`  Processed ${processed}/${result.totalRecords} records...`);
      }
    }

    writeStream.end();
    result.archivedRecords = processed;

    // Compress the archive
    console.log('Compressing archive...');
    await pipeline(
      createReadStream(tempFilePath),
      createGzip({ level: 9 }),
      createWriteStream(compressedPath)
    );

    // Clean up temp file
    unlinkSync(tempFilePath);

    // Upload to S3 if configured
    if (s3Client) {
      console.log('Uploading to S3...');
      const s3Key = `${S3_PREFIX}${format(new Date(), 'yyyy/MM/dd/')}${archiveFileName}`;
      
      const fileStream = createReadStream(compressedPath);
      const uploadCommand = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: fileStream,
        ContentType: 'application/gzip',
        Metadata: {
          'records': result.archivedRecords.toString(),
          'archive-date': cutoffDate.toISOString(),
          'created': new Date().toISOString(),
        },
      });

      await s3Client.send(uploadCommand);
      result.s3Location = `s3://${S3_BUCKET}/${s3Key}`;
      console.log(`✅ Uploaded to ${result.s3Location}`);
    }

    // Keep local backup if configured
    if (KEEP_LOCAL_BACKUP) {
      const fs = await import('fs/promises');
      await fs.mkdir(LOCAL_BACKUP_DIR, { recursive: true });
      const localPath = path.join(LOCAL_BACKUP_DIR, archiveFileName);
      await fs.copyFile(compressedPath, localPath);
      result.archiveFile = localPath;
      console.log(`✅ Local backup saved to ${localPath}`);
    }

    // Clean up compressed file if not keeping local
    if (!KEEP_LOCAL_BACKUP) {
      unlinkSync(compressedPath);
    }

    // Delete archived records from database
    console.log('Deleting archived records from database...');
    
    // Delete in batches to avoid locking issues
    let deleted = 0;
    while (deleted < result.archivedRecords) {
      const deleteResult = await prisma.outbox.deleteMany({
        where: {
          OR: [
            { processedAt: { lt: cutoffDate } },
            { failedAt: { lt: cutoffDate } },
          ],
        },
        take: BATCH_SIZE as any, // Prisma doesn't officially support take in deleteMany but works
      });

      deleted += deleteResult.count;
      
      // Small delay to prevent database overload
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    result.deletedRecords = deleted;

    // Log summary
    const duration = Date.now() - startTime;
    console.log(`
📊 Archival Summary:
  - Total records found: ${result.totalRecords}
  - Records archived: ${result.archivedRecords}
  - Records deleted: ${result.deletedRecords}
  - Archive location: ${result.s3Location || result.archiveFile || 'N/A'}
  - Duration: ${(duration / 1000).toFixed(2)}s
`);

    // Update metrics if available
    try {
      const { metrics } = await import('../routes/metrics');
      metrics.outbox.processed.inc({ type: 'archived', status: 'success' }, result.archivedRecords);
    } catch (e) {
      // Metrics may not be available in standalone mode
    }

    return result;

  } catch (error: any) {
    console.error('❌ Archive failed:', error);
    result.error = error.message;
    
    // Update error metrics if available
    try {
      const { metrics } = await import('../routes/metrics');
      metrics.outbox.failed.inc({ type: 'archive', error_type: 'archive_error' });
    } catch (e) {
      // Metrics may not be available
    }
    
    throw error;
  }
}

/**
 * Restore archived records from a backup file (utility function)
 */
export async function restoreFromArchive(archivePath: string): Promise<number> {
  console.log(`🔄 Restoring from archive: ${archivePath}`);
  
  const readline = await import('readline');
  const { createReadStream } = await import('fs');
  const { createGunzip } = await import('zlib');
  
  let restored = 0;
  const errors: any[] = [];

  // Create read stream with decompression
  const fileStream = createReadStream(archivePath);
  const gunzip = createGunzip();
  const stream = fileStream.pipe(gunzip);
  
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  // Process each line
  for await (const line of rl) {
    try {
      const record = JSON.parse(line);
      
      // Remove archive metadata
      delete record.archivedAt;
      
      // Insert back to database
      await prisma.outbox.create({
        data: record,
      });
      
      restored++;
      
      if (restored % 1000 === 0) {
        console.log(`  Restored ${restored} records...`);
      }
    } catch (error: any) {
      errors.push({ line: line.substring(0, 100), error: error.message });
    }
  }

  if (errors.length > 0) {
    console.warn(`⚠️ ${errors.length} records failed to restore`);
  }

  console.log(`✅ Restored ${restored} records from archive`);
  return restored;
}

// Run as standalone script
if (require.main === module) {
  archiveOutboxRecords()
    .then((result) => {
      console.log('✅ Archival complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Archival failed:', error);
      process.exit(1);
    });
}