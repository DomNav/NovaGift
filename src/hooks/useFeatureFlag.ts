import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';

interface FeatureFlagResult {
  enabled: boolean;
  reason: string;
  variant?: string;
}

interface FeatureFlagContext {
  userId?: string;
  email?: string;
  role?: string;
  environment?: string;
  [key: string]: any;
}

// Feature flag constants (sync with server)
export const FEATURE_FLAGS = {
  NFT_ATTACHMENTS: 'nft_attachments',
  MULTI_ASSET_SUPPORT: 'multi_asset_support',
  SOCIAL_SHARING: 'social_sharing',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  CUSTOM_THEMES: 'custom_themes',
  SCHEDULED_GIFTS: 'scheduled_gifts',
  RECURRING_GIFTS: 'recurring_gifts',
  AI_MESSAGE_SUGGESTIONS: 'ai_message_suggestions',
} as const;

export type FeatureFlagKey = typeof FEATURE_FLAGS[keyof typeof FEATURE_FLAGS];

// Cache for feature flag results
const flagCache = new Map<string, {
  result: FeatureFlagResult;
  expires: number;
}>();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to check if a feature flag is enabled
 */
export function useFeatureFlag(
  flagKey: FeatureFlagKey | string,
  defaultValue = false
): boolean {
  const [enabled, setEnabled] = useState<boolean>(defaultValue);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    checkFlag();
  }, [flagKey, user]);

  const checkFlag = async () => {
    try {
      // Check cache first
      const cached = flagCache.get(flagKey);
      if (cached && cached.expires > Date.now()) {
        setEnabled(cached.result.enabled);
        setLoading(false);
        return;
      }

      // Build context
      const context: FeatureFlagContext = {
        environment: import.meta.env.MODE,
      };

      if (user) {
        context.userId = user.id;
        context.email = user.email;
        context.role = user.role;
      }

      // Check flag via API
      const response = await fetch(`/api/feature-flags/check/${flagKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to check feature flag');
      }

      const data = await response.json();
      
      // Cache the result
      flagCache.set(flagKey, {
        result: { enabled: data.enabled, reason: 'API check' },
        expires: Date.now() + CACHE_TTL,
      });

      setEnabled(data.enabled);
    } catch (error) {
      console.error(`Error checking feature flag ${flagKey}:`, error);
      setEnabled(defaultValue);
    } finally {
      setLoading(false);
    }
  };

  return enabled;
}

/**
 * Hook to evaluate multiple feature flags
 */
export function useFeatureFlags(
  flags: Array<FeatureFlagKey | string>,
  context?: FeatureFlagContext
): Record<string, boolean> {
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    evaluateFlags();
  }, [JSON.stringify(flags), user]);

  const evaluateFlags = async () => {
    try {
      // Check cache for all flags
      const uncachedFlags: string[] = [];
      const cachedResults: Record<string, boolean> = {};

      for (const flag of flags) {
        const cached = flagCache.get(flag);
        if (cached && cached.expires > Date.now()) {
          cachedResults[flag] = cached.result.enabled;
        } else {
          uncachedFlags.push(flag);
        }
      }

      // If all flags are cached, return early
      if (uncachedFlags.length === 0) {
        setResults(cachedResults);
        setLoading(false);
        return;
      }

      // Build context
      const requestContext: FeatureFlagContext = {
        ...context,
        environment: import.meta.env.MODE,
      };

      if (user) {
        requestContext.userId = user.id;
        requestContext.email = user.email;
        requestContext.role = user.role;
      }

      // Evaluate uncached flags
      const response = await fetch('/api/feature-flags/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flags: uncachedFlags,
          context: requestContext,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to evaluate feature flags');
      }

      const data = await response.json();
      
      // Cache and combine results
      const allResults: Record<string, boolean> = { ...cachedResults };
      
      for (const [flag, result] of Object.entries(data.flags as Record<string, FeatureFlagResult>)) {
        flagCache.set(flag, {
          result,
          expires: Date.now() + CACHE_TTL,
        });
        allResults[flag] = result.enabled;
      }

      setResults(allResults);
    } catch (error) {
      console.error('Error evaluating feature flags:', error);
      
      // Set all flags to false on error
      const errorResults: Record<string, boolean> = {};
      for (const flag of flags) {
        errorResults[flag] = false;
      }
      setResults(errorResults);
    } finally {
      setLoading(false);
    }
  };

  return results;
}

/**
 * Component wrapper for feature flags
 */
export function FeatureFlag({
  flag,
  children,
  fallback = null,
}: {
  flag: FeatureFlagKey | string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const enabled = useFeatureFlag(flag);
  
  return React.createElement(React.Fragment, null, enabled ? children : fallback);
}

/**
 * Utility to clear the feature flag cache
 */
export function clearFeatureFlagCache() {
  flagCache.clear();
}

/**
 * Utility to manually set a flag in cache (for testing)
 */
export function setFeatureFlagCache(flag: string, enabled: boolean) {
  flagCache.set(flag, {
    result: { enabled, reason: 'Manual override' },
    expires: Date.now() + CACHE_TTL,
  });
}