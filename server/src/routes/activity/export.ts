import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { format } from 'fast-csv';
import { requireAuth } from '../../middleware/auth';

const router = Router();

const ExportQuerySchema = z.object({
  type: z.enum(['all', 'sent', 'received', 'created', 'returned', 'expired']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  projectId: z.string().optional(),
});

router.get('/export', requireAuth, async (req, res) => {
  try {
    // Validate query parameters
    const queryResult = ExportQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return res.status(400).json({ 
        error: 'Invalid query parameters',
        details: queryResult.error.errors 
      });
    }

    const { type, from, to, projectId } = queryResult.data;
    const userId = req.user?.id;

    // Build Prisma query
    const where: any = {
      OR: [
        { senderId: userId },
        { recipientId: userId },
      ],
    };

    // Apply type filter
    if (type && type !== 'all') {
      switch (type) {
        case 'sent':
          where.senderId = userId;
          delete where.OR;
          break;
        case 'received':
          where.recipientId = userId;
          delete where.OR;
          break;
        case 'created':
          where.status = 'sealed';
          break;
        case 'returned':
          where.status = 'returned';
          break;
        case 'expired':
          where.status = 'expired';
          break;
      }
    }

    // Apply date filters
    if (from || to) {
      where.createdAt = {};
      if (from) {
        where.createdAt.gte = new Date(from);
      }
      if (to) {
        const endDate = new Date(to);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    // Apply project filter
    if (projectId) {
      where.projectId = projectId;
    }

    // Fetch activity data
    const activities = await prisma.envelope.findMany({
      where,
      include: {
        sender: {
          select: {
            name: true,
            email: true,
          },
        },
        recipient: {
          select: {
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="activity-export-${new Date().toISOString().split('T')[0]}.csv"`);

    // Create CSV stream
    const csvStream = format({ headers: true });
    
    // Pipe to response
    csvStream.pipe(res);

    // Write data
    for (const activity of activities) {
      csvStream.write({
        id: activity.id,
        type: activity.senderId === userId ? 'sent' : 'received',
        status: activity.status,
        amount: activity.amount,
        asset: activity.asset,
        sender: activity.sender?.name || activity.sender?.email || 'Unknown',
        recipient: activity.recipient?.name || activity.recipient?.email || 'Unknown',
        project: activity.project?.name || '',
        message: activity.message || '',
        created: activity.createdAt.toISOString(),
        opened: activity.openedAt?.toISOString() || '',
        expires: activity.expiresAt?.toISOString() || '',
      });
    }

    // End stream
    csvStream.end();
  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({ 
      error: 'Failed to export activity data' 
    });
  }
});

// Resend envelope link
router.post('/:id/resend', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Check if user owns the envelope
    const envelope = await prisma.envelope.findFirst({
      where: {
        id,
        senderId: userId,
      },
    });

    if (!envelope) {
      return res.status(404).json({ error: 'Envelope not found' });
    }

    // TODO: Implement actual resend logic
    // This would involve regenerating the claim link and sending it via email/SMS

    return res.json({ 
      success: true, 
      message: 'Link resent successfully' 
    });
  } catch (error) {
    console.error('Resend error:', error);
    return res.status(500).json({ 
      error: 'Failed to resend link' 
    });
  }
});

// Return funds from envelope
router.post('/:id/return', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Check if user owns the envelope and it can be returned
    const envelope = await prisma.envelope.findFirst({
      where: {
        id,
        senderId: userId,
        status: { in: ['sealed', 'expired'] },
      },
    });

    if (!envelope) {
      return res.status(404).json({ 
        error: 'Envelope not found or cannot be returned' 
      });
    }

    // TODO: Implement actual fund return logic
    // This would involve blockchain transaction to return funds

    // Update envelope status
    await prisma.envelope.update({
      where: { id },
      data: {
        status: 'returned',
        returnedAt: new Date(),
      },
    });

    return res.json({ 
      success: true, 
      message: 'Funds returned successfully' 
    });
  } catch (error) {
    console.error('Return error:', error);
    return res.status(500).json({ 
      error: 'Failed to return funds' 
    });
  }
});

export default router;