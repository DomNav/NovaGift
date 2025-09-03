import { Asset } from '@stellar/stellar-sdk';
import { env } from '../config/env';

export interface AssetRef {
  code: string;
  issuer?: string;
}

export const SUPPORTED_ASSETS = ['XLM', 'USDC', 'EURC', 'AQUA'] as const;
export type SwapSupportedAsset = typeof SUPPORTED_ASSETS[number];

export function parseAssetSymbol(symbol: string): AssetRef {
  symbol = symbol.toUpperCase();
  
  if (!SUPPORTED_ASSETS.includes(symbol as SwapSupportedAsset)) {
    throw new Error(`Unsupported asset: ${symbol}`);
  }
  
  switch (symbol) {
    case 'XLM':
      return { code: 'XLM' };
    case 'USDC':
      return { code: 'USDC', issuer: env.USDC_ISSUER || 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5' };
    case 'EURC':
      return { code: 'EURC', issuer: env.EURC_ISSUER || 'GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2' };
    case 'AQUA':
      return { code: 'AQUA', issuer: env.AQUA_ISSUER || 'GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA' };
    default:
      throw new Error(`Unsupported asset: ${symbol}`);
  }
}

export function assetToStellar(asset: AssetRef): Asset {
  if (asset.code === 'XLM') {
    return Asset.native();
  }
  
  if (!asset.issuer) {
    throw new Error(`Issuer required for ${asset.code}`);
  }
  
  return new Asset(asset.code, asset.issuer);
}

export function assetToString(asset: AssetRef): string {
  if (asset.code === 'XLM') {
    return 'native';
  }
  return `${asset.code}:${asset.issuer}`;
}

export function isNative(asset: AssetRef): boolean {
  return asset.code === 'XLM';
}

export function getAssetDisplayName(asset: AssetRef): string {
  return asset.code;
}

// Legacy support for envelope.ts
export type LegacySupportedAsset = 'USDC' | 'XLM';
// Re-export with original name for backward compatibility  
export type SupportedAsset = LegacySupportedAsset;

const USDC_CONTRACT_ID = process.env.USDC_CONTRACT_ID || '';
const WXLM_CONTRACT_ID = process.env.WXLM_CONTRACT_ID || '';

export function isAllowedAsset(asset: string): asset is LegacySupportedAsset {
  return asset === 'USDC' || asset === 'XLM';
}

export function getAssetContract(asset: LegacySupportedAsset): string {
  if (!isAllowedAsset(asset)) {
    throw new Error(`Asset ${asset} is not allowed`);
  }
  return asset === 'USDC' ? USDC_CONTRACT_ID : WXLM_CONTRACT_ID;
}

export function getAssetDecimals(asset: LegacySupportedAsset): number {
  if (!isAllowedAsset(asset)) {
    throw new Error(`Asset ${asset} is not allowed`);
  }
  return 7;
}

export function formatAssetAmount(amount: string, asset: string): string {
  const num = parseFloat(amount);
  return num.toFixed(Math.min(7, 2));
}