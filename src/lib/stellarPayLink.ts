/**
 * Stellar Pay Link Generator
 * Creates web+stellar:pay links for QR codes and deep linking
 */

interface PayLinkOptions {
  destination: string;      // G... address or contract address
  amount?: string;          // Optional amount to pay
  asset_code?: string;      // Asset code (e.g., 'USDC', 'XLM')
  asset_issuer?: string;    // Asset issuer address (not needed for XLM)
  memo?: string;           // UTF-8 memo text
}

/**
 * Creates a Stellar payment link following SEP-0007 standard
 * @see https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0007.md
 */
export function makePayLink(options: PayLinkOptions): string {
  const { destination, amount, asset_code, asset_issuer, memo } = options;
  
  // Validate destination
  if (!destination) {
    throw new Error('Destination address is required');
  }
  
  // Start with base URL
  const params = new URLSearchParams();
  params.set('destination', destination);
  
  // Add optional parameters
  if (amount) {
    params.set('amount', amount);
  }
  
  if (asset_code) {
    params.set('asset_code', asset_code);
    
    // Add issuer for non-native assets
    if (asset_code !== 'XLM' && asset_issuer) {
      params.set('asset_issuer', asset_issuer);
    }
  }
  
  if (memo) {
    // UTF-8 encode the memo
    params.set('memo', memo);
    params.set('memo_type', 'MEMO_TEXT');
  }
  
  // Build the final URL
  return `web+stellar:pay?${params.toString()}`;
}

/**
 * Parses a Stellar payment link and extracts parameters
 */
export function parsePayLink(link: string): PayLinkOptions | null {
  try {
    // Remove protocol prefix
    const url = link.replace('web+stellar:pay?', '');
    const params = new URLSearchParams(url);
    
    const destination = params.get('destination');
    if (!destination) {
      return null;
    }
    
    return {
      destination,
      amount: params.get('amount') || undefined,
      asset_code: params.get('asset_code') || undefined,
      asset_issuer: params.get('asset_issuer') || undefined,
      memo: params.get('memo') || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Creates a funding link for an envelope
 */
export function makeEnvelopeFundLink(
  contractAddress: string,
  amount: string,
  asset: 'XLM' | 'USDC',
  envelopeId: string
): string {
  const assetConfig = {
    XLM: {
      code: 'XLM',
      issuer: undefined,
    },
    USDC: {
      code: 'USDC',
      // Testnet USDC issuer
      issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    },
  };
  
  const config = assetConfig[asset];
  
  return makePayLink({
    destination: contractAddress,
    amount,
    asset_code: config.code,
    asset_issuer: config.issuer,
    memo: `NOVAGIFT:${envelopeId.slice(0, 8)}`,
  });
}