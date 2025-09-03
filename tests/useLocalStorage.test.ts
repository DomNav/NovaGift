import { renderHook, act } from '@testing-library/react';
import { useLocalStorage, useLocalStorageFlag } from '../src/hooks/useLocalStorage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should return default value when no stored value exists', () => {
    const { result } = renderHook(() => 
      useLocalStorage('test-key', 'default-value')
    );

    expect(result.current[0]).toBe('default-value');
  });

  it('should store and retrieve values correctly', () => {
    const { result } = renderHook(() => 
      useLocalStorage('test-key', 'default-value')
    );

    act(() => {
      result.current[1]('new-value');
    });

    expect(result.current[0]).toBe('new-value');
    
    // Verify it's actually stored in localStorage
    const stored = JSON.parse(localStorage.getItem('test-key') || '{}');
    expect(stored.value).toBe('new-value');
  });

  it('should handle expiry correctly', async () => {
    // Set consent to allow storage
    localStorage.setItem('nv.consent.functional', 'true');

    const { result } = renderHook(() => 
      useLocalStorage('expiry-test', 'default', { 
        expiryMs: 100, // 100ms expiry
        requireConsent: true 
      })
    );

    // Set a value
    act(() => {
      result.current[1]('test-value');
    });

    expect(result.current[0]).toBe('test-value');

    // Wait for expiry
    await new Promise(resolve => setTimeout(resolve, 150));

    // Re-render to trigger expiry check
    const { result: newResult } = renderHook(() => 
      useLocalStorage('expiry-test', 'default', { 
        expiryMs: 100,
        requireConsent: true 
      })
    );

    expect(newResult.current[0]).toBe('default');
  });

  it('should respect consent requirements', () => {
    // No consent given
    localStorage.removeItem('nv.consent.functional');

    const { result } = renderHook(() => 
      useLocalStorage('consent-test', 'default', { requireConsent: true })
    );

    // Should return default value without consent
    expect(result.current[0]).toBe('default');

    // Try to set value - should update state but not localStorage
    act(() => {
      result.current[1]('should-not-persist');
    });

    expect(result.current[0]).toBe('should-not-persist');
    expect(localStorage.getItem('consent-test')).toBeNull();
  });

  it('should work without consent requirements', () => {
    const { result } = renderHook(() => 
      useLocalStorage('no-consent-test', 'default', { requireConsent: false })
    );

    act(() => {
      result.current[1]('persisted-value');
    });

    expect(result.current[0]).toBe('persisted-value');
    expect(localStorage.getItem('no-consent-test')).toBeTruthy();
  });

  it('should clear values correctly', () => {
    const { result } = renderHook(() => 
      useLocalStorage('clear-test', 'default')
    );

    // Set a value
    act(() => {
      result.current[1]('test-value');
    });

    expect(result.current[0]).toBe('test-value');

    // Clear the value
    act(() => {
      result.current[2](); // clearValue function
    });

    expect(result.current[0]).toBe('default');
    expect(localStorage.getItem('clear-test')).toBeNull();
  });

  it('should handle JSON parsing errors gracefully', () => {
    // Manually set invalid JSON in localStorage
    localStorage.setItem('invalid-json', 'invalid-json-string');

    const { result } = renderHook(() => 
      useLocalStorage('invalid-json', 'default')
    );

    expect(result.current[0]).toBe('default');
  });
});

describe('useLocalStorageFlag', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should work as a boolean flag', () => {
    const { result } = renderHook(() => 
      useLocalStorageFlag('flag-test', false)
    );

    expect(result.current[0]).toBe(false);

    act(() => {
      result.current[1](true);
    });

    expect(result.current[0]).toBe(true);
  });

  it('should default to false when no value provided', () => {
    const { result } = renderHook(() => 
      useLocalStorageFlag('default-flag-test')
    );

    expect(result.current[0]).toBe(false);
  });
});
