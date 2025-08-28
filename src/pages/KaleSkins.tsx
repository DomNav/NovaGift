import { useState } from 'react';
import { loginWithFreighter } from '../lib/auth';
import { setSessionToken } from '../lib/session';
import { SkinsGrid } from '../components/skins/SkinsGrid';

export default function KaleSkins() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  async function login() {
    setLoading(true);
    try {
      const { token, publicKey } = await loginWithFreighter();
      setSessionToken(token);
      setIsLoggedIn(true);
      console.log('Logged in as:', publicKey);
    } catch (e) {
      console.error('Login failed:', e);
      alert('Login failed. Please make sure Freighter is installed and connected.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">KALE Skins</h1>
        {!isLoggedIn && (
          <button
            onClick={login}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl shadow bg-brand-primary text-white hover:bg-brand-secondary disabled:opacity-50"
          >
            {loading ? 'Connecting...' : 'Connect Freighter'}
          </button>
        )}
        {isLoggedIn && <div className="text-sm text-green-600">✓ Connected</div>}
      </div>

      <p className="text-sm opacity-70 mb-4">
        Powered by Soroban · KALE · Your KALE never leaves your wallet.
      </p>

      {isLoggedIn ? (
        <SkinsGrid />
      ) : (
        <div className="text-center py-12 bg-brand-surface/50 dark:bg-brand-surface/20 rounded-2xl border border-surface-border">
          <p className="text-brand-text/70 dark:text-brand-text/80 mb-4">
            Connect your Freighter wallet to view KALE-gated skins
          </p>
          <button
            onClick={login}
            disabled={loading}
            className="px-6 py-2 rounded-xl bg-brand-primary text-white hover:bg-brand-secondary disabled:opacity-50"
          >
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      )}
    </div>
  );
}
