import { env } from '../config/env';
import { AssetRef, parseAssetSymbol } from './assets';

interface ReflectorPrice {
  asset: string;
  price: number;
  timestamp: number;
}

interface PriceCache {
  price: number;
  timestamp: number;
}

const priceCache = new Map<string, PriceCache>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export async function fetchReflectorPrice(asset: AssetRef): Promise<number | null> {
  if (!env.REFLECTOR_URL) {
    return null;
  }
  
  const cacheKey = `${asset.code}:${asset.issuer || 'native'}`;
  const cached = priceCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }
  
  try {
    const assetParam = asset.code === 'XLM' ? 'XLM' : `${asset.code}:${asset.issuer}`;
    const url = `${env.REFLECTOR_URL}/price/${encodeURIComponent(assetParam)}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) {
      console.error(`Reflector API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json() as ReflectorPrice;
    
    priceCache.set(cacheKey, {
      price: data.price,
      timestamp: Date.now(),
    });
    
    return data.price;
  } catch (error) {
    console.error('Failed to fetch Reflector price:', error);
    return null;
  }
}

export async function getOraclePrices(assets: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  
  const promises = assets.map(async (assetSymbol) => {
    try {
      const asset = parseAssetSymbol(assetSymbol);
      const price = await fetchReflectorPrice(asset);
      if (price !== null) {
        prices.set(assetSymbol, price);
      }
    } catch (error) {
      console.error(`Failed to get price for ${assetSymbol}:`, error);
    }
  });
  
  await Promise.all(promises);
  return prices;
}

export function calculateMaxSendWithSlippage(
  targetUsdAmount: string,
  assetUsdPrice: number,
  maxSlippageBps: number
): string {
  const targetUsd = parseFloat(targetUsdAmount);
  const baseAmount = targetUsd / assetUsdPrice;
  const slippageMultiplier = 1 + (maxSlippageBps / 10000);
  const maxAmount = baseAmount * slippageMultiplier;
  
  return maxAmount.toFixed(7);
}

export function requiredInForExactOutUSD(
  usdOutAmount: string,
  assetPrice: number,
  slippageBps: number
): string {
  const usdOut = parseFloat(usdOutAmount);
  const baseAmount = usdOut / assetPrice;
  const slippageMultiplier = 1 + (slippageBps / 10000);
  const requiredAmount = baseAmount * slippageMultiplier;
  
  return requiredAmount.toFixed(7);
}