import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client';
import { withTx } from '../db/tx';
import { shortCode, toAtomic, fromAtomic } from '../lib/ids';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiters for QR operations
const eventCreateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many event creation requests, please try again later',
});

const codeGenerateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many code generation requests, please try again later',
});

const claimLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many claim requests, please try again later',
});

// Validation schemas
const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  assetCode: z.enum(['USDC', 'XLM']),
  budget: z.string().regex(/^\d+(\.\d{1,7})?$/, 'Invalid budget format'),
});

const CreateEventSchema = z.object({
  projectId: z.string().cuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  eventType: z.enum(['POOL', 'ASSIGNED', 'CHECKIN']),
  poolSize: z.number().int().positive().max(5000),
  amount: z.string().regex(/^\d+(\.\d{1,7})?$/, 'Invalid amount format'),
});

const GenerateCodesSchema = z.object({
  count: z.number().int().positive().max(2000).optional(),
  assignedContactIds: z.array(z.string().cuid()).optional(),
});

const ClaimCodeSchema = z.object({
  code: z.string().min(6).max(10),
  wallet: z.string().startsWith('G'),
});

// Helper function to ensure code uniqueness
async function generateUniqueCode(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const code = shortCode(8);
    const existing = await prisma.qrCode.findUnique({ where: { code } });
    if (!existing) {
      return code;
    }
    attempts++;
  }
  
  throw new Error('Failed to generate unique code after maximum attempts');
}

/**
 * Create a new project
 * POST /api/qr/projects
 */
router.post('/projects', eventCreateLimiter, async (req: Request, res: Response) => {
  try {
    const body = CreateProjectSchema.parse(req.body);
    
    const project = await prisma.project.create({
      data: {
        name: body.name,
        assetCode: body.assetCode,
        budget: body.budget,
        kind: 'STANDARD',
        status: 'DRAFT',
      },
    });

    res.json({ project });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'validation_failed', details: error.errors });
      return;
    }
    console.error('Project creation error:', error);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

/**
 * Create or update QR event for a project
 * POST /api/qr/events
 */
router.post('/events', eventCreateLimiter, async (req: Request, res: Response) => {
  try {
    const body = CreateEventSchema.parse(req.body);
    
    // Validate project exists and is QR_EVENT type
    const project = await prisma.project.findUniqueOrThrow({ 
      where: { id: body.projectId } 
    });

    // Update project to QR_EVENT if it's not already
    if (project.kind !== 'QR_EVENT') {
      await prisma.project.update({
        where: { id: body.projectId },
        data: { kind: 'QR_EVENT' },
      });
    }

    const amountAtomic = toAtomic(body.amount);
    const startAt = new Date(body.startAt);
    const endAt = new Date(body.endAt);

    // Validate dates
    if (startAt >= endAt) {
      res.status(400).json({ error: 'invalid_dates', message: 'Start date must be before end date' });
      return;
    }

    const event = await prisma.qrEvent.upsert({
      where: { projectId: body.projectId },
      update: {
        startAt,
        endAt,
        eventType: body.eventType,
        poolSize: body.poolSize,
        amountAtomic,
      },
      create: {
        projectId: body.projectId,
        startAt,
        endAt,
        eventType: body.eventType,
        poolSize: body.poolSize,
        amountAtomic,
      },
    });

    res.json({ event });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'validation_failed', details: error.errors });
      return;
    }
    console.error('Event creation error:', error);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

/**
 * Generate QR codes for an event
 * POST /api/qr/events/:id/codes
 */
router.post('/events/:id/codes', codeGenerateLimiter, async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;
    const body = GenerateCodesSchema.parse(req.body);

    const event = await prisma.qrEvent.findUniqueOrThrow({ 
      where: { id: eventId },
      include: { project: true }
    });

    const codes: Array<{ code: string; assignedContact?: string }> = [];

    if (event.eventType === 'ASSIGNED' && body.assignedContactIds?.length) {
      // Generate codes for specific contacts
      for (const contactId of body.assignedContactIds) {
        const code = await generateUniqueCode();
        codes.push({ code, assignedContact: contactId });
      }
    } else {
      // Generate pool codes
      const count = body.count ?? Math.min(event.poolSize, 100);
      for (let i = 0; i < count; i++) {
        const code = await generateUniqueCode();
        codes.push({ code });
      }
    }

    // Create codes in transaction
    await withTx(async (tx) => {
      for (const codeData of codes) {
        await tx.qrCode.create({
          data: {
            eventId,
            code: codeData.code,
            assignedContact: codeData.assignedContact || null,
          },
        });
      }

      // Update generated count
      await tx.qrEvent.update({
        where: { id: eventId },
        data: { generated: { increment: codes.length } },
      });
    });

    res.json({ created: codes.length, codes: codes.map(c => c.code) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'validation_failed', details: error.errors });
      return;
    }
    console.error('Code generation error:', error);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

