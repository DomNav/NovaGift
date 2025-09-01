import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { SwrCache } from '../lib/swr-cache';
import axios from 'axios';

const router = Router();

// Cache for 60 seconds
const priceCache = new SwrCache<{ price: number; updatedAt: number }>(60);

const AssetSchema = z.enum(['USDC', 'XLM']);

router.get('/price', async (req, res) => {
  try {
    // Validate asset parameter
    const assetResult = AssetSchema.safeParse(req.query.asset);
    if (!assetResult.success) {
      return res.status(400).json({ 
        error: 'Invalid asset. Must be USDC or XLM' 
      });
    }

    const asset = assetResult.data;
    const cacheKey = `price:${asset}`;

    // Check cache first
    const cached = priceCache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Fetch from Reflector
    try {
      const reflectorUrl = env.REFLECTOR_URL;
      
      // Map asset to Reflector asset code
      const assetCode = asset === 'USDC' ? 'USDC' : 'XLM';
      
      // Make request to Reflector API
      const response = await axios.get(`${reflectorUrl}/price/${assetCode}`, {
        timeout: 5000,
        headers: {
          'Accept': 'application/json',
        }
      });

      const priceData = {
        price: response.data.price || 0,
        updatedAt: Date.now(),
      };

      // Cache the result
      priceCache.set(cacheKey, priceData);

      return res.json(priceData);
    } catch (fetchError) {
      console.error('Error fetching from Reflector:', fetchError);
      
      // Return stale cache if available
      const staleCache = priceCache.get(cacheKey);
      if (staleCache) {
        return res.json(staleCache);
      }

      // Return error response
      return res.status(503).json({ 
        error: 'Price service unavailable',
        price: 0,
        updatedAt: Date.now(),
      });
    }
  } catch (error) {
    console.error('Oracle price error:', error);
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

export default router;