import { useState } from 'react';
import { useToast } from '@/hooks/useToast';
import { useTheme } from '@/contexts/ThemeContext';
import { PaymentToggle } from '@/components/ui/PaymentToggle';
import clsx from 'clsx';

export const Settings = () => {
  const { addToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState({
    defaultExpiry: '7',
    autoReturn: true,
    notifications: true,
    currency: 'USDC',
    network: 'testnet',
    slippage: '0.5',
  });

  const handleSave = () => {
    // Save settings (mock)
    localStorage.setItem('novagift_settings', JSON.stringify(settings));
    addToast('Settings saved successfully!', 'success');
  };

  const handleReset = () => {
    const defaultSettings = {
      defaultExpiry: '7',
      autoReturn: true,
      notifications: true,
      currency: 'USDC',
      network: 'testnet',
      slippage: '0.5',
    };
    setSettings(defaultSettings);
    addToast('Settings reset to defaults', 'info');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-antonio gradient-text mb-2">Settings</h1>
        <p className="text-brand-text/60">Configure your NovaGift preferences</p>
      </div>

      <div className="space-y-6">
        {/* General Settings */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-medium mb-4">General</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Default Expiry (days)</label>
              <select
                value={settings.defaultExpiry}
                onChange={(e) => setSettings({ ...settings, defaultExpiry: e.target.value })}
                className="input-base"
              >
                <option value="1">1 day</option>
                <option value="3">3 days</option>
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="0">No expiry</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto-return expired funds</p>
                <p className="text-xs text-brand-text/60">
                  Automatically return unclaimed funds after expiry
                </p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, autoReturn: !settings.autoReturn })}
                className={clsx(
                  'relative w-12 h-6 rounded-full transition-colors duration-200',
                  settings.autoReturn ? 'bg-brand-primary' : 'bg-brand-surface'
                )}
              >
                <div
                  className={clsx(
                    'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200',
                    settings.autoReturn ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Enable notifications</p>
                <p className="text-xs text-brand-text/60">Get notified when envelopes are opened</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, notifications: !settings.notifications })}
                className={clsx(
                  'relative w-12 h-6 rounded-full transition-colors duration-200',
                  settings.notifications ? 'bg-brand-primary' : 'bg-brand-surface'
                )}
              >
                <div
                  className={clsx(
                    'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200',
                    settings.notifications ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-medium mb-4">Appearance</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Theme</p>
                <p className="text-xs text-brand-text/60">Toggle between light and dark mode</p>
              </div>
              <button
                onClick={toggleTheme}
                className={clsx(
                  'relative w-12 h-6 rounded-full transition-colors duration-200',
                  theme === 'dark' ? 'bg-brand-primary' : 'bg-gray-300'
                )}
              >
                <div
                  className={clsx(
                    'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 flex items-center justify-center',
                    theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                  )}
                >
                  <span className="text-xs">{theme === 'dark' ? '🌙' : '☀️'}</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Network Settings */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-medium mb-4">Network</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Default Currency</label>
              <PaymentToggle
                value={settings.currency as 'USDC' | 'XLM'}
                onChange={(currency) => setSettings({ ...settings, currency })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Network</label>
              <select
                value={settings.network}
                onChange={(e) => setSettings({ ...settings, network: e.target.value })}
                className="input-base"
              >
                <option value="testnet">Testnet</option>
                <option value="mainnet">Mainnet (Coming Soon)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Max Slippage (%)</label>
              <input
                type="number"
                value={settings.slippage}
                onChange={(e) => setSettings({ ...settings, slippage: e.target.value })}
                className="input-base"
                min="0.1"
                max="5"
                step="0.1"
              />
              <p className="text-xs text-brand-text/50 mt-1">Maximum price slippage for swaps</p>
            </div>
          </div>
        </div>

        {/* Advanced */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-medium mb-4">Advanced</h2>
          <div className="space-y-4">
            <div>
              <button className="btn-secondary text-sm w-full">Export Transaction History</button>
            </div>
            <div>
              <button className="btn-secondary text-sm w-full">Clear Local Cache</button>
            </div>
            <div>
              <button
                onClick={handleReset}
                className="text-sm text-red-400 hover:text-red-300 transition-colors w-full text-center py-2"
              >
                Reset All Settings
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            className="flex-1 relative flex items-center justify-center gap-3 px-6 py-3 rounded-full font-medium transition-all duration-300 active:scale-95 transform overflow-hidden text-white"
            style={{
              background: `linear-gradient(
                135deg,
                #1d2bff 0%,
                #4a5fff 15%,
                #6366f1 25%,
                #8b5cf6 35%,
                #64748b 45%,
                #475569 55%,
                #7c3aed 65%,
                #3b82f6 75%,
                #1e40af 85%,
                #1d2bff 100%
              )`,
              backgroundSize: '200% 200%',
              animation: 'granite-shift 4s ease-in-out infinite',
              boxShadow: `
                inset 0 1px 0 rgba(255, 255, 255, 0.1),
                0 4px 12px rgba(29, 43, 255, 0.3),
                0 2px 4px rgba(0, 0, 0, 0.2)
              `
            }}
          >
            <span>💾</span>
            <span className="font-semibold tracking-wide">Save Settings</span>
          </button>
          <button 
            onClick={handleReset} 
            className="flex-1 relative flex items-center justify-center gap-2 px-4 py-3 rounded-full transition-all duration-300 backdrop-blur-xl border border-slate-300 dark:border-slate-600 shadow-md hover:shadow-lg bg-white/80 dark:bg-slate-800/80 hover:bg-white/90 dark:hover:bg-slate-700/90 text-slate-700 dark:text-slate-200 font-medium"
          >
            <span className="font-semibold tracking-wide">Reset to Defaults</span>
          </button>
        </div>

        {/* About */}
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-brand-text/60">
            NovaGift v0.1.0 • Built on Stellar • Powered by Soroswap
          </p>
          <div className="flex justify-center gap-4 mt-2">
            <a href="#" className="text-xs text-brand-primary hover:text-brand-secondary">
              Documentation
            </a>
            <a href="#" className="text-xs text-brand-primary hover:text-brand-secondary">
              GitHub
            </a>
            <a href="#" className="text-xs text-brand-primary hover:text-brand-secondary">
              Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
