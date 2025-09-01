import { Router } from "express";
import { z } from "zod";
import { fetchReflectorPrices } from "../lib/reflector-prices";
import { logger } from "../lib/log";

const router = Router();

// Query validation schema
const QuerySchema = z.object({
  symbols: z.string().optional(), // comma-separated
});

// Default assets to fetch if none specified - Reduced to 5 for reliability
const DEFAULT_SYMBOLS = [
  "XLM", "USDC", "AQUA", "yXLM", "SHX"
];

/**
 * GET /api/prices
 * Fetch current prices for specified assets or defaults
 * Query params:
 *   - symbols: comma-separated list of asset symbols (optional)
 * Returns:
 *   Array of { symbol, priceUsd, updatedAt }
 */
router.get("/", async (req, res, next) => {
  try {
    // Validate query parameters
    const query = QuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ 
        error: "Invalid query parameters",
        details: query.error.flatten()
      });
    }

    // Parse symbols or use defaults
    const symbolList = query.data.symbols
      ? query.data.symbols
          .split(",")
          .map(s => s.trim().toUpperCase())
          .filter(Boolean)
      : DEFAULT_SYMBOLS;

    // Log the request
    logger.info({
      msg: "Price request",
      symbols: symbolList.join(","),
      count: symbolList.length
    });

    // Fetch prices with built-in caching and fallbacks
    const prices = await fetchReflectorPrices(symbolList);

    // Log successful response
    logger.info({
      msg: "Price response",
      count: prices.length,
      hasErrors: prices.some(p => p.priceUsd === 0)
    });

    // Return successful response
    res.json(prices);
  } catch (error) {
    // Log error with context
    logger.error({
      msg: "Price fetch error",
      error: error instanceof Error ? error.message : String(error),
      symbols: req.query.symbols || "defaults"
    });

    // Pass to error middleware
    next(error);
  }
});

/**
 * GET /api/prices/single/:symbol
 * Fetch price for a single asset
 * Returns:
 *   { symbol, priceUsd, updatedAt }
 */
router.get("/single/:symbol", async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    
    logger.info({
      msg: "Single price request",
      symbol
    });

    const prices = await fetchReflectorPrices([symbol]);
    
    if (prices.length === 0) {
      return res.status(404).json({
        error: `Price not available for ${symbol}`
      });
    }

    res.json(prices[0]);
  } catch (error) {
    logger.error({
      msg: "Single price fetch error",
      error: error instanceof Error ? error.message : String(error),
      symbol: req.params.symbol
    });
    next(error);
  }
});

/**
 * GET /api/prices/health
 * Check if price service is healthy
 */
router.get("/health", async (req, res) => {
  try {
    // Try to fetch a single common asset
    const prices = await fetchReflectorPrices(["XLM"]);
    
    if (prices.length > 0 && prices[0].priceUsd > 0) {
      res.json({ 
        status: "healthy",
        message: "Price service operational",
        samplePrice: prices[0]
      });
    } else {
      res.status(503).json({
        status: "degraded",
        message: "Price service using fallbacks"
      });
    }
  } catch (error) {
    res.status(503).json({
      status: "unhealthy", 
      message: "Price service error",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;