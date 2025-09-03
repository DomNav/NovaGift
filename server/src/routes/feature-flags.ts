import { Router } from 'express';
import { z } from 'zod';
import { featureFlags, FLAGS, FeatureFlagContext } from '../services/feature-flags';
import { validateRequest } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Schema definitions
const evaluateSchema = z.object({
  flags: z.array(z.string()),
  context: z.object({
    userId: z.string().optional(),
    email: z.string().email().optional(),
    role: z.string().optional(),
    environment: z.string().optional(),
  }).catchall(z.any()).optional(),
});

const createFlagSchema = z.object({
  key: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  rollout: z.number().min(0).max(100).optional(),
  metadata: z.any().optional(),
  conditions: z.any().optional(),
});

const updateFlagSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  rollout: z.number().min(0).max(100).optional(),
  metadata: z.any().optional(),
  conditions: z.any().optional(),
});

/**
 * GET /api/feature-flags/evaluate
 * Evaluate multiple feature flags for a given context
 */
router.post('/evaluate', async (req, res) => {
  try {
    const { flags, context = {} } = evaluateSchema.parse(req.body);

    // Add user context if authenticated
    if ((req as any).user) {
      context.userId = context.userId || (req as any).user.id;
      context.email = context.email || (req as any).user.email;
      context.role = context.role || (req as any).user.role;
    }

    // Evaluate all requested flags
    const results: Record<string, any> = {};
    
    for (const flagKey of flags) {
      const result = await featureFlags.evaluate(flagKey, context);
      results[flagKey] = result;
    }

    res.json({
      ok: true,
      flags: results,
      context,
    });
  } catch (error: any) {
    console.error('Error evaluating feature flags:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to evaluate feature flags',
    });
  }
});

/**
 * GET /api/feature-flags/check/:key
 * Quick check if a single flag is enabled
 */
router.get('/check/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    // Build context from request
    const context: FeatureFlagContext = {};
    
    if ((req as any).user) {
      context.userId = (req as any).user.id;
      context.email = (req as any).user.email;
      context.role = (req as any).user.role;
    }

    const enabled = await featureFlags.isEnabled(key, context);

    res.json({
      ok: true,
      flag: key,
      enabled,
    });
  } catch (error: any) {
    console.error('Error checking feature flag:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to check feature flag',
    });
  }
});

/**
 * GET /api/feature-flags/list
 * List all available feature flags (admin only)
 */
router.get('/list', requireAuth, async (req, res) => {
  try {
    // Check admin permissions
    if ((req as any).user?.role !== 'admin') {
      return res.status(403).json({
        ok: false,
        error: 'Admin access required',
      });
    }

    const flags = await featureFlags.getAllFlags();

    res.json({
      ok: true,
      flags,
    });
  } catch (error: any) {
    console.error('Error listing feature flags:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to list feature flags',
    });
  }
});

/**
 * POST /api/feature-flags
 * Create a new feature flag (admin only)
 */
router.post('/', requireAuth, validateRequest(createFlagSchema), async (req, res) => {
  try {
    // Check admin permissions
    if ((req as any).user?.role !== 'admin') {
      return res.status(403).json({
        ok: false,
        error: 'Admin access required',
      });
    }

    const flag = await featureFlags.createFlag(req.body);

    res.json({
      ok: true,
      flag,
    });
  } catch (error: any) {
    console.error('Error creating feature flag:', error);
    
    if (error.code === 'P2002') {
      return res.status(409).json({
        ok: false,
        error: 'Feature flag with this key already exists',
      });
    }

    res.status(500).json({
      ok: false,
      error: 'Failed to create feature flag',
    });
  }
});

/**
 * PATCH /api/feature-flags/:key
 * Update a feature flag (admin only)
 */
router.patch('/:key', requireAuth, validateRequest(updateFlagSchema), async (req, res) => {
  try {
    // Check admin permissions
    if ((req as any).user?.role !== 'admin') {
      return res.status(403).json({
        ok: false,
        error: 'Admin access required',
      });
    }

    const { key } = req.params;
    const flag = await featureFlags.updateFlag(key, req.body);

    res.json({
      ok: true,
      flag,
    });
  } catch (error: any) {
    console.error('Error updating feature flag:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        ok: false,
        error: 'Feature flag not found',
      });
    }

    res.status(500).json({
      ok: false,
      error: 'Failed to update feature flag',
    });
  }
});

/**
 * DELETE /api/feature-flags/:key
 * Delete a feature flag (admin only)
 */
router.delete('/:key', requireAuth, async (req, res) => {
  try {
    // Check admin permissions
    if ((req as any).user?.role !== 'admin') {
      return res.status(403).json({
        ok: false,
        error: 'Admin access required',
      });
    }

    const { key } = req.params;
    await featureFlags.deleteFlag(key);

    res.json({
      ok: true,
      message: 'Feature flag deleted',
    });
  } catch (error: any) {
    console.error('Error deleting feature flag:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        ok: false,
        error: 'Feature flag not found',
      });
    }

    res.status(500).json({
      ok: false,
      error: 'Failed to delete feature flag',
    });
  }
});

/**
 * GET /api/feature-flags/:key/stats
 * Get usage statistics for a feature flag (admin only)
 */
router.get('/:key/stats', requireAuth, async (req, res) => {
  try {
    // Check admin permissions
    if ((req as any).user?.role !== 'admin') {
      return res.status(403).json({
        ok: false,
        error: 'Admin access required',
      });
    }

    const { key } = req.params;
    const hours = parseInt(req.query.hours as string) || 24;
    
    const stats = await featureFlags.getFlagStats(key, hours);

    res.json({
      ok: true,
      flag: key,
      period: `${hours} hours`,
      stats,
    });
  } catch (error: any) {
    console.error('Error getting feature flag stats:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to get feature flag statistics',
    });
  }
});

/**
 * GET /api/feature-flags/constants
 * Get available flag constants for client SDK
 */
router.get('/constants', (req, res) => {
  res.json({
    ok: true,
    flags: FLAGS,
  });
});

export default router;