import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ConsentPreferences {
  necessary: boolean; // Always true, required for basic functionality
  functional: boolean; // localStorage, preferences, etc.
  analytics: boolean; // Usage tracking, performance monitoring
  marketing: boolean; // Promotional content, targeted ads
}

interface ConsentContextType {
  preferences: ConsentPreferences;
  hasConsented: boolean;
  showConsentBanner: boolean;
  updatePreferences: (prefs: Partial<ConsentPreferences>) => void;
  acceptAll: () => void;
  rejectOptional: () => void;
  dismissBanner: () => void;
}

const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

const CONSENT_STORAGE_KEY = 'nv.consent.preferences';
const CONSENT_VERSION = '1.0';

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false,
  });
  
  const [hasConsented, setHasConsented] = useState(false);
  const [showConsentBanner, setShowConsentBanner] = useState(false);

  // Load consent preferences on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Check if consent version matches (for future consent updates)
        if (parsed.version === CONSENT_VERSION) {
          setPreferences(parsed.preferences);
          setHasConsented(true);
          setShowConsentBanner(false);
          return;
        }
      }
    } catch (error) {
      console.error('Error loading consent preferences:', error);
    }
    
    // Show banner if no valid consent found
    setShowConsentBanner(true);
  }, []);

  const updatePreferences = (newPrefs: Partial<ConsentPreferences>) => {
    const updated = { ...preferences, ...newPrefs, necessary: true };
    setPreferences(updated);
    
    // Save to localStorage (using basic localStorage since this is consent itself)
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({
        version: CONSENT_VERSION,
        preferences: updated,
        timestamp: Date.now(),
      }));
      
      // Also set individual flags for easy access by other parts of the app
      localStorage.setItem('nv.consent.functional', updated.functional.toString());
      localStorage.setItem('nv.consent.analytics', updated.analytics.toString());
      localStorage.setItem('nv.consent.marketing', updated.marketing.toString());
      
      setHasConsented(true);
    } catch (error) {
      console.error('Error saving consent preferences:', error);
    }
  };

  const acceptAll = () => {
    updatePreferences({
      functional: true,
      analytics: true,
      marketing: true,
    });
    setShowConsentBanner(false);
  };

  const rejectOptional = () => {
    updatePreferences({
      functional: false,
      analytics: false,
      marketing: false,
    });
    setShowConsentBanner(false);
  };

  const dismissBanner = () => {
    setShowConsentBanner(false);
  };

  return (
    <ConsentContext.Provider 
      value={{
        preferences,
        hasConsented,
        showConsentBanner,
        updatePreferences,
        acceptAll,
        rejectOptional,
        dismissBanner,
      }}
    >
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  const context = useContext(ConsentContext);
  if (context === undefined) {
    throw new Error('useConsent must be used within a ConsentProvider');
  }
  return context;
}

// Helper hooks for specific consent types
export function useFunctionalConsent(): boolean {
  const { preferences } = useConsent();
  return preferences.functional;
}

export function useAnalyticsConsent(): boolean {
  const { preferences } = useConsent();
  return preferences.analytics;
}

export function useMarketingConsent(): boolean {
  const { preferences } = useConsent();
  return preferences.marketing;
}