/**
 * Get QR code metadata for scanning
 * GET /api/qr/:code
 */
router.get('/:code', async (req: Request, res: Response) => {
  try {
    const code = req.params.code;

    const qrCode = await prisma.qrCode.findUnique({
      where: { code },
      include: {
        qrEvent: {
          include: { project: true }
        }
      }
    });

    if (!qrCode) {
      res.status(404).json({ error: 'code_not_found' });
      return;
    }

    const now = new Date();
    const event = qrCode.qrEvent;
    const project = event.project;

    const isActive = qrCode.status === 'ACTIVE' && 
                    now >= event.startAt && 
                    now <= event.endAt &&
                    project.status === 'ACTIVE';

    res.json({
      active: isActive,
      amount: fromAtomic(event.amountAtomic),
      assetCode: project.assetCode,
      eventId: event.id,
      eventName: project.name,
      status: qrCode.status,
      eventType: event.eventType,
    });
  } catch (error) {
    console.error('Code lookup error:', error);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

/**
 * Claim a QR code
 * POST /api/qr/claim
 */
router.post('/claim', claimLimiter, async (req: Request, res: Response) => {
  try {
    const body = ClaimCodeSchema.parse(req.body);

    const result = await withTx(async (tx) => {
      const qrCode = await tx.qrCode.findUnique({
        where: { code: body.code },
        include: {
          qrEvent: {
            include: { project: true }
          }
        }
      });

      if (!qrCode) {
        throw new Error('invalid_code');
      }

      const event = qrCode.qrEvent;
      const project = event.project;
      const now = new Date();

      // Validation checks
      if (qrCode.status !== 'ACTIVE') {
        throw new Error('code_already_used');
      }

      if (now < event.startAt || now > event.endAt) {
        throw new Error('event_inactive');
      }

      if (project.status !== 'ACTIVE') {
        throw new Error('project_inactive');
      }

      // Check if pool is exhausted for POOL type events
      if (event.eventType === 'POOL' && event.redeemed >= event.poolSize) {
        throw new Error('pool_exhausted');
      }

      // For ASSIGNED type, verify the wallet matches the assigned contact
      if (event.eventType === 'ASSIGNED' && qrCode.assignedContact) {
        const contact = await tx.contact.findUnique({ 
          where: { id: qrCode.assignedContact } 
        });
        if (contact?.wallet && contact.wallet !== body.wallet) {
          throw new Error('wallet_mismatch');
        }
      }

      // Mark code as used
      await tx.qrCode.update({
        where: { id: qrCode.id },
        data: {
          status: 'USED',
          claimedAt: now,
        },
      });

      // Update event stats
      await tx.qrEvent.update({
        where: { id: event.id },
        data: {
          redeemed: { increment: 1 },
          spentAtomic: { increment: event.amountAtomic },
        },
      });

      return {
        amount: fromAtomic(event.amountAtomic),
        assetCode: project.assetCode,
        claimId: qrCode.id,
      };
    });

    // TODO: Build and submit sponsored payment XDR here
    // For MVP, we'll return success without actual payment
    res.json({
      success: true,
      amount: result.amount,
      assetCode: result.assetCode,
      message: `${result.amount} ${result.assetCode} claimed successfully`,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'validation_failed', details: error.errors });
      return;
    }

    const errorMessage = error instanceof Error ? error.message : 'internal_server_error';
    
    switch (errorMessage) {
      case 'invalid_code':
        res.status(404).json({ error: 'invalid_code', message: 'QR code not found' });
        break;
      case 'code_already_used':
        res.status(400).json({ error: 'code_already_used', message: 'This QR code has already been claimed' });
        break;
      case 'event_inactive':
        res.status(400).json({ error: 'event_inactive', message: 'Event is not currently active' });
        break;
      case 'project_inactive':
        res.status(400).json({ error: 'project_inactive', message: 'Project is not active' });
        break;
      case 'pool_exhausted':
        res.status(400).json({ error: 'pool_exhausted', message: 'No more claims available for this event' });
        break;
      case 'wallet_mismatch':
        res.status(403).json({ error: 'wallet_mismatch', message: 'This QR code is assigned to a different wallet' });
        break;
      default:
        console.error('Claim error:', error);
        res.status(500).json({ error: 'internal_server_error' });
    }
  }
});

/**
 * Get projects list
 * GET /api/qr/projects
 */
router.get('/projects', async (req: Request, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        qrEvent: {
          include: {
            _count: {
              select: { codes: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ projects });
  } catch (error) {
    console.error('Projects fetch error:', error);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

/**
 * Get project details with QR event data
 * GET /api/qr/projects/:id
 */
router.get('/projects/:id', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        qrEvent: {
          include: {
            codes: {
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    });

    if (!project) {
      res.status(404).json({ error: 'project_not_found' });
      return;
    }

    res.json({ project });
  } catch (error) {
    console.error('Project fetch error:', error);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

export default router;
