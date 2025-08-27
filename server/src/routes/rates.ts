import { Router } from "express";
import { Horizon, Asset } from "@stellar/stellar-sdk";
import { getReflectorOracle } from "../lib/reflector-oracle";
import { config } from "../config";

const r = Router();

const CACHE: Record<string, { v: number; t: number }> = {};
const TTL = 15_000;
const getC = (k:string) => (CACHE[k] && Date.now()-CACHE[k].t < TTL) ? CACHE[k].v : null;
const setC = (k:string,v:number) => CACHE[k] = { v, t: Date.now() };

// Well-known Stellar assets on testnet
const TESTNET_ASSETS: Record<string, { code: string; issuer: string }> = {
  USDC: { code: "USDC", issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5" },
  // Add more testnet assets as needed
};

// Get price from Stellar DEX orderbook
async function getStellarDexPrice(base: string, quote: string): Promise<number | null> {
  try {
    if (quote.toUpperCase() !== "USD" || base.toUpperCase() === "XLM") {
      return null;
    }
    
    const horizon = new Horizon.Server(
      process.env.HORIZON_URL || "https://horizon-testnet.stellar.org"
    );
    
    const assetInfo = TESTNET_ASSETS[base.toUpperCase()];
    if (!assetInfo) return null;
    
    // Get orderbook for asset/XLM pair
    const orderbook = await horizon
      .orderbook(
        new Asset(assetInfo.code, assetInfo.issuer),
        Asset.native()
      )
      .call();
    
    if (orderbook.asks.length === 0) return null;
    
    // Get best ask price (asset per XLM)
    const bestAsk = parseFloat(orderbook.asks[0].price);
    
    // Get XLM price in USD (we need this from Reflector)
    const network = config.stellarNetwork === "pubnet" ? "pubnet" : "testnet";
    const oracle = getReflectorOracle(network);
    const xlmPrice = await oracle.getLastPrice();
    
    if (!xlmPrice) return null;
    
    // Calculate USD price: (1 / bestAsk) * xlmPrice
    return (1 / bestAsk) * xlmPrice.price;
  } catch (error) {
    console.error(`Error getting DEX price for ${base}:`, error);
    return null;
  }
}

async function getReflectorPrice(base: string, quote: string): Promise<number | null> {
  try {
    // Reflector only supports USD quotes for now
    if (quote.toUpperCase() !== "USD") {
      return null;
    }
    
    const network = config.stellarNetwork === "pubnet" ? "pubnet" : "testnet";
    const oracle = getReflectorOracle(network);
    
    // Try to get price for the specific asset from Reflector
    try {
      console.log(`[Reflector] Fetching ${base} price from ${network} oracle...`);
      
      // For XLM, try TWAP first for more stable pricing
      if (base.toUpperCase() === "XLM") {
        try {
          const twap = await oracle.getTwapPrice(base);
          if (twap !== null) {
            console.log(`[Reflector] ✅ Got ${base} TWAP price: $${twap.toFixed(4)}`);
            return twap;
          }
        } catch (twapError) {
          // TWAP not available, will try lastPrice
        }
      }
      
      // Try to get last price for the asset
      const lastPrice = await oracle.getLastPrice(base);
      if (lastPrice !== null && lastPrice.price > 0) {
        console.log(`[Reflector] ✅ Got ${base} price: $${lastPrice.price.toFixed(4)}`);
        return lastPrice.price;
      } else {
        console.log(`[Reflector] ⚠️ ${base} not available on ${network}`);
      }
    } catch (assetError: any) {
      console.log(`[Reflector] ❌ Error for ${base}:`, assetError.message);
    }
    
    return null;
  } catch (error) {
    console.error("[Reflector] Oracle error:", error);
    return null;
  }
}

async function coingecko(base: string, quote: string): Promise<number | null> {
  const idMap: Record<string,string> = { 
    XLM: "stellar",
    USDC: "usd-coin",
    AQUA: "aquarius-2", 
    SHX: "stronghold-token",
    YXLM: "ultra-stellar",
    LSP: "lumenswap",
    MOBI: "mobius",
    RMT: "sureremit",
    ARST: "ars-token",
    EURT: "tether-eurt"
  };
  
  const id = idMap[base.toUpperCase()];
  if (!id || quote.toUpperCase() !== "USD") {
    return null;
  }
  
  try {
    const resp = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
    if (!resp.ok) {
      console.log(`[CoinGecko] API returned ${resp.status} for ${id}`);
      return null;
    }
    const j = await resp.json() as any;
    const v = Number(j?.[id]?.usd);
    if (!Number.isFinite(v) || v === 0) {
      console.log(`[CoinGecko] Invalid price data for ${id}`);
      return null;
    }
    console.log(`[CoinGecko] ✅ Got ${base} price: $${v.toFixed(4)}`);
    return v;
  } catch (error: any) {
    console.log(`[CoinGecko] ❌ Error for ${base}:`, error.message);
    return null;
  }
}

r.get("/spot", async (req, res) => {
  const base = String(req.query.base || "XLM");
  const quote = String(req.query.quote || "USD");
  const key = `${base}:${quote}`.toUpperCase();
  
  try {
    // Check cache first
    const cached = getC(key); 
    if (cached) {
      console.log(`[Cache] Returning cached price for ${base}: $${cached}`);
      return res.json({ ok: true, base, quote, price: cached, source: "cache" });
    }

    console.log(`\n[Price Request] ${base}:${quote}`);
    console.log("=================================");

    let price: number | null = null;
    let source: string = "";

    // 1. Try CoinGecko first for real market prices
    const cgPrice = await coingecko(base, quote);
    if (cgPrice !== null && cgPrice > 0) {
      price = cgPrice;
      source = "coingecko";
    }
    
    // 2. Try Reflector oracle if CoinGecko fails and Reflector is enabled
    if (!price && config.enableReflector) {
      const reflectorPrice = await getReflectorPrice(base, quote);
      if (reflectorPrice !== null && reflectorPrice > 0) {
        price = reflectorPrice;
        source = "reflector";
      }
    }

    // 3. Try Stellar DEX for supported assets
    if (!price) {
      const dexPrice = await getStellarDexPrice(base, quote);
      if (dexPrice !== null && dexPrice > 0) {
        price = dexPrice;
        source = "stellar-dex";
      }
    }
    
    // 4. Use realistic fallback prices for common tokens
    if (!price && quote.toUpperCase() === "USD") {
      const fallbackPrices: Record<string, number> = {
        XLM: 0.45,       // Stellar Lumens
        USDC: 1.00,      // USD Coin (stablecoin)
        AQUA: 0.0042,    // Aquarius
        SHX: 0.0247,     // Stronghold
        YXLM: 0.43,      // Yield XLM
        LSP: 0.0012,     // Lumenswap
        MOBI: 0.008,     // Mobius
        RMT: 0.00001,    // SureRemit
        ARST: 0.25,      // ARST
        EURT: 1.05,      // Euro Tether
      };
      
      const fallbackPrice = fallbackPrices[base.toUpperCase()];
      if (fallbackPrice !== undefined) {
        price = fallbackPrice;
        source = "fallback";
        console.log(`[Fallback] Using fallback price for ${base}: $${fallbackPrice}`);
      }
    }

    // Return result
    if (price !== null && price > 0) {
      setC(key, price);
      console.log(`[Result] ✅ ${base} = $${price.toFixed(4)} (source: ${source})`);
      console.log("=================================");
      return res.json({ 
        ok: true, 
        base, 
        quote, 
        price, 
        source,
        timestamp: Date.now()
      });
    }

    // No price available
    console.log(`[Result] ❌ No price available for ${base}`);
    console.log("=================================");
    res.json({ 
      ok: false, 
      error: `No price data available for ${base}:${quote}`,
      attemptedSources: ["coingecko", "reflector", "stellar-dex", "fallback"]
    });
  } catch (error: any) {
    console.error('[Error] Price fetch error:', error.message);
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

export default r;