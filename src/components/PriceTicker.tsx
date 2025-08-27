import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ExpandedTickerView from "./ExpandedTickerView";

// ---- Types
interface Asset {
  code: string;
  display: string;
  decimals?: number;
}

interface PriceData {
  asset: Asset;
  priceUsd: number;
  ts: number;
}

interface TickerProps {
  assets?: Asset[];
  demoMode?: boolean;
  health?: "ok" | "degraded" | "error";
  rotateMs?: number;
  className?: string;
  fetchPrices?: (assets: Asset[]) => Promise<PriceData[]>;
  showConnectionStatus?: boolean;
  onClick?: () => void;
}

// ---- Utilities
function fmt(value: number, decimals: number = 4): string {
  if (isNaN(value)) return "—";
  return value.toFixed(decimals);
}

function age(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  if (seconds > 0) return `${seconds}s`;
  return "now";
}

// ---- Hook
function usePrices(
  assets: Asset[],
  { demoMode, fetcher }: { demoMode?: boolean; fetcher?: (assets: Asset[]) => Promise<PriceData[]> }
) {
  const [data, setData] = useState<PriceData[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const backoffRef = useRef(0);
  const intervalMs = 30000; // 30 seconds

  const safeAssets = useMemo(() => {
    if (!assets?.length) return [];
    return assets.filter((a) => a?.code && a?.display);
  }, [assets]);

  const depKey = useMemo(() => safeAssets.map((a) => a.code).join(","), [safeAssets]);

  useEffect(() => {
    if (!safeAssets.length || demoMode) {
      setData([]);
      setErr(null);
      return;
    }

    let mounted = true;
    let timer: NodeJS.Timeout;

    const run = async () => {
      if (!fetcher) return;

      try {
        const points = await fetcher(safeAssets);
        if (!mounted) return;
        setData(points);
        setErr(null);
        backoffRef.current = 0;
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message ?? "Failed to fetch prices");
        backoffRef.current = Math.min(4, backoffRef.current + 1);
      } finally {
        if (!mounted) return;
        const next = intervalMs * Math.pow(1.8, backoffRef.current);
        timer = setTimeout(() => setTick((t) => t + 1), next);
      }
    };

    run();
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [depKey, demoMode, fetcher, intervalMs, tick]);

  return { data, err, safeAssets };
}

// ---- Component
export default function PriceTicker({ 
  assets = [], 
  demoMode, 
  health = "ok", 
  rotateMs = 4000, 
  className = "", 
  fetchPrices,
  showConnectionStatus = false,
  onClick
}: TickerProps) {
  const { data, err, safeAssets } = usePrices(assets, { demoMode, fetcher: fetchPrices });
  const [index, setIndex] = useState(0);
  const pauseRef = useRef(false);

  const count = safeAssets.length;

  useEffect(() => {
    const id = setInterval(() => {
      if (!pauseRef.current && count > 0) setIndex((i) => (i + 1) % count);
    }, rotateMs);
    return () => clearInterval(id);
  }, [count, rotateMs]);

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  const current = useMemo(() => data[index], [data, index]);
  const healthColor = health === "ok" ? "bg-brand-positive" : health === "degraded" ? "bg-brand-warning" : "bg-brand-negative";

  return (
    <motion.div
      className={`flex items-center gap-2 rounded-xl border border-brand-text/10 dark:border-white/10 px-3 py-2 select-none bg-gradient-to-r from-brand-surface/80 to-brand-surface/60 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-500 ${className}`}
      onMouseEnter={() => (pauseRef.current = true)}
      onMouseLeave={() => (pauseRef.current = false)}
      onClick={onClick}
      role="region"
      aria-label="Live asset prices"
      whileHover={{ 
        scale: 1.02,
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)"
      }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Animated health indicator */}
      <motion.span 
        className={`inline-block h-2 w-2 rounded-full ${healthColor}`} 
        aria-hidden
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.7, 1, 0.7]
        }}
        transition={{ 
          duration: 2, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
      />

      {/* Rotating cell with smooth transitions */}
      <div className="flex items-center gap-2 px-1">
        <motion.span 
          key={current?.asset.display ?? safeAssets[index]?.code ?? "—"}
          className="text-xs font-medium text-brand-text/70"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {err ? "Prices" : current?.asset.display ?? safeAssets[index]?.code ?? "—"}
        </motion.span>
        
        <span className="h-4 w-px bg-gradient-to-b from-transparent via-brand-text/20 to-transparent dark:from-transparent dark:via-white/20 dark:to-transparent" />
        
        <motion.span 
          key={`${current?.priceUsd}-${current?.asset.code}`}
          className="font-semibold tabular-nums text-brand-text"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {err ? "—" : `$${fmt(current?.priceUsd ?? NaN, current?.asset.decimals ?? 4)}`}
        </motion.span>
        
        <motion.span
          className="ml-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-brand-text/20 to-brand-text/10 dark:from-white/20 dark:to-white/10 px-2 py-0.5 text-[10px] text-brand-text/60 dark:text-white/60 backdrop-blur-sm"
          title={err ? err : `Last update: ${new Date(current?.ts ?? Date.now()).toLocaleTimeString()}`}
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
        >
          {age(current?.ts ?? Date.now())}
        </motion.span>
      </div>

      {/* Connection status indicator */}
      {showConnectionStatus && (
        <>
          <span className="h-4 w-px bg-gradient-to-b from-transparent via-brand-text/20 to-transparent dark:from-transparent dark:via-white/20 dark:to-transparent" />
          <motion.span 
            className={`text-xs px-2 py-0.5 rounded-full backdrop-blur-sm ${
              demoMode 
                ? "bg-gradient-to-r from-brand-warning/20 to-brand-warning/10 text-brand-warning" 
                : "bg-gradient-to-r from-brand-positive/20 to-brand-positive/10 text-brand-positive"
            }`}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            {demoMode ? "offline" : "live"}
          </motion.span>
        </>
      )}

      {/* Asset count indicator */}
      {count > 1 && (
        <>
          <span className="h-4 w-px bg-gradient-to-b from-transparent via-brand-text/20 to-transparent dark:from-transparent dark:via-white/20 dark:to-transparent" />
          <motion.span 
            className="text-xs text-brand-text/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {index + 1}/{count}
          </motion.span>
        </>
      )}

      {/* Enhanced pagination dots */}
      <div className="ml-1 flex items-center gap-1">
        {(safeAssets || []).map((_, i) => (
          <motion.span 
            key={i} 
            className={`h-1.5 w-1.5 rounded-full transition-all duration-300`}
            style={{
              backgroundColor: i === index 
                ? 'var(--progress-active)' 
                : 'var(--progress-inactive)'
            }}
            whileHover={{ scale: 1.3 }}
            animate={{ 
              scale: i === index ? 1.2 : 1,
              opacity: i === index ? 1 : 0.6
            }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ---- Enhanced Live Price Component for expanded view
function LivePrice({ asset, fetchPrices }: { asset: Asset; fetchPrices: (assets: Asset[]) => Promise<PriceData[]> }) {
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadPrice = async () => {
      try {
        setLoading(true);
        setError(false);
        const results = await fetchPrices([asset]);
        if (mounted && results.length > 0) {
          setPrice(results[0].priceUsd);
        } else if (mounted) {
          setError(true);
        }
      } catch (e) {
        if (mounted) {
          setError(true);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadPrice();
    const interval = setInterval(loadPrice, 15000); // Update every 15 seconds

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [asset, fetchPrices]);

  if (loading) {
    return (
      <motion.div 
        className="flex items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="animate-pulse bg-gradient-to-r from-brand-text/20 to-brand-text/10 h-4 w-12 rounded"></div>
      </motion.div>
    );
  }

  if (error || price === null) {
    return <span className="text-xs text-brand-text/50">—</span>;
  }

  return (
    <motion.span 
      className="text-sm font-semibold text-brand-text tabular-nums"
      key={price}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      ${fmt(price, asset.decimals || 4)}
    </motion.span>
  );
}

// ---- Enhanced Header Price Ticker with luxury styling
export function HeaderPriceTicker() {
  const [health, setHealth] = useState<"ok" | "degraded" | "error">("ok");
  const [walletConnected, setWalletConnected] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Expanded list of 10 popular Stellar assets supported by Reflector
  const assets: Asset[] = [
    { code: "XLM", display: "XLM", decimals: 7 }, // Stellar Lumens
    { code: "USDC", display: "USDC", decimals: 7 }, // USD Coin
    { code: "AQUA", display: "AQUA", decimals: 7 }, // AquaNetwork token
    { code: "SHX", display: "SHX", decimals: 5 }, // Stronghold token
    { code: "yXLM", display: "yXLM", decimals: 7 }, // Yield XLM
    { code: "LSP", display: "LSP", decimals: 7 }, // Lumenswap token
    { code: "MOBI", display: "MOBI", decimals: 7 }, // Mobius token
    { code: "RMT", display: "RMT", decimals: 7 }, // SureRemit token
    { code: "ARST", display: "ARST", decimals: 7 }, // Allstar token
    { code: "EURT", display: "EURT", decimals: 6 }, // Euro Token
  ];

  // Monitor system health
  useEffect(() => {
    const checkHealth = async () => {
      const api = import.meta.env.VITE_API_BASE || "http://localhost:4000";
      try {
        const response = await fetch(`${api}/api/health`, { 
          signal: AbortSignal.timeout(3000) // 3 second timeout
        });
        if (response.ok) {
          setHealth("ok");
        } else {
          setHealth("degraded");
        }
      } catch (error) {
        setHealth("error");
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Use your existing rates API endpoint
  const fetchPrices = async (assets: Asset[]): Promise<PriceData[]> => {
    const api = import.meta.env.VITE_API_BASE || "http://localhost:4000";
    const results: PriceData[] = [];
    
    for (const asset of assets) {
      try {
        // Use your existing /api/rates/spot endpoint
        const response = await fetch(`${api}/api/rates/spot?base=${asset.code}&quote=USD`);
        const data = await response.json();
        
        if (data.ok && data.price) {
          results.push({
            asset,
            priceUsd: Number(data.price),
            ts: Date.now(),
          });
        } else if (data.rate) {
          // Fallback for mock data
          results.push({
            asset,
            priceUsd: Number(data.rate),
            ts: Date.now(),
          });
        }
      } catch (error) {
        console.warn(`Failed to fetch price for ${asset.code}:`, error);
        // Continue with other assets
      }
    }
    
    return results;
  };

  // Monitor wallet connection status
  useEffect(() => {
    const checkWalletStatus = () => {
      const storedAddress = localStorage.getItem('wallet_address');
      const storedConnected = localStorage.getItem('wallet_connected') === 'true';
      setWalletConnected(!!(storedAddress && storedConnected));
    };

    checkWalletStatus();
    // Listen for storage changes (when wallet connects/disconnects)
    const handleStorageChange = () => checkWalletStatus();
    window.addEventListener('storage', handleStorageChange);
    
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Determine demo mode based on connection
  const isFreighterInstalled = () => {
    return typeof window !== 'undefined' && 'stellar' in window;
  };

  return (
    <div className="relative">
      <PriceTicker 
        assets={assets} 
        demoMode={false} // Always show live prices - prices are public data
        health={health} 
        fetchPrices={fetchPrices}
        showConnectionStatus={isFreighterInstalled() && walletConnected}
        rotateMs={isExpanded ? 2000 : 4000} // Faster rotation when expanded
        className={`cursor-pointer transition-all duration-500 ${isExpanded ? 'scale-105 shadow-2xl' : 'hover:scale-102'}`}
        onClick={() => setIsExpanded(!isExpanded)}
      />
      
      {/* Use the new ExpandedTickerView component */}
      <ExpandedTickerView
        assets={assets}
        fetchPrices={fetchPrices}
        isVisible={isExpanded}
        onClose={() => setIsExpanded(false)}
      />
    </div>
  );
}
