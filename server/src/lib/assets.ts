/**
 * Asset management for NovaGift
 */

export type SupportedAsset = 'USDC' | 'XLM';

interface AssetInfo {
  code: string;
  contractId: string;
  decimals: number;
  name: string;
  icon?: string;
}

// Load from environment
const USDC_CONTRACT_ID = process.env.USDC_CONTRACT_ID || 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA';
const WXLM_CONTRACT_ID = process.env.WXLM_CONTRACT_ID || 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

// Asset configuration
export const ASSETS: Record<SupportedAsset, AssetInfo> = {
  USDC: {
    code: 'USDC',
    contractId: USDC_CONTRACT_ID,
    decimals: 7,
    name: 'USD Coin',
    icon: '💵',
  },
  XLM: {
    code: 'XLM',
    contractId: WXLM_CONTRACT_ID,
    decimals: 7,
    name: 'Stellar Lumens',
    icon: '🚀',
  },
};

// Allowed assets from environment
const ALLOWED_ASSETS_STR = process.env.ALLOWED_ASSETS || 'USDC,XLM';
export const ALLOWED_ASSETS = ALLOWED_ASSETS_STR.split(',') as SupportedAsset[];

/**
 * Validate if an asset is allowed
 */
export function isAllowedAsset(asset: string): asset is SupportedAsset {
  return ALLOWED_ASSETS.includes(asset as SupportedAsset);
}

/**
 * Get asset contract address
 */
export function getAssetContract(asset: SupportedAsset): string {
  if (!isAllowedAsset(asset)) {
    throw new Error(`Asset ${asset} is not allowed`);
  }
  return ASSETS[asset].contractId;
}

/**
 * Get asset decimals
 */
export function getAssetDecimals(asset: SupportedAsset): number {
  if (!isAllowedAsset(asset)) {
    throw new Error(`Asset ${asset} is not allowed`);
  }
  return ASSETS[asset].decimals;
}

/**
 * Format amount for display
 */
export function formatAssetAmount(amount: string, asset: SupportedAsset): string {
  const decimals = getAssetDecimals(asset);
  const num = parseFloat(amount);
  return num.toFixed(Math.min(decimals, 2));
}