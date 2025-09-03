import { useState } from 'react';
import { useConsent } from '../contexts/ConsentContext';

export function ConsentBanner() {
  const { 
    showConsentBanner, 
    acceptAll, 
    rejectOptional, 
    updatePreferences, 
    dismissBanner 
  } = useConsent();
  
  const [showDetails, setShowDetails] = useState(false);
  const [customPrefs, setCustomPrefs] = useState({
    functional: false,
    analytics: false,
    marketing: false,
  });

  if (!showConsentBanner) {
    return null;
  }

  const handleCustomSave = () => {
    updatePreferences(customPrefs);
    dismissBanner();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 shadow-lg z-50">
      <div className="max-w-6xl mx-auto p-4">
        {!showDetails ? (
          // Simple banner
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
                We respect your privacy
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                We use cookies and localStorage to improve your experience. Some are necessary for basic functionality, 
                others help us understand usage and personalize content. You can customize your preferences anytime.
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
                🇨🇦 Your data is protected under Canadian PIPEDA regulations.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => setShowDetails(true)}
                className="px-4 py-2 text-sm border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
              >
                Customize
              </button>
              <button
                onClick={rejectOptional}
                className="px-4 py-2 text-sm border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
              >
                Necessary Only
              </button>
              <button
                onClick={acceptAll}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Accept All
              </button>
            </div>
          </div>
        ) : (
          // Detailed preferences
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
                Privacy Preferences
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                aria-label="Close detailed preferences"
              >
                ×
              </button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {/* Necessary */}
              <div className="p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-900">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-neutral-800 dark:text-neutral-200">
                    Necessary
                  </h4>
                  <span className="text-xs bg-neutral-300 dark:bg-neutral-600 text-neutral-700 dark:text-neutral-300 px-2 py-1 rounded">
                    Required
                  </span>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Essential for basic app functionality, security, and legal compliance.
                </p>
              </div>

              {/* Functional */}
              <div className="p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-neutral-800 dark:text-neutral-200">
                    Functional
                  </h4>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customPrefs.functional}
                      onChange={(e) => setCustomPrefs(prev => ({ ...prev, functional: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 bg-neutral-100 border-neutral-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-neutral-800 focus:ring-2 dark:bg-neutral-700 dark:border-neutral-600"
                    />
                  </label>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Save preferences, remember settings, enhance user experience.
                </p>
              </div>

              {/* Analytics */}
              <div className="p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-neutral-800 dark:text-neutral-200">
                    Analytics
                  </h4>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customPrefs.analytics}
                      onChange={(e) => setCustomPrefs(prev => ({ ...prev, analytics: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 bg-neutral-100 border-neutral-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-neutral-800 focus:ring-2 dark:bg-neutral-700 dark:border-neutral-600"
                    />
                  </label>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Help us understand usage patterns to improve the app.
                </p>
              </div>

              {/* Marketing */}
              <div className="p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-neutral-800 dark:text-neutral-200">
                    Marketing
                  </h4>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customPrefs.marketing}
                      onChange={(e) => setCustomPrefs(prev => ({ ...prev, marketing: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 bg-neutral-100 border-neutral-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-neutral-800 focus:ring-2 dark:bg-neutral-700 dark:border-neutral-600"
                    />
                  </label>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Personalized content and promotional communications.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
              <button
                onClick={rejectOptional}
                className="px-4 py-2 text-sm border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
              >
                Necessary Only
              </button>
              <button
                onClick={handleCustomSave}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
