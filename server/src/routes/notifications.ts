import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client';

const router = Router();

// Validation schemas
const GetNotificationsSchema = z.object({
  walletAddress: z.string().min(56).max(56), // Stellar public key length
  limit: z.number().min(1).max(50).optional().default(20),
  offset: z.number().min(0).optional().default(0),
});

interface NotificationData {
  id: string;
  type: 'envelope_received' | 'envelope_opened' | 'envelope_expired' | 'system';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  envelopeId?: string;
  amountUsd?: number;
  asset?: string;
  actionUrl?: string;
}

interface NotificationSummary {
  totalUnread: number;
  pendingEnvelopes: number;
  recentNotifications: NotificationData[];
}

/**
 * GET /api/notifications/:walletAddress
 * Get notifications for a specific wallet address
 */
router.get('/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    const query = GetNotificationsSchema.parse({
      walletAddress,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    });

    // Get envelopes where this wallet is the recipient and they're funded but not opened
    const pendingEnvelopes = await prisma.envelope.findMany({
      where: {
        recipient: walletAddress,
        status: 'FUNDED',
      },
      orderBy: {
        fundedAt: 'desc',
      },
    });

    // Get envelopes where this wallet is the sender and they've been opened recently
    const recentlyOpenedEnvelopes = await prisma.envelope.findMany({
      where: {
        sender: walletAddress,
        status: 'OPENED',
        openedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      orderBy: {
        openedAt: 'desc',
      },
      take: 10,
    });

    // Convert to notification format
    const notifications: NotificationData[] = [];

    // Add pending envelope notifications
    pendingEnvelopes.forEach((envelope) => {
      notifications.push({
        id: `env_received_${envelope.id}`,
        type: 'envelope_received',
        title: 'New Gift Received! 🎁',
        message: `You received a $${parseFloat(envelope.amount.toString()).toFixed(2)} ${envelope.asset} gift envelope`,
        timestamp: envelope.fundedAt?.getTime() || envelope.createdAt.getTime(),
        read: false,
        envelopeId: envelope.id,
        amountUsd: parseFloat(envelope.amount.toString()),
        asset: envelope.asset,
        actionUrl: `/open?e=${envelope.id}`,
      });
    });

    // Add opened envelope notifications for senders
    recentlyOpenedEnvelopes.forEach((envelope) => {
      notifications.push({
        id: `env_opened_${envelope.id}`,
        type: 'envelope_opened',
        title: 'Gift Claimed ✅',
        message: `Your $${parseFloat(envelope.amount.toString()).toFixed(2)} gift was successfully claimed`,
        timestamp: envelope.openedAt?.getTime() || envelope.createdAt.getTime(),
        read: true, // Mark as read since they're just informational
        envelopeId: envelope.id,
        amountUsd: parseFloat(envelope.amount.toString()),
      });
    });

    // Sort by timestamp descending
    notifications.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    const paginatedNotifications = notifications.slice(
      query.offset,
      query.offset + query.limit
    );

    // Calculate summary
    const unreadNotifications = notifications.filter(n => !n.read);
    const pendingEnvelopeCount = pendingEnvelopes.length;

    const summary: NotificationSummary = {
      totalUnread: unreadNotifications.length,
      pendingEnvelopes: pendingEnvelopeCount,
      recentNotifications: paginatedNotifications,
    };

    return res.json({
      ok: true,
      data: summary,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        ok: false,
        error: 'Invalid input', 
        details: error.issues 
      });
    }
    
    return res.status(500).json({ 
      ok: false,
      error: 'Failed to fetch notifications' 
    });
  }
});

/**
 * POST /api/notifications/:notificationId/read
 * Mark a notification as read
 */
router.post('/:notificationId/read', async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;
    const walletAddress = req.body.walletAddress as string;

    if (!walletAddress) {
      return res.status(400).json({ 
        ok: false,
        error: 'Wallet address required' 
      });
    }

    // For now, we'll just return success since we don't store read status in the database
    // In a full implementation, you'd want to store notification read status
    // TODO: Add notification read status tracking to database

    return res.json({
      ok: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    
    return res.status(500).json({ 
      ok: false,
      error: 'Failed to mark notification as read' 
    });
  }
});

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read for a wallet
 */
router.post('/mark-all-read', async (req: Request, res: Response) => {
  try {
    const walletAddress = req.body.walletAddress as string;

    if (!walletAddress) {
      return res.status(400).json({ 
        ok: false,
        error: 'Wallet address required' 
      });
    }

    // For now, we'll just return success since we don't store read status in the database
    // In a full implementation, you'd want to store notification read status
    // TODO: Add notification read status tracking to database

    return res.json({
      ok: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    
    return res.status(500).json({ 
      ok: false,
      error: 'Failed to mark all notifications as read' 
    });
  }
});

export default router;
