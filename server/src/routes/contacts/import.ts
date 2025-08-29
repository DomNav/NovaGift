import { Router } from 'express';
import multer from 'multer';
import { parseStream } from 'fast-csv';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// Contact validation schema
const ContactSchema = z.object({
  name: z.string().min(2),
  contact: z.string().refine(
    (val) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      return emailRegex.test(val) || phoneRegex.test(val);
    },
    { message: 'Invalid email or phone' }
  ),
  wallet: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
});

interface ParsedContact {
  name: string;
  contact: string;
  wallet?: string | null;
  tags?: string[];
}

interface ErrorRow extends ParsedContact {
  error: string;
  row: number;
}

router.post('/import', upload.single('csv'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const validContacts: ParsedContact[] = [];
  const errorRows: ErrorRow[] = [];
  let rowNumber = 0;

  try {
    // Create readable stream from buffer
    const stream = Readable.from(req.file.buffer);

    // Parse CSV
    await new Promise<void>((resolve, reject) => {
      parseStream(stream, { headers: true, ignoreEmpty: true })
        .on('data', (row) => {
          rowNumber++;
          
          try {
            // Parse tags if present
            const tags = row.tags ? row.tags.split(';').map((t: string) => t.trim()) : [];
            
            const contact: ParsedContact = {
              name: row.name?.trim(),
              contact: row.contact?.trim() || row.email?.trim() || row.phone?.trim(),
              wallet: row.wallet?.trim() || null,
              tags: tags.length > 0 ? tags : undefined,
            };

            // Validate
            const result = ContactSchema.safeParse(contact);
            
            if (result.success) {
              validContacts.push(result.data);
            } else {
              errorRows.push({
                ...contact,
                error: result.error.errors[0]?.message || 'Validation failed',
                row: rowNumber,
              });
            }
          } catch (error) {
            errorRows.push({
              name: row.name || '',
              contact: row.contact || row.email || row.phone || '',
              error: 'Failed to parse row',
              row: rowNumber,
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Batch insert valid contacts
    let insertedCount = 0;
    if (validContacts.length > 0) {
      // Process in batches of 100
      const batchSize = 100;
      for (let i = 0; i < validContacts.length; i += batchSize) {
        const batch = validContacts.slice(i, i + batchSize);
        
        await prisma.$transaction(
          batch.map(contact => 
            prisma.contact.create({
              data: {
                name: contact.name,
                email: contact.contact.includes('@') ? contact.contact : null,
                phone: !contact.contact.includes('@') ? contact.contact : null,
                wallet: contact.wallet,
                tags: contact.tags || [],
              },
            })
          )
        );
        
        insertedCount += batch.length;
      }
    }

    // Generate error CSV if there are errors
    let errorCsvUrl: string | undefined;
    if (errorRows.length > 0) {
      // Create error CSV
      const errorCsvContent = [
        'name,contact,wallet,tags,error,original_row',
        ...errorRows.map(row => 
          `"${row.name}","${row.contact}","${row.wallet || ''}","${row.tags?.join(';') || ''}","${row.error}",${row.row}`
        ),
      ].join('\n');

      // Save to temp file
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const errorFileName = `import-errors-${crypto.randomBytes(8).toString('hex')}.csv`;
      const errorFilePath = path.join(tempDir, errorFileName);
      fs.writeFileSync(errorFilePath, errorCsvContent);

      // In production, upload to S3/CDN and return URL
      // For now, return local path
      errorCsvUrl = `/api/contacts/download-errors/${errorFileName}`;
    }

    return res.json({
      okCount: insertedCount,
      errorCount: errorRows.length,
      errorCsvUrl,
    });
  } catch (error) {
    console.error('CSV import error:', error);
    return res.status(500).json({ 
      error: 'Failed to import CSV',
      okCount: 0,
      errorCount: rowNumber,
    });
  }
});

// Route to download error CSV
router.get('/download-errors/:filename', (req, res) => {
  const { filename } = req.params;
  
  // Validate filename to prevent directory traversal
  if (!/^import-errors-[a-f0-9]{16}\.csv$/.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const filePath = path.join(process.cwd(), 'temp', filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.download(filePath, 'import-errors.csv', (err) => {
    if (!err) {
      // Clean up file after download
      fs.unlinkSync(filePath);
    }
  });
});

export default router;