import { useState, useEffect, useRef } from 'react';
import { formatAddress } from '@/lib/wallet';
import { useRewards } from '@/store/rewards';
import { usd } from '@/utils/rewards';
import { useBalances } from '@/hooks/useBalances';
import { useNotifications } from '@/hooks/useNotifications';
import { usePrices } from '@/hooks/usePrices';
import { useTheme } from '@/contexts/ThemeContext';

interface UnifiedHeaderPillProps {
  wallet: { publicKey: string; connected: boolean } | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const UnifiedHeaderPill = ({ wallet, onConnect, onDisconnect }: UnifiedHeaderPillProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDisconnectMenu, setShowDisconnectMenu] = useState(false);

  const [activeSection, setActiveSection] = useState<'prices' | 'balance' | 'notifications' | null>(null);
  const [pillPosition, setPillPosition] = useState({ top: 0, left: 0, width: 0 });
  
  const pillRef = useRef<HTMLDivElement>(null);

  
  // Hooks
  const { theme } = useTheme();
  const { sendCount, totalUsdCents } = useRewards();
  const { xlm, balances, loading: balanceLoading } = useBalances(wallet?.publicKey || null);
  const { summary, markAsRead, markAllAsRead } = useNotifications();
  const { data: priceData, isLoading: priceLoading } = usePrices();

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pillRef.current && !pillRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
        setActiveSection(null);
        setShowDisconnectMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update pill position when expanding
  const updatePillPosition = () => {
    if (pillRef.current) {
      const rect = pillRef.current.getBoundingClientRect();
      setPillPosition({
        top: rect.bottom + 16, // 16px gap (mt-4)
        left: rect.left,
        width: rect.width
      });
    }
  };

  const toggleSection = (section: 'prices' | 'balance' | 'notifications') => {
    if (activeSection === section) {
      setIsExpanded(false);
      setActiveSection(null);
    } else {
      updatePillPosition();
      setIsExpanded(true);
      setActiveSection(section);
    }
  };

  // Update position on window resize
  useEffect(() => {
    if (isExpanded) {
      const handleResize = () => updatePillPosition();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isExpanded]);

  const currentPrice = priceData?.find(p => p.symbol === 'XLM')?.priceUsd || 0;
  const xlmBalance = parseFloat(xlm || '0');

  return (
    <div className="relative" ref={pillRef}>
             {/* Main Unified Pill */}
       <div className={`relative flex items-center backdrop-blur-xl rounded-full px-6 py-3 transition-all duration-500 group before:absolute before:inset-0 before:rounded-full before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 shadow-lg hover:shadow-xl ${
         theme === 'dark' 
           ? 'bg-gradient-to-r from-gray-800/90 via-gray-900/95 to-gray-800/90 hover:from-gray-700/95 hover:via-gray-800/95 hover:to-gray-700/95 before:bg-gradient-to-r before:from-amber-500/10 before:via-transparent before:to-amber-500/10 hover:shadow-amber-500/20' 
           : 'bg-gradient-to-r from-white/80 via-gray-50/90 to-white/80 hover:from-white/90 hover:via-gray-100/95 hover:to-white/90 before:bg-gradient-to-r before:from-amber-500/5 before:via-transparent before:to-amber-500/5 hover:shadow-amber-500/10'
       }`}>
        
        {/* Price Ticker Section */}
        <div 
          className={`relative flex items-center gap-3 px-4 py-2 rounded-full transition-all duration-300 cursor-pointer group/price backdrop-blur-sm z-10 ${
            theme === 'dark'
              ? 'hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-blue-500/20'
              : 'hover:bg-gradient-to-r hover:from-cyan-500/10 hover:to-blue-500/10'
          }`}
          onClick={() => toggleSection('prices')}
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              theme === 'dark' ? 'bg-cyan-400' : 'bg-cyan-500'
            }`}></div>
            <span className={`text-xs font-bold tracking-wider ${
              theme === 'dark' ? 'text-cyan-300' : 'text-cyan-600'
            }`}>XLM</span>
          </div>
          <span className={`text-sm font-mono font-medium tracking-tight ${
            theme === 'dark' ? 'text-white/95' : 'text-gray-800'
          }`}>
            {priceLoading ? (
              <span className="animate-pulse text-gray-400">Loading...</span>
            ) : (
              <span className={theme === 'dark' ? 'text-emerald-300' : 'text-emerald-600'}>${currentPrice.toFixed(4)}</span>
            )}
          </span>
        </div>

        <div className={`w-px h-6 mx-3 ${
          theme === 'dark' ? 'bg-gradient-to-b from-transparent via-amber-500/30 to-transparent' : 'bg-gradient-to-b from-transparent via-amber-500/20 to-transparent'
        }`} />

        {/* Aura Points Section */}
        <div className={`relative flex items-center gap-3 px-4 py-2 rounded-full transition-all duration-300 cursor-pointer group/aura backdrop-blur-sm z-10 ${
          theme === 'dark'
            ? 'hover:bg-gradient-to-r hover:from-violet-500/20 hover:to-purple-500/20'
            : 'hover:bg-gradient-to-r hover:from-violet-500/10 hover:to-purple-500/10'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              theme === 'dark' ? 'bg-violet-400' : 'bg-violet-500'
            }`}></div>
            <span className={`text-xs font-bold tracking-wider ${
              theme === 'dark' ? 'text-violet-300' : 'text-violet-600'
            }`}>AP</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-mono font-medium">
            <span className={theme === 'dark' ? 'text-violet-200' : 'text-violet-700'}>{sendCount}</span>
            <span className={`${theme === 'dark' ? 'text-amber-400' : 'text-amber-500'} font-bold`}>•</span>
            <span className={`font-semibold ${
              theme === 'dark' ? 'text-emerald-300' : 'text-emerald-600'
            }`}>{usd(totalUsdCents, 0)}</span>
          </div>
        </div>

        <div className={`w-px h-6 mx-3 ${
          theme === 'dark' ? 'bg-gradient-to-b from-transparent via-amber-500/30 to-transparent' : 'bg-gradient-to-b from-transparent via-amber-500/20 to-transparent'
        }`} />

        {/* Balance Section */}
        <div 
          className={`relative flex items-center gap-3 px-4 py-2 rounded-full transition-all duration-300 cursor-pointer group/balance backdrop-blur-sm z-10 ${
            theme === 'dark'
              ? 'hover:bg-gradient-to-r hover:from-emerald-500/20 hover:to-green-500/20'
              : 'hover:bg-gradient-to-r hover:from-emerald-500/10 hover:to-green-500/10'
          }`}
          onClick={() => toggleSection('balance')}
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              theme === 'dark' ? 'bg-emerald-400' : 'bg-emerald-500'
            }`}></div>
            <span className={`text-xs font-bold tracking-wider ${
              theme === 'dark' ? 'text-emerald-300' : 'text-emerald-600'
            }`}>Balance</span>
          </div>
          <span className={`text-sm font-mono font-medium tracking-tight ${
            theme === 'dark' ? 'text-white/60' : 'text-gray-600'
          }`}>
            {balanceLoading ? (
              <span className="animate-pulse text-gray-400">•••</span>
            ) : (
              <span className={theme === 'dark' ? 'text-emerald-400/60' : 'text-emerald-500/60'}>•••</span>
            )}
          </span>
        </div>

        <div className={`w-px h-6 mx-3 ${
          theme === 'dark' ? 'bg-gradient-to-b from-transparent via-amber-500/30 to-transparent' : 'bg-gradient-to-b from-transparent via-amber-500/20 to-transparent'
        }`} />

                 {/* Notifications Section */}
         <div 
           className={`relative flex items-center gap-3 px-4 py-2 rounded-full transition-all duration-300 cursor-pointer group/notifications backdrop-blur-xl z-10 border border-surface-border dark:border-transparent shadow-lg hover:shadow-xl ${
             theme === 'dark'
               ? 'hover:bg-gradient-to-r hover:from-amber-500/20 hover:to-yellow-500/20'
               : 'hover:bg-gradient-to-r hover:from-amber-500/10 hover:to-yellow-500/10'
           }`}
           onClick={() => toggleSection('notifications')}
         >
           <div className="relative flex items-center">
             <span className="text-sm filter drop-shadow-sm">🔔</span>
            {summary.totalUnread > 0 && (
              <div className={`absolute -top-2 -right-2 min-w-[18px] h-[18px] text-white text-xs font-bold rounded-full flex items-center justify-center px-1 animate-pulse border ${
                theme === 'dark' 
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 border-red-300/50' 
                  : 'bg-gradient-to-r from-red-500 to-pink-500 border-red-400/50'
              }`}>
                {summary.totalUnread > 9 ? '9+' : summary.totalUnread}
              </div>
            )}
            {summary.pendingEnvelopes > 0 && (
              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse ${
                theme === 'dark' ? 'bg-gradient-to-r from-emerald-400 to-green-400' : 'bg-gradient-to-r from-emerald-500 to-green-500'
              }`}></div>
            )}
          </div>
        </div>

        <div className={`w-px h-6 mx-3 ${
          theme === 'dark' ? 'bg-gradient-to-b from-transparent via-amber-500/30 to-transparent' : 'bg-gradient-to-b from-transparent via-amber-500/20 to-transparent'
        }`} />

        {/* Wallet Section */}
        {wallet && wallet.connected && wallet.publicKey ? (
          <div className="relative">
            <div
              onClick={() => {
                if (!showDisconnectMenu) {
                  updatePillPosition();
                }
                setShowDisconnectMenu(!showDisconnectMenu);
              }}
              className={`relative flex items-center gap-3 px-4 py-2 rounded-full transition-all duration-300 cursor-pointer group/wallet backdrop-blur-sm z-10 ${
                theme === 'dark'
                  ? 'hover:bg-gradient-to-r hover:from-slate-500/20 hover:to-gray-500/20'
                  : 'hover:bg-gradient-to-r hover:from-slate-500/10 hover:to-gray-500/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full animate-pulse border ${
                  theme === 'dark' 
                    ? 'bg-gradient-to-r from-emerald-400 to-green-400 border-emerald-300/50' 
                    : 'bg-gradient-to-r from-emerald-500 to-green-500 border-emerald-400/50'
                }`}></div>
                <span className={`text-xs font-mono font-medium tracking-wider ${
                  theme === 'dark' ? 'text-slate-200' : 'text-slate-700'
                }`}>{formatAddress(wallet.publicKey)}</span>
              </div>
              <svg
                className={`w-4 h-4 transition-all duration-300 ${
                  theme === 'dark' ? 'text-amber-400' : 'text-amber-500'
                } ${showDisconnectMenu ? 'rotate-180' : ''} ${
                  theme === 'dark' 
                    ? 'group-hover/wallet:text-amber-300' 
                    : 'group-hover/wallet:text-amber-600'
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Disconnect Menu */}
            {showDisconnectMenu && (
              <div 
                className={`fixed w-56 backdrop-blur-xl border rounded-xl z-[9999] overflow-hidden shadow-2xl ${
                  theme === 'dark'
                    ? 'bg-gradient-to-br from-black/95 via-gray-900/95 to-black/95 border-amber-500/30'
                    : 'bg-gradient-to-br from-white/95 via-gray-50/95 to-white/95 border-amber-500/20'
                }`}
                style={{
                  top: pillPosition.top,
                  left: pillPosition.left + pillPosition.width - 224, // 224px = w-56 (14rem * 16px)
                }}
              >
                <div className="p-3">
                  <div className={`mb-3 p-3 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-slate-800/50 to-gray-800/50 border-slate-600/30'
                      : 'bg-gradient-to-r from-slate-100/50 to-gray-100/50 border-slate-300/30'
                  }`}>
                    <div className={`text-xs mb-1 font-medium ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    }`}>Connected Wallet</div>
                    <div className={`text-xs font-mono break-all ${
                      theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                    }`}>{wallet.publicKey}</div>
                  </div>
                  <button
                    onClick={onDisconnect}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm rounded-lg transition-all duration-300 border border-transparent font-medium ${
                      theme === 'dark'
                        ? 'text-red-300 hover:text-red-200 hover:bg-gradient-to-r hover:from-red-500/20 hover:to-pink-500/20 hover:border-red-400/30'
                        : 'text-red-600 hover:text-red-700 hover:bg-gradient-to-r hover:from-red-500/10 hover:to-pink-500/10 hover:border-red-400/30'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Disconnect Wallet</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onConnect}
            className={`relative flex items-center gap-3 px-6 py-2 rounded-full transition-all duration-300 backdrop-blur-xl group/connect border border-surface-border dark:border-transparent shadow-lg hover:shadow-xl ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-blue-600/80 to-indigo-600/80 hover:from-blue-500/90 hover:to-indigo-500/90'
                : 'bg-gradient-to-r from-blue-500/80 to-indigo-500/80 hover:from-blue-400/90 hover:to-indigo-400/90'
            }`}
          >
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              theme === 'dark' ? 'bg-blue-300' : 'bg-blue-100'
            }`}></div>
            <span className={`text-sm font-semibold tracking-wide ${
              theme === 'dark' ? 'text-blue-100' : 'text-white'
            }`}>Connect Wallet</span>
            <div className={`absolute inset-0 rounded-full opacity-0 group-hover/connect:opacity-100 transition-opacity duration-300 ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-blue-400/20 to-indigo-400/20'
                : 'bg-gradient-to-r from-blue-300/20 to-indigo-300/20'
            }`}></div>
          </button>
        )}
      </div>

      {/* Expanded Details Panel */}
      {isExpanded && activeSection && (
        <div 
          className={`fixed backdrop-blur-xl border rounded-xl z-[9999] p-6 overflow-hidden shadow-2xl ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-black/95 via-gray-900/95 to-black/95 border-amber-500/30'
              : 'bg-gradient-to-br from-white/95 via-gray-50/95 to-white/95 border-amber-500/20'
          }`}
          style={{
            top: pillPosition.top,
            left: pillPosition.left,
            width: pillPosition.width,
            maxWidth: '500px',
            minWidth: '400px'
          }}
        >
          <div className={`absolute inset-0 pointer-events-none ${
            theme === 'dark'
              ? 'bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5'
              : 'bg-gradient-to-r from-amber-500/3 via-transparent to-amber-500/3'
          }`}></div>
          
          {activeSection === 'prices' && (
            <div className="relative space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  theme === 'dark' ? 'bg-gradient-to-r from-cyan-400 to-blue-400' : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                }`}></div>
                <h3 className={`text-lg font-bold bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent ${
                  theme === 'dark' ? 'from-cyan-300 to-blue-300' : 'from-cyan-600 to-blue-600'
                }`}>Live Market Prices</h3>
              </div>
              <div className="space-y-3">
                {priceData?.map((price) => (
                  <div 
                    key={price.symbol}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-300 ${
                      theme === 'dark'
                        ? 'bg-gradient-to-r from-slate-800/40 to-gray-800/40 border-slate-600/30 hover:border-cyan-400/30'
                        : 'bg-gradient-to-r from-slate-100/40 to-gray-100/40 border-slate-300/30 hover:border-cyan-500/30'
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full animate-pulse ${
                        theme === 'dark' ? 'bg-gradient-to-r from-cyan-400 to-blue-400' : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                      }`}></div>
                      <span className={`text-sm font-semibold tracking-wide ${
                        theme === 'dark' ? 'text-slate-200' : 'text-slate-700'
                      }`}>{price.symbol}</span>
                    </div>
                    <span className={`text-sm font-mono font-bold tracking-tight ${
                      theme === 'dark' ? 'text-emerald-300' : 'text-emerald-600'
                    }`}>${price.priceUsd.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'balance' && (
            <div className="relative space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  theme === 'dark' ? 'bg-gradient-to-r from-emerald-400 to-green-400' : 'bg-gradient-to-r from-emerald-500 to-green-500'
                }`}></div>
                <h3 className={`text-lg font-bold bg-gradient-to-r from-emerald-300 to-green-300 bg-clip-text text-transparent ${
                  theme === 'dark' ? 'from-emerald-300 to-green-300' : 'from-emerald-600 to-green-600'
                }`}>Account Balances</h3>
              </div>
              <div className="space-y-3">
                <div className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-300 ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-slate-800/40 to-gray-800/40 border-slate-600/30 hover:border-emerald-400/30'
                    : 'bg-gradient-to-r from-slate-100/40 to-gray-100/40 border-slate-300/30 hover:border-emerald-500/30'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${
                      theme === 'dark' ? 'bg-gradient-to-r from-emerald-400 to-green-400' : 'bg-gradient-to-r from-emerald-500 to-green-500'
                    }`}></div>
                    <span className={`text-sm font-semibold tracking-wide ${
                      theme === 'dark' ? 'text-slate-200' : 'text-slate-700'
                    }`}>XLM</span>
                  </div>
                  <span className={`text-sm font-mono font-bold tracking-tight ${
                    theme === 'dark' ? 'text-emerald-300' : 'text-emerald-600'
                  }`}>{xlmBalance.toFixed(7)}</span>
                </div>
                {balances.filter(b => b.code !== 'XLM').map((balance) => (
                  <div className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-300 ${
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-slate-800/40 to-gray-800/40 border-slate-600/30 hover:border-emerald-400/30'
                      : 'bg-gradient-to-r from-slate-100/40 to-gray-100/40 border-slate-300/30 hover:border-emerald-500/30'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full animate-pulse ${
                        theme === 'dark' ? 'bg-gradient-to-r from-emerald-400 to-green-400' : 'bg-gradient-to-r from-emerald-500 to-green-500'
                      }`}></div>
                      <span className={`text-sm font-semibold tracking-wide ${
                        theme === 'dark' ? 'text-slate-200' : 'text-slate-700'
                      }`}>{balance.code}</span>
                    </div>
                    <span className={`text-sm font-mono font-bold tracking-tight ${
                      theme === 'dark' ? 'text-emerald-300' : 'text-emerald-600'
                    }`}>{parseFloat(balance.balance).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="relative space-y-4 max-h-80 overflow-y-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    theme === 'dark' ? 'bg-gradient-to-r from-amber-400 to-yellow-400' : 'bg-gradient-to-r from-amber-500 to-yellow-500'
                  }`}></div>
                  <h3 className={`text-lg font-bold bg-gradient-to-r from-amber-300 to-yellow-300 bg-clip-text text-transparent ${
                    theme === 'dark' ? 'from-amber-300 to-yellow-300' : 'from-amber-600 to-yellow-600'
                  }`}>Notifications</h3>
                </div>
                {summary.totalUnread > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className={`px-3 py-1 text-xs rounded-full border transition-all duration-300 font-medium ${
                      theme === 'dark'
                        ? 'text-amber-300 hover:text-amber-200 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 border-amber-400/30 hover:border-amber-300/50'
                        : 'text-amber-600 hover:text-amber-700 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 hover:from-amber-500/20 hover:to-yellow-500/20 border-amber-400/30 hover:border-amber-500/50'
                    }`}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              
              {summary.recentNotifications.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4 filter drop-shadow-sm">📭</div>
                  <p className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  }`}>No notifications yet</p>
                  <p className={`text-xs mt-1 ${
                    theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
                  }`}>Your updates will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {summary.recentNotifications.slice(0, 5).map((notification) => (
                    <div
                      key={notification.id}
                      className={`relative p-4 rounded-lg border transition-all duration-300 cursor-pointer ${
                        !notification.read 
                          ? theme === 'dark'
                            ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border-blue-400/30 hover:border-blue-300/50'
                            : 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-blue-400/30 hover:border-blue-500/50'
                          : theme === 'dark'
                            ? 'bg-gradient-to-r from-slate-800/40 to-gray-800/40 border-slate-600/30 hover:border-slate-500/50'
                            : 'bg-gradient-to-r from-slate-100/40 to-gray-100/40 border-slate-300/30 hover:border-slate-400/50'
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-sm filter drop-shadow-sm">{notification.type === 'envelope_received' ? '🎁' : '🔔'}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-semibold truncate ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>{notification.title}</p>
                            {!notification.read && (
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ml-2 animate-pulse ${
                                theme === 'dark' ? 'bg-gradient-to-r from-blue-400 to-indigo-400' : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                              }`} />
                            )}
                          </div>
                          <p className={`text-xs mt-1 line-clamp-2 ${
                            theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                          }`}>{notification.message}</p>
                          {notification.amountUsd && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className={`text-xs px-2 py-1 rounded-full border font-medium ${
                                theme === 'dark'
                                  ? 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-300 border-emerald-400/30'
                                  : 'bg-gradient-to-r from-emerald-500/10 to-green-500/10 text-emerald-600 border-emerald-400/30'
                              }`}>
                                ${notification.amountUsd.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
