import { useState, useEffect, useCallback } from 'react';

interface StorageOptions {
  /** Expiry in milliseconds from now. If not provided, data never expires */
  expiryMs?: number;
  /** Whether to require functional storage consent (PIPEDA compliance) */
  requireConsent?: boolean;
}

interface StorageData<T> {
  value: T;
  timestamp: number;
  expiryMs?: number;
}

/**
 * Typed localStorage hook with expiry support and consent-aware wrapper for PIPEDA compliance.
 * 
 * @param key - localStorage key
 * @param defaultValue - default value if key doesn't exist or is expired
 * @param options - storage options including expiry and consent requirements
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  options: StorageOptions = {}
): [T, (value: T) => void, () => void] {
  const { expiryMs, requireConsent = false } = options;
  
  // Check if functional storage consent is granted
  const hasConsent = useCallback((): boolean => {
    if (!requireConsent) return true;
    
    // Check consent from localStorage (set by ConsentContext)
    try {
      return localStorage.getItem('nv.consent.functional') === 'true';
    } catch {
      // If localStorage access fails, default to no consent
      return false;
    }
  }, [requireConsent]);

  // Get stored value or default
  const getStoredValue = useCallback((): T => {
    if (!hasConsent()) {
      console.warn(`localStorage access for key "${key}" requires functional storage consent`);
      return defaultValue;
    }

    try {
      const item = localStorage.getItem(key);
      if (!item) return defaultValue;

      const parsed: StorageData<T> = JSON.parse(item);
      
      // Check if data has expired
      if (parsed.expiryMs && parsed.timestamp + parsed.expiryMs < Date.now()) {
        localStorage.removeItem(key);
        return defaultValue;
      }

      return parsed.value;
    } catch (error) {
      console.error(`Error reading from localStorage key "${key}":`, error);
      return defaultValue;
    }
  }, [key, defaultValue, hasConsent]);

  const [storedValue, setStoredValue] = useState<T>(getStoredValue);

  // Set value to localStorage
  const setValue = useCallback((value: T) => {
    if (!hasConsent()) {
      console.warn(`localStorage write for key "${key}" requires functional storage consent`);
      setStoredValue(value); // Update state but don't persist
      return;
    }

    try {
      const dataToStore: StorageData<T> = {
        value,
        timestamp: Date.now(),
        ...(expiryMs && { expiryMs })
      };
      
      localStorage.setItem(key, JSON.stringify(dataToStore));
      setStoredValue(value);
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error);
      setStoredValue(value); // Update state even if localStorage fails
    }
  }, [key, expiryMs, hasConsent]);

  // Clear value from localStorage
  const clearValue = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setStoredValue(defaultValue);
    } catch (error) {
      console.error(`Error removing from localStorage key "${key}":`, error);
    }
  }, [key, defaultValue]);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        setStoredValue(getStoredValue());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, getStoredValue]);

  // Check expiry on mount and set up interval if needed
  useEffect(() => {
    if (expiryMs) {
      const checkExpiry = () => {
        const current = getStoredValue();
        if (current !== storedValue) {
          setStoredValue(current);
        }
      };

      // Check every minute for expired data
      const interval = setInterval(checkExpiry, 60000);
      return () => clearInterval(interval);
    }
  }, [expiryMs, getStoredValue, storedValue]);

  return [storedValue, setValue, clearValue];
}

/**
 * Simple localStorage hook for boolean flags with consent support
 */
export function useLocalStorageFlag(
  key: string,
  defaultValue: boolean = false,
  options: StorageOptions = {}
): [boolean, (value: boolean) => void, () => void] {
  return useLocalStorage<boolean>(key, defaultValue, options);
}

/**
 * Export types for external use
 */
export type { StorageOptions, StorageData };
