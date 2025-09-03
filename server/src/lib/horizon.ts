import { env } from '../config/env';

export interface HorizonError {
  type: string;
  title: string;
  status: number;
  detail?: string;
}

export async function horizonFetch<T>(path: string): Promise<T> {
  const url = `${env.HORIZON_URL}${path}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json() as HorizonError;
      throw new Error(`Horizon error: ${error.title || response.statusText}`);
    }
    
    return await response.json() as T;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch from Horizon');
  }
}

export interface StrictReceivePath {
  source_asset_type: string;
  source_asset_code?: string;
  source_asset_issuer?: string;
  source_amount: string;
  destination_asset_type: string;
  destination_asset_code?: string;
  destination_asset_issuer?: string;
  destination_amount: string;
  path: Array<{
    asset_type: string;
    asset_code?: string;
    asset_issuer?: string;
  }>;
}

export interface StrictReceivePathsResponse {
  _embedded: {
    records: StrictReceivePath[];
  };
}

export async function findStrictReceivePaths(
  sourceAssets: string[],
  destAssetType: string,
  destAssetCode?: string,
  destAssetIssuer?: string,
  destAmount?: string
): Promise<StrictReceivePath[]> {
  const params = new URLSearchParams();
  
  params.append('source_assets', sourceAssets.join(','));
  params.append('destination_asset_type', destAssetType);
  
  if (destAssetCode) {
    params.append('destination_asset_code', destAssetCode);
  }
  
  if (destAssetIssuer) {
    params.append('destination_asset_issuer', destAssetIssuer);
  }
  
  if (destAmount) {
    params.append('destination_amount', destAmount);
  }
  
  const response = await horizonFetch<StrictReceivePathsResponse>(
    `/paths/strict-receive?${params.toString()}`
  );
  
  return response._embedded.records;
}