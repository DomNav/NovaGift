import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  requiredInForExactOutUSD, 
  calculateMaxSendWithSlippage,
  fetchReflectorPrice 
} from '../lib/oracle';
import { parseAssetSymbol, assetToStellar } from '../lib/assets';
import { getSwapQuote } from '../lib/swap';
import { quoteDexExactOut } from '../lib/trust-dex';

vi.mock('../lib/trust-dex', () => ({
  quoteDexExactOut: vi.fn(),
  buildPathPaymentStrictReceiveXdr: vi.fn(),
  buildChangeTrustXdr: vi.fn(),
}));

vi.mock('../lib/horizon', () => ({
  findStrictReceivePaths: vi.fn(),
}));

vi.mock('../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    HORIZON_URL: 'https://horizon-testnet.stellar.org',
    NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
    USDC_ISSUER: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    EURC_ISSUER: 'GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2',
    AQUA_ISSUER: 'GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA',
    ENABLE_AMM: false,
    REFLECTOR_URL: 'https://reflector-api.stellar.org',
  },
}));

describe('Oracle Math Functions', () => {
  describe('requiredInForExactOutUSD', () => {
    it('should calculate required input for exact USD output with slippage', () => {
      const result = requiredInForExactOutUSD('25.00', 0.5, 50);
      expect(result).toBe('50.2500000');
    });

    it('should handle zero slippage', () => {
      const result = requiredInForExactOutUSD('100.00', 2.0, 0);
      expect(result).toBe('50.0000000');
    });

    it('should handle high slippage', () => {
      const result = requiredInForExactOutUSD('10.00', 0.1, 1000);
      expect(result).toBe('110.0000000');
    });

    it('should handle fractional amounts', () => {
      const result = requiredInForExactOutUSD('12.50', 0.25, 100);
      expect(result).toBe('50.5000000');
    });
  });

  describe('calculateMaxSendWithSlippage', () => {
    it('should calculate max send amount with slippage', () => {
      const result = calculateMaxSendWithSlippage('100.00', 2.0, 100);
      expect(result).toBe('50.5000000');
    });

    it('should handle zero slippage', () => {
      const result = calculateMaxSendWithSlippage('50.00', 1.0, 0);
      expect(result).toBe('50.0000000');
    });

    it('should handle max slippage (100%)', () => {
      const result = calculateMaxSendWithSlippage('20.00', 0.5, 10000);
      expect(result).toBe('80.0000000');
    });
  });
});

describe('Asset Parsing', () => {
  it('should parse XLM correctly', () => {
    const asset = parseAssetSymbol('XLM');
    expect(asset.code).toBe('XLM');
    expect(asset.issuer).toBeUndefined();
  });

  it('should parse USDC with issuer', () => {
    const asset = parseAssetSymbol('USDC');
    expect(asset.code).toBe('USDC');
    expect(asset.issuer).toBe('GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');
  });

  it('should handle lowercase symbols', () => {
    const asset = parseAssetSymbol('xlm');
    expect(asset.code).toBe('XLM');
  });

  it('should throw for unsupported assets', () => {
    expect(() => parseAssetSymbol('BTC')).toThrow('Unsupported asset: BTC');
  });
});

describe('Swap Quote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return DEX quote for exact-out swap', async () => {
    const mockQuote = {
      inAmount: '100.0000000',
      outAmount: '25.0000000',
      price: 0.25,
      path: [],
    };

    vi.mocked(quoteDexExactOut).mockResolvedValue(mockQuote);

    const quote = await getSwapQuote('XLM', 'USDC', '25.00', 'dex');

    expect(quote).toEqual({
      venue: 'dex',
      inAmount: '100.0000000',
      outAmount: '25.0000000',
      price: 0.25,
      feePct: 0.1,
      oracleMaxNoSlippage: undefined,
      path: [],
    });

    expect(quoteDexExactOut).toHaveBeenCalledWith(
      { code: 'XLM' },
      { code: 'USDC', issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5' },
      '25.00'
    );
  });

  it('should throw NO_ROUTE error when no path exists', async () => {
    vi.mocked(quoteDexExactOut).mockResolvedValue(null);

    await expect(getSwapQuote('XLM', 'USDC', '25.00', 'dex')).rejects.toThrow('No swap route available');
  });

  it('should only support USDC as output', async () => {
    await expect(getSwapQuote('XLM', 'EURC', '25.00', 'dex')).rejects.toThrow(
      'Only USDC output is supported'
    );
  });
});