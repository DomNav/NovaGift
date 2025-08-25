import React, { ReactNode } from 'react';
import { useFreighter } from '../hooks/useFreighter';
import { formatAddress } from '../lib/wallet';

interface WalletGateProps {
  children: ReactNode;
  onConnect?: () => void;
  onDisconnect?: () => void;
  fallbackMode?: 'demo' | 'disabled';
}

export function WalletGate({ 
  children, 
  onConnect, 
  onDisconnect,
  fallbackMode = 'demo' 
}: WalletGateProps) {
  const { 
    publicKey, 
    connected, 
    isInstalled, 
    connecting, 
    connect, 
    disconnect 
  } = useFreighter();

  const handleConnect = async () => {
    await connect();
    onConnect?.();
  };

  const handleDisconnect = async () => {
    await disconnect();
    onDisconnect?.();
  };

  // Show demo mode indicator when Freighter is not installed
  if (!isInstalled) {
    return (
      <div className="wallet-gate">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-yellow-800 font-medium">Demo Mode</span>
            </div>
            <div className="text-sm text-yellow-600">
              Install <a 
                href="https://www.freighter.app/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:text-yellow-700 font-medium"
              >
                Freighter Wallet
              </a> for full functionality
            </div>
          </div>
        </div>
        {fallbackMode === 'demo' ? (
          <div className="demo-mode-content opacity-75">
            {children}
          </div>
        ) : (
          <div className="disabled-content opacity-50 pointer-events-none">
            {children}
          </div>
        )}
      </div>
    );
  }

  // Show connect button when Freighter is installed but not connected
  if (!connected) {
    return (
      <div className="wallet-gate">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <svg className="w-12 h-12 text-blue-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Connect Your Wallet
          </h3>
          <p className="text-gray-600 mb-4">
            Connect your Freighter wallet to access all features
          </p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {connecting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zM9.954 4.569c-1.548 0-2.802 1.662-2.802 3.712 0 2.05 1.254 3.712 2.802 3.712 1.547 0 2.802-1.662 2.802-3.712 0-2.05-1.255-3.712-2.802-3.712z" clipRule="evenodd" />
                </svg>
                Connect Freighter
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Show connected state with wallet info
  return (
    <div className="wallet-gate">
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-800 font-medium">Connected</span>
            <span className="text-green-600 text-sm font-mono">
              {formatAddress(publicKey)}
            </span>
          </div>
          <button
            onClick={handleDisconnect}
            className="text-sm text-green-600 hover:text-green-700 underline"
          >
            Disconnect
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}