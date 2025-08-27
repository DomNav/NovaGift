import { useState } from "react";
import { motion } from "framer-motion";
import PriceTicker from "../components/PriceTicker";

// Test assets
const TEST_ASSETS = [
  { code: "XLM", display: "XLM", decimals: 7 },
  { code: "USDC", display: "USDC", decimals: 7 },
  { code: "AQUA", display: "AQUA", decimals: 7 },
  { code: "SHX", display: "SHX", decimals: 5 },
  { code: "yXLM", display: "yXLM", decimals: 7 },
];

// Mock price fetcher
const mockFetchPrices = async (assets: any[]) => {
  await new Promise(resolve => setTimeout(resolve, 200));
  return assets.map(asset => ({
    asset,
    priceUsd: Math.random() * 100 + 0.1,
    ts: Date.now() - Math.random() * 60000,
  }));
};

export default function TickerTest() {
  const [showGiftModal, setShowGiftModal] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-bg via-brand-surface to-brand-bg p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-brand-text mb-4">
            Ticker Test Page
          </h1>
          <p className="text-lg text-brand-text/70">
            Test the enhanced price ticker without modal conflicts
          </p>
        </motion.div>

        {/* Test Ticker */}
        <div className="flex justify-center mb-12">
          <PriceTicker 
            assets={TEST_ASSETS}
            demoMode={true}
            health="ok"
            fetchPrices={mockFetchPrices}
            showConnectionStatus={true}
            rotateMs={3000}
            className="transform hover:scale-105 transition-all duration-500"
          />
        </div>

        {/* Test Gift Modal Button */}
        <div className="text-center mb-8">
          <motion.button
            onClick={() => setShowGiftModal(true)}
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-pink-500 hover:to-purple-500 transition-all duration-300 transform hover:scale-105 shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Show Gift Modal (Test Conflict)
          </motion.button>
        </div>

        {/* Instructions */}
        <div className="bg-brand-surface/50 rounded-2xl p-6 border border-brand-text/10">
          <h3 className="text-xl font-semibold text-brand-text mb-4">Test Instructions:</h3>
          <ol className="list-decimal list-inside space-y-2 text-brand-text/70">
            <li>Click on the price ticker above to expand it</li>
            <li>Verify the Live Prices chart appears properly</li>
            <li>Click the "Show Gift Modal" button to test for conflicts</li>
            <li>Ensure both modals can coexist without issues</li>
            <li>Close both modals and test again</li>
          </ol>
        </div>

        {/* Gift Modal */}
        {showGiftModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9990] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowGiftModal(false)}
          >
            <motion.div
              className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-8 max-w-md w-full text-center text-white"
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-4xl mb-4">🎁</div>
              <h3 className="text-2xl font-bold mb-2">Gift Envelope</h3>
              <p className="text-xl mb-4">$100.00 USDC</p>
              <p className="text-sm opacity-80 mb-6">SEALED</p>
              <button
                onClick={() => setShowGiftModal(false)}
                className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl transition-colors duration-300"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
