import { useState } from "react";
import { motion } from "framer-motion";
import PriceTicker from "./PriceTicker";
import LuxuryLivePrices from "./LuxuryLivePrices";
import PriceTickerMock from "./PriceTickerMock";
import { AnimatePresence } from "framer-motion";

// Demo assets with mock prices
const DEMO_ASSETS = [
  { code: "XLM", display: "XLM", decimals: 7 },
  { code: "USDC", display: "USDC", decimals: 7 },
  { code: "AQUA", display: "AQUA", decimals: 7 },
  { code: "SHX", display: "SHX", decimals: 5 },
  { code: "yXLM", display: "yXLM", decimals: 7 },
  { code: "LSP", display: "LSP", decimals: 7 },
  { code: "MOBI", display: "MOBI", decimals: 7 },
  { code: "RMT", display: "RMT", decimals: 7 },
  { code: "ARST", display: "ARST", decimals: 7 },
  { code: "EURT", display: "EURT", decimals: 6 },
];

// Mock price fetcher for demo
const mockFetchPrices = async (assets: any[]) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return assets.map(asset => ({
    asset,
    priceUsd: Math.random() * 100 + 0.1,
    ts: Date.now() - Math.random() * 60000,
  }));
};

export default function LuxuryPriceTickerDemo() {
  const [activeTab, setActiveTab] = useState("ticker");
  const [showLivePrices, setShowLivePrices] = useState(false);

  const tabs = [
    { id: "ticker", label: "Enhanced Ticker", icon: "📊" },
    { id: "live", label: "Live Prices", icon: "💰" },
    { id: "demo", label: "Interactive Demo", icon: "🎮" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-bg via-brand-surface to-brand-bg p-8">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="text-5xl font-bold text-brand-text mb-6 bg-gradient-to-r from-brand-text via-brand-primary to-brand-secondary bg-clip-text">
            NovaGift Luxury Price Ticker
          </h1>
          <p className="text-xl text-brand-text/70 max-w-3xl mx-auto leading-relaxed">
            Experience the future of cryptocurrency price tracking with premium animations, 
            luxury styling, and smooth micro-interactions that elevate your trading experience.
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div 
          className="flex justify-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="bg-brand-surface/50 backdrop-blur-xl border border-brand-text/10 rounded-2xl p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-lg"
                    : "text-brand-text/70 hover:text-brand-text hover:bg-brand-text/10"
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Content Sections */}
        <AnimatePresence mode="wait">
          {activeTab === "ticker" && (
            <motion.div
              key="ticker"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="space-y-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-brand-text mb-4">Enhanced Price Ticker</h2>
                <p className="text-brand-text/70">
                  Click the ticker below to expand and see all live prices with luxury animations
                </p>
              </div>

              <div className="flex justify-center">
                <PriceTicker 
                  assets={DEMO_ASSETS}
                  demoMode={true}
                  health="ok"
                  fetchPrices={mockFetchPrices}
                  showConnectionStatus={true}
                  rotateMs={3000}
                  className="transform hover:scale-105 transition-all duration-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                <motion.div 
                  className="bg-gradient-to-br from-brand-surface/50 to-brand-surface/30 rounded-2xl p-6 border border-brand-text/10"
                  whileHover={{ scale: 1.02, y: -5 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-3xl mb-4">✨</div>
                  <h3 className="text-xl font-semibold text-brand-text mb-3">Smooth Animations</h3>
                  <p className="text-brand-text/70">
                    Every interaction is enhanced with buttery-smooth animations using Framer Motion
                  </p>
                </motion.div>

                <motion.div 
                  className="bg-gradient-to-br from-brand-surface/50 to-brand-surface/30 rounded-2xl p-6 border border-brand-text/10"
                  whileHover={{ scale: 1.02, y: -5 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <div className="text-3xl mb-4">🎨</div>
                  <h3 className="text-xl font-semibold text-brand-text mb-3">Luxury Styling</h3>
                  <p className="text-brand-text/70">
                    Premium gradients, shadows, and visual effects create a sophisticated look
                  </p>
                </motion.div>

                <motion.div 
                  className="bg-gradient-to-br from-brand-surface/50 to-brand-surface/30 rounded-2xl p-6 border border-brand-text/10"
                  whileHover={{ scale: 1.02, y: -5 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <div className="text-3xl mb-4">⚡</div>
                  <h3 className="text-xl font-semibold text-brand-text mb-3">Performance</h3>
                  <p className="text-brand-text/70">
                    Optimized animations and efficient rendering for smooth 60fps performance
                  </p>
                </motion.div>
              </div>
            </motion.div>
          )}

          {activeTab === "live" && (
            <motion.div
              key="live"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="space-y-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-brand-text mb-4">Live Prices Chart</h2>
                <p className="text-brand-text/70">
                  Click on any asset to see detailed information in an elegant modal
                </p>
              </div>

              <div className="flex justify-center">
                <LuxuryLivePrices 
                  assets={DEMO_ASSETS}
                  fetchPrices={mockFetchPrices}
                  className="w-full max-w-4xl"
                />
              </div>

              <div className="text-center mt-8">
                <motion.button
                  onClick={() => setShowLivePrices(!showLivePrices)}
                  className="px-8 py-4 bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-semibold rounded-xl hover:from-brand-secondary hover:to-brand-primary transition-all duration-300 transform hover:scale-105 shadow-lg"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {showLivePrices ? "Hide" : "Show"} Live Prices
                </motion.button>
              </div>
            </motion.div>
          )}

          {activeTab === "demo" && (
            <motion.div
              key="demo"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="space-y-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-brand-text mb-4">Interactive Demo</h2>
                <p className="text-brand-text/70">
                  Explore all the features with this comprehensive demonstration
                </p>
              </div>

              <PriceTickerMock />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.div 
          className="text-center mt-20 pt-12 border-t border-brand-text/10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <p className="text-brand-text/50 mb-4">
            Built with ❤️ using React, TypeScript, Tailwind CSS, and Framer Motion
          </p>
          <div className="flex justify-center space-x-6 text-sm text-brand-text/60">
            <span>✨ Luxury Animations</span>
            <span>🎨 Premium Design</span>
            <span>⚡ High Performance</span>
            <span>🚀 Modern Tech Stack</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
