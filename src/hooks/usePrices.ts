import { useQuery } from "@tanstack/react-query";

// Default assets to fetch
const DEFAULT_SYMBOLS = [
  "XLM", "USDC", "AQUA", "SHX", "yXLM",
  "LSP", "MOBI", "RMT", "ARST", "EURT"
];

// Price data interface
export interface PriceData {
  symbol: string;
  priceUsd: number;
  updatedAt: string;
}

/**
 * Custom hook to fetch asset prices using React Query
 * @param symbols Array of asset symbols to fetch (optional)
 * @returns Query result with price data, loading state, and error state
 */
export function usePrices(symbols: string[] = DEFAULT_SYMBOLS) {
  return useQuery({
    queryKey: ["prices", symbols.join(",")],
    queryFn: async () => {
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:4000";
      const symbolsParam = encodeURIComponent(symbols.join(","));
      
      const response = await fetch(`${apiBase}/api/prices?symbols=${symbolsParam}`, {
        headers: {
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        // Try to parse error message from response
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error || `Failed to fetch prices (${response.status})`;
        throw new Error(errorMessage);
      }

      const data = await response.json() as PriceData[];
      
      // Validate that we got the expected data structure
      if (!Array.isArray(data)) {
        throw new Error("Invalid price data format");
      }

      return data;
    },
    refetchInterval: 15_000, // Refetch every 15 seconds
    staleTime: 10_000, // Data considered stale after 10 seconds
    retry: 2, // Retry failed requests twice
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
}

/**
 * Hook to fetch a single asset price
 * @param symbol Asset symbol
 * @returns Query result with price data for single asset
 */
export function useAssetPrice(symbol: string) {
  return useQuery({
    queryKey: ["price", symbol],
    queryFn: async () => {
      const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:4000";
      
      const response = await fetch(`${apiBase}/api/prices/single/${symbol}`, {
        headers: {
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error || `Failed to fetch price for ${symbol}`;
        throw new Error(errorMessage);
      }

      const data = await response.json() as PriceData;
      return data;
    },
    refetchInterval: 15_000,
    staleTime: 10_000,
    retry: 2,
  });
}

/**
 * Transform price data for use in components
 * @param data Price data from API
 * @param assets Asset configuration with decimals
 * @returns Transformed price data compatible with existing components
 */
export function transformPriceData(
  data: PriceData[],
  assets: Array<{ code: string; display: string; decimals?: number }>
) {
  return data.map(price => {
    const asset = assets.find(a => a.code === price.symbol) || {
      code: price.symbol,
      display: price.symbol,
      decimals: 4
    };

    return {
      asset,
      priceUsd: price.priceUsd,
      ts: new Date(price.updatedAt).getTime()
    };
  });
}