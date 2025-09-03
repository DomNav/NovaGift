import { prisma } from '../lib/prisma';
import crypto from 'crypto';

export interface FeatureFlagContext {
  userId?: string;
  email?: string;
  role?: string;
  environment?: string;
  [key: string]: any;
}

export interface FeatureFlagResult {
  enabled: boolean;
  reason: string;
  variant?: string;
}

export class FeatureFlagService {
  private static instance: FeatureFlagService;
  private cache: Map<string, { flag: any; expires: number }> = new Map();
  private readonly CACHE_TTL = 60 * 1000; // 1 minute

  static getInstance(): FeatureFlagService {
    if (!FeatureFlagService.instance) {
      FeatureFlagService.instance = new FeatureFlagService();
    }
    return FeatureFlagService.instance;
  }

  /**
   * Check if a feature flag is enabled for a given context
   */
  async isEnabled(
    flagKey: string,
    context: FeatureFlagContext = {}
  ): Promise<boolean> {
    const result = await this.evaluate(flagKey, context);
    return result.enabled;
  }

  /**
   * Evaluate a feature flag with detailed response
   */
  async evaluate(
    flagKey: string,
    context: FeatureFlagContext = {}
  ): Promise<FeatureFlagResult> {
    try {
      // Get flag from cache or database
      const flag = await this.getFlag(flagKey);
      
      if (!flag) {
        await this.logEvaluation(flagKey, context, false, 'Flag not found');
        return { enabled: false, reason: 'Flag not found' };
      }

      // Check if globally disabled
      if (!flag.enabled) {
        await this.logEvaluation(flagKey, context, false, 'Globally disabled');
        return { enabled: false, reason: 'Globally disabled' };
      }

      // Check conditions
      const conditionResult = await this.evaluateConditions(flag, context);
      if (conditionResult !== null) {
        await this.logEvaluation(
          flagKey,
          context,
          conditionResult.enabled,
          conditionResult.reason
        );
        return conditionResult;
      }

      // Check percentage rollout
      const rolloutResult = this.evaluateRollout(flag, context);
      await this.logEvaluation(
        flagKey,
        context,
        rolloutResult.enabled,
        rolloutResult.reason
      );
      return rolloutResult;

    } catch (error) {
      console.error(`Error evaluating feature flag ${flagKey}:`, error);
      return { enabled: false, reason: 'Evaluation error' };
    }
  }

  /**
   * Get all feature flags
   */
  async getAllFlags(): Promise<any[]> {
    return prisma.featureFlag.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Create a new feature flag
   */
  async createFlag(data: {
    key: string;
    name: string;
    description?: string;
    enabled?: boolean;
    rollout?: number;
    metadata?: any;
    conditions?: any;
  }): Promise<any> {
    const flag = await prisma.featureFlag.create({
      data: {
        ...data,
        rollout: data.rollout ?? 0,
        enabled: data.enabled ?? false,
      },
    });

    // Clear cache
    this.cache.delete(data.key);
    
    return flag;
  }

  /**
   * Update a feature flag
   */
  async updateFlag(
    key: string,
    data: Partial<{
      name: string;
      description: string;
      enabled: boolean;
      rollout: number;
      metadata: any;
      conditions: any;
    }>
  ): Promise<any> {
    const flag = await prisma.featureFlag.update({
      where: { key },
      data,
    });

    // Clear cache
    this.cache.delete(key);
    
    return flag;
  }

  /**
   * Delete a feature flag
   */
  async deleteFlag(key: string): Promise<void> {
    await prisma.featureFlag.delete({
      where: { key },
    });

    // Clear cache
    this.cache.delete(key);
  }

  /**
   * Get flag statistics
   */
  async getFlagStats(
    flagKey: string,
    hours = 24
  ): Promise<{
    total: number;
    enabled: number;
    disabled: number;
    enabledPercentage: number;
  }> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [total, enabled] = await Promise.all([
      prisma.featureFlagLog.count({
        where: {
          flagKey,
          createdAt: { gte: since },
        },
      }),
      prisma.featureFlagLog.count({
        where: {
          flagKey,
          evaluated: true,
          createdAt: { gte: since },
        },
      }),
    ]);

    const disabled = total - enabled;
    const enabledPercentage = total > 0 ? (enabled / total) * 100 : 0;

    return {
      total,
      enabled,
      disabled,
      enabledPercentage,
    };
  }

  /**
   * Private helper methods
   */
  private async getFlag(key: string): Promise<any> {
    // Check cache
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.flag;
    }

    // Get from database
    const flag = await prisma.featureFlag.findUnique({
      where: { key },
    });

    // Cache the result
    if (flag) {
      this.cache.set(key, {
        flag,
        expires: Date.now() + this.CACHE_TTL,
      });
    }

    return flag;
  }

  private async evaluateConditions(
    flag: any,
    context: FeatureFlagContext
  ): Promise<FeatureFlagResult | null> {
    if (!flag.conditions) {
      return null;
    }

    const conditions = flag.conditions as any;

    // User targeting
    if (conditions.users && context.userId) {
      const isTargeted = conditions.users.includes(context.userId);
      if (isTargeted) {
        return { enabled: true, reason: 'User targeted' };
      }
    }

    // Email domain targeting
    if (conditions.emailDomains && context.email) {
      const domain = context.email.split('@')[1];
      if (conditions.emailDomains.includes(domain)) {
        return { enabled: true, reason: 'Email domain targeted' };
      }
    }

    // Role targeting
    if (conditions.roles && context.role) {
      if (conditions.roles.includes(context.role)) {
        return { enabled: true, reason: 'Role targeted' };
      }
    }

    // Environment targeting
    if (conditions.environments) {
      const env = context.environment || process.env.NODE_ENV;
      if (!conditions.environments.includes(env)) {
        return { enabled: false, reason: 'Environment not targeted' };
      }
    }

    // Custom conditions (evaluated as simple key-value matches)
    if (conditions.custom) {
      for (const [key, value] of Object.entries(conditions.custom)) {
        if (context[key] !== value) {
          return { enabled: false, reason: `Custom condition failed: ${key}` };
        }
      }
    }

    return null;
  }

  private evaluateRollout(
    flag: any,
    context: FeatureFlagContext
  ): FeatureFlagResult {
    const rollout = flag.rollout || 0;

    if (rollout === 0) {
      return { enabled: false, reason: 'Rollout at 0%' };
    }

    if (rollout === 100) {
      return { enabled: true, reason: 'Rollout at 100%' };
    }

    // Calculate hash for consistent rollout
    const identifier = context.userId || context.email || 'anonymous';
    const hash = crypto
      .createHash('md5')
      .update(`${flag.key}:${identifier}`)
      .digest();
    
    const hashValue = hash.readUInt32BE(0);
    const percentage = (hashValue % 100) + 1;

    const enabled = percentage <= rollout;
    const reason = enabled
      ? `In rollout group (${percentage}% <= ${rollout}%)`
      : `Not in rollout group (${percentage}% > ${rollout}%)`;

    return { enabled, reason };
  }

  private async logEvaluation(
    flagKey: string,
    context: FeatureFlagContext,
    evaluated: boolean,
    reason: string
  ): Promise<void> {
    try {
      // Only log a sample to avoid overwhelming the database
      const shouldLog = Math.random() < 0.1; // Log 10% of evaluations
      
      if (shouldLog) {
        await prisma.featureFlagLog.create({
          data: {
            flagKey,
            userId: context.userId,
            evaluated,
            reason,
            metadata: context,
          },
        });
      }
    } catch (error) {
      console.error('Error logging feature flag evaluation:', error);
    }
  }
}

// Singleton instance export
export const featureFlags = FeatureFlagService.getInstance();

// Common feature flags
export const FLAGS = {
  NFT_ATTACHMENTS: 'nft_attachments',
  MULTI_ASSET_SUPPORT: 'multi_asset_support',
  SOCIAL_SHARING: 'social_sharing',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  CUSTOM_THEMES: 'custom_themes',
  SCHEDULED_GIFTS: 'scheduled_gifts',
  RECURRING_GIFTS: 'recurring_gifts',
  AI_MESSAGE_SUGGESTIONS: 'ai_message_suggestions',
} as const;