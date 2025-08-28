import { useEffect, useState } from 'react';
import PriceTicker from './PriceTicker';

// Demo assets with mock prices
const DEMO_ASSETS = [
  { code: 'XLM', display: 'XLM', decimals: 4 },
  { code: 'USDC', display: 'USDC', decimals: 2 },
  { code: 'AQUA', display: 'AQUA', decimals: 6 },
  { code: 'SHX', display: 'SHX', decimals: 5 },
  { code: 'WXLM', display: 'WXLM', decimals: 7 },
];

// Mock price data generator
const generateMockPrices = () => {
  return DEMO_ASSETS.map((asset) => ({
    asset,
    priceUsd: Math.random() * 100 + 0.1, // Random price between 0.1 and 100.1
    ts: Date.now() - Math.random() * 60000, // Random timestamp within last minute
  }));
};

export function PriceTickerDemo() {
  const [mockData, setMockData] = useState(generateMockPrices());

  // Update mock data every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMockData(generateMockPrices());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchPrices = async () => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    return mockData;
  };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-brand-bg via-brand-surface to-brand-bg rounded-2xl border border-brand-text/10">
      <div className="text-center">
        <h3 className="text-lg font-bold text-brand-text mb-2">Luxury Price Ticker Demo</h3>
        <p className="text-sm text-brand-text/70 mb-4">
          Enhanced with smooth animations and premium styling • Updates every 10 seconds
        </p>
      </div>

      <div className="flex justify-center">
        <PriceTicker
          assets={DEMO_ASSETS}
          demoMode={true}
          health="ok"
          rotateMs={3000} // Faster rotation for demo
          fetchPrices={fetchPrices}
          showConnectionStatus={true}
          className="transform hover:scale-105 transition-all duration-500"
        />
      </div>

      <div className="text-center">
        <div className="text-xs text-brand-text/50 space-y-1">
          <p>✨ Hover to pause rotation • Click for enhanced interactions</p>
          <p>🎨 Smooth animations • Luxury visual effects</p>
          <p>🚀 Enhanced performance • Premium user experience</p>
        </div>
      </div>
    </div>
  );
}

// Standalone demo for testing
export function StandaloneDemo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-bg via-brand-surface to-brand-bg p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-brand-text mb-4">NovaGift Luxury Price Ticker</h1>
          <p className="text-lg text-brand-text/70">
            Experience premium cryptocurrency price tracking with smooth animations
          </p>
        </div>

        <PriceTickerDemo />

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gradient-to-br from-brand-surface/50 to-brand-surface/30 rounded-2xl p-6 border border-brand-text/10">
            <h3 className="text-xl font-semibold text-brand-text mb-4">Features</h3>
            <ul className="space-y-2 text-brand-text/80">
              <li>✨ Smooth hover animations</li>
              <li>🎯 Interactive ticker clicks</li>
              <li>🌈 Luxury gradient styling</li>
              <li>⚡ Real-time price updates</li>
              <li>🎨 Premium visual effects</li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-brand-surface/50 to-brand-surface/30 rounded-2xl p-6 border border-brand-text/10">
            <h3 className="text-xl font-semibold text-brand-text mb-4">Technology</h3>
            <ul className="space-y-2 text-brand-text/80">
              <li>🚀 Framer Motion animations</li>
              <li>🎭 Staggered entrance effects</li>
              <li>💫 Micro-interactions</li>
              <li>🔧 TypeScript powered</li>
              <li>📱 Responsive design</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
