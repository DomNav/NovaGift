import { env } from '../config/env';
import { AssetRef, parseAssetSymbol } from './assets';
import { quoteDexExactOut, buildPathPaymentStrictReceiveXdr, buildChangeTrustXdr } from './trust-dex';
import { quoteAmmExactOut, buildAmmSwapXdr } from './soroban-router';
import { fetchReflectorPrice, calculateMaxSendWithSlippage } from './oracle';

export type SwapVenue = 'best' | 'dex' | 'amm';

export interface SwapQuote {
  venue: 'dex' | 'amm';
  inAmount: string;
  outAmount: string;
  price: number;
  feePct: number;
  oracleMaxNoSlippage?: string;
  path?: AssetRef[];
  ammPath?: string[];
}

export interface SwapBuildResult {
  xdr: string;
}

export class SwapError extends Error {
  code: string;
  details?: Record<string, unknown>;
  
  constructor(code: string, message?: string, details?: Record<string, unknown>) {
    super(message || code);
    this.code = code;
    this.details = details;
    this.name = 'SwapError';
  }
}

export async function getSwapQuote(
  from: string,
  to: string,
  amount: string,
  venue: SwapVenue
): Promise<SwapQuote> {
  const fromAsset = parseAssetSymbol(from);
  const toAsset = parseAssetSymbol(to);
  
  if (to !== 'USDC') {
    throw new Error('Only USDC output is supported');
  }
  
  let dexQuote = null;
  let ammQuote = null;
  
  if (venue === 'dex' || venue === 'best') {
    try {
      dexQuote = await quoteDexExactOut(fromAsset, toAsset, amount);
    } catch (error) {
      console.error('DEX quote failed:', error);
    }
  }
  
  if ((venue === 'amm' || venue === 'best') && env.ENABLE_AMM) {
    try {
      ammQuote = await quoteAmmExactOut(fromAsset, toAsset, amount);
    } catch (error) {
      console.error('AMM quote failed:', error);
    }
  }
  
  let selectedQuote = null;
  let selectedVenue: 'dex' | 'amm' = 'dex';
  
  if (venue === 'best') {
    if (dexQuote && ammQuote) {
      const dexIn = parseFloat(dexQuote.inAmount);
      const ammIn = parseFloat(ammQuote.inAmount);
      
      if (ammIn < dexIn) {
        selectedQuote = ammQuote;
        selectedVenue = 'amm';
      } else {
        selectedQuote = dexQuote;
        selectedVenue = 'dex';
      }
    } else if (dexQuote) {
      selectedQuote = dexQuote;
      selectedVenue = 'dex';
    } else if (ammQuote) {
      selectedQuote = ammQuote;
      selectedVenue = 'amm';
    }
  } else if (venue === 'dex') {
    selectedQuote = dexQuote;
    selectedVenue = 'dex';
  } else if (venue === 'amm') {
    selectedQuote = ammQuote;
    selectedVenue = 'amm';
  }
  
  if (!selectedQuote) {
    throw new SwapError('NO_ROUTE', 'No swap route available');
  }
  
  let oracleMaxNoSlippage: string | undefined;
  
  try {
    const oraclePrice = await fetchReflectorPrice(fromAsset);
    if (oraclePrice) {
      oracleMaxNoSlippage = calculateMaxSendWithSlippage(amount, oraclePrice, 0);
    }
  } catch (error) {
    console.error('Oracle price fetch failed:', error);
  }
  
  const feePct = selectedVenue === 'amm' ? 0.3 : 0.1;
  
  const result: SwapQuote = {
    venue: selectedVenue,
    inAmount: selectedQuote.inAmount,
    outAmount: selectedQuote.outAmount,
    price: selectedQuote.price,
    feePct,
    oracleMaxNoSlippage,
  };
  
  if (selectedVenue === 'dex' && dexQuote) {
    result.path = dexQuote.path;
  } else if (selectedVenue === 'amm' && ammQuote) {
    result.ammPath = ammQuote.path;
  }
  
  return result;
}

export async function buildSwapTransaction(
  from: string,
  to: string,
  amount: string,
  maxSlippageBps: number,
  payerPublicKey: string,
  memo?: string
): Promise<SwapBuildResult> {
  const fromAsset = parseAssetSymbol(from);
  const toAsset = parseAssetSymbol(to);
  
  if (to !== 'USDC') {
    throw new Error('Only USDC output is supported');
  }
  
  const quote = await getSwapQuote(from, to, amount, 'best');
  
  let sendMax = quote.inAmount;
  
  if (quote.oracleMaxNoSlippage) {
    const oraclePrice = await fetchReflectorPrice(fromAsset);
    if (oraclePrice) {
      const oracleMax = calculateMaxSendWithSlippage(amount, oraclePrice, maxSlippageBps);
      const quotedMax = parseFloat(quote.inAmount);
      const oracleMaxNum = parseFloat(oracleMax);
      
      if (oracleMaxNum < quotedMax) {
        throw new SwapError('SLIPPAGE', 'Price exceeds slippage tolerance', {
          quoted: quote.inAmount,
          maxAllowed: oracleMax,
        });
      }
      
      sendMax = oracleMax;
    }
  }
  
  let xdr: string;
  
  if (quote.venue === 'dex') {
    xdr = buildPathPaymentStrictReceiveXdr(
      payerPublicKey,
      fromAsset,
      toAsset,
      amount,
      sendMax,
      quote.path || [],
      memo
    );
  } else {
    xdr = buildAmmSwapXdr(
      payerPublicKey,
      fromAsset,
      toAsset,
      amount,
      sendMax,
      quote.ammPath || [],
      Math.floor(Date.now() / 1000) + 300
    );
  }
  
  return { xdr };
}

export function buildChangeTrust(
  asset: string,
  account: string
): SwapBuildResult {
  const assetRef = parseAssetSymbol(asset);
  const xdr = buildChangeTrustXdr(account, assetRef);
  return { xdr };
}