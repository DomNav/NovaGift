import { z } from "zod";
import fetch from "node-fetch";
import { getReflectorOracle } from "./reflector-oracle";
import { config } from "../config";

// Price validation schema
const PriceItem = z.object({
  symbol: z.string(),
  priceUsd: z.union([z.number(), z.string().transform(Number)]),
  updatedAt: z.string(),
});
const PriceArray = z.array(PriceItem);

type Price = z.infer<typeof PriceItem>;

// Cache configuration
const CACHE_TTL_MS = 10_000; // 10 seconds
let cached: { at: number; data: Price[] } | null = null;

// Well-known asset list for NovaGift
const SUPPORTED_ASSETS = [
  'XLM', 'USDC', 'AQUA', 'SHX', 'yXLM', 
  'LSP', 'MOBI', 'RMT', 'ARST', 'EURT'
];

// Fallback prices for resilience
const FALLBACK_PRICES: Record<string, number> = {
  XLM: 0.45,
  USDC: 1.00,
  AQUA: 0.0042,
  SHX: 0.0247,
  yXLM: 0.43,
  LSP: 0.0012,
  MOBI: 0.008,
  RMT: 0.00001,
  ARST: 0.25,
  EURT: 1.05,
};

/**
 * Fetch prices from Reflector Network with caching and validation
 * @param symbols Array of asset symbols to fetch prices for
 * @returns Array of price data with USD values
 */
export async function fetchReflectorPrices(symbols: string[]): Promise<Price[]> {
  const now = Date.now();
  
  // Return cached data if still fresh
  if (cached && now - cached.at < CACHE_TTL_MS) {
    // Filter cached data to only return requested symbols
    return cached.data.filter(p => symbols.includes(p.symbol));
  }

  const prices: Price[] = [];
  const errors: string[] = [];

  try {
    // Try to fetch from existing /api/rates/spot endpoint first
    // This already has Reflector, CoinGecko, and DEX integration
    const apiBase = process.env.APP_BASE_URL || `http://localhost:${config.port}`;
    
    for (const symbol of symbols) {
      try {
        // Use existing rates endpoint which already has multiple sources
        const response = await fetch(`${apiBase}/api/rates/spot?base=${symbol}&quote=USD`, {
          // @ts-ignore - node-fetch types
          timeout: 3000,
          headers: {
            'Accept': 'application/json',
          }
        });

        if (response.ok) {
          const data = await response.json() as any;
          
          if (data.ok && data.price) {
            prices.push({
              symbol: symbol.toUpperCase(),
              priceUsd: Number(data.price),
              updatedAt: new Date().toISOString(),
            });
            continue;
          }
        }
      } catch (err) {
        console.log(`Failed to fetch ${symbol} from rates API:`, err);
      }

      // Try direct Reflector oracle as backup
      if (config.enableReflector) {
        try {
          const network = config.stellarNetwork === 'pubnet' ? 'pubnet' : 'testnet';
          const oracle = getReflectorOracle(network);
          const priceData = await oracle.getLastPrice(symbol);
          
          if (priceData && priceData.price > 0) {
            prices.push({
              symbol: symbol.toUpperCase(),
              priceUsd: priceData.price,
              updatedAt: new Date().toISOString(),
            });
            continue;
          }
        } catch (err) {
          console.log(`Failed to fetch ${symbol} from Reflector oracle:`, err);
        }
      }

      // Use fallback price if all sources fail
      const fallbackPrice = FALLBACK_PRICES[symbol.toUpperCase()];
      if (fallbackPrice !== undefined) {
        prices.push({
          symbol: symbol.toUpperCase(),
          priceUsd: fallbackPrice,
          updatedAt: new Date().toISOString(),
        });
        errors.push(`Using fallback for ${symbol}`);
      } else {
        errors.push(`No price available for ${symbol}`);
      }
    }

    // Validate the price array
    const parsed = PriceArray.safeParse(prices);
    if (!parsed.success) {
      console.error("Price validation failed:", parsed.error);
      throw new Error("Invalid price data format");
    }

    // Update cache with all fetched prices
    cached = { at: now, data: prices };
    
    if (errors.length > 0) {
      console.log("Price fetch warnings:", errors.join(", "));
    }

    return prices;
  } catch (error) {
    console.error("Reflector price fetch error:", error);
    
    // Return fallback prices on complete failure
    return symbols.map(symbol => ({
      symbol: symbol.toUpperCase(),
      priceUsd: FALLBACK_PRICES[symbol.toUpperCase()] || 0,
      updatedAt: new Date().toISOString(),
    }));
  }
}

/**
 * Get a single price for an asset
 * @param symbol Asset symbol
 * @returns Price data or null
 */
export async function getAssetPrice(symbol: string): Promise<Price | null> {
  const prices = await fetchReflectorPrices([symbol]);
  return prices[0] || null;
}

/**
 * Clear the price cache (useful for testing)
 */
export function clearPriceCache(): void {
  cached = null;
}