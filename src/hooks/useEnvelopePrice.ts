import useSWR from 'swr';

interface PriceData {
  price: number;
  updatedAt: number;
  error?: string;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch price');
  }
  return response.json();
};

export const useEnvelopePrice = (asset: 'USDC' | 'XLM') => {
  const { data, error, mutate, isLoading } = useSWR<PriceData>(
    `/api/oracle/price?asset=${asset}`,
    fetcher,
    {
      refreshInterval: 5000, // Poll every 5 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
      fallbackData: {
        price: 0,
        updatedAt: Date.now(),
      },
    }
  );

  return {
    price: data?.price || 0,
    updatedAt: data?.updatedAt || Date.now(),
    isLoading,
    isError: !!error,
    error: error?.message,
    mutate, // For manual refresh
  };
};