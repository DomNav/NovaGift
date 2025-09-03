import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FundWithSwap } from './FundWithSwap';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.nova wallet adapter
const mockSignAndSubmit = vi.fn();
Object.defineProperty(window, 'nova', {
  value: {
    pubkey: 'GTEST123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789ABCDEF',
    signAndSubmit: mockSignAndSubmit,
  },
  writable: true,
});

// Mock useSwapQuote hook
vi.mock('@/hooks/useSwapQuote', () => ({
  useSwapQuote: vi.fn(),
}));

// Mock environment variable
vi.mock('import.meta.env', () => ({
  VITE_ENABLE_AMM: 'false',
}));

describe('FundWithSwap', () => {
  const defaultProps = {
    targetUsd: '25.00',
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders with default asset and venue selections', () => {
    render(<FundWithSwap {...defaultProps} />);

    // Check asset buttons
    expect(screen.getByText('XLM')).toBeInTheDocument();
    expect(screen.getByText('AQUA')).toBeInTheDocument();
    expect(screen.getByText('EURC')).toBeInTheDocument();
    expect(screen.getByText('USDC')).toBeInTheDocument();

    // Check venue buttons
    expect(screen.getByText('best')).toBeInTheDocument();
    expect(screen.getByText('dex')).toBeInTheDocument();

    // AMM should not be visible when VITE_ENABLE_AMM is false
    expect(screen.queryByText('amm')).not.toBeInTheDocument();

    // Check slippage input
    expect(screen.getByDisplayValue('50')).toBeInTheDocument();
  });

  it('shows AMM venue when VITE_ENABLE_AMM is true', () => {
    // Mock the environment variable for this test
    vi.mocked(import.meta.env).VITE_ENABLE_AMM = 'true';

    render(<FundWithSwap {...defaultProps} />);

    expect(screen.getByText('amm')).toBeInTheDocument();
  });

  it('fetches quote automatically on mount for non-USDC assets', async () => {
    const mockQuoteResponse = {
      venue: 'best',
      inAmount: '55.56',
      outAmount: '25.00',
      price: '0.4500',
      feePct: '0.1',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockQuoteResponse),
    });

    render(<FundWithSwap {...defaultProps} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/swap/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          side: 'exactOut',
          from: 'XLM',
          to: 'USDC',
          amount: '25.00',
          venue: 'best',
        }),
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/You'll pay ~ 55.56 XLM/)).toBeInTheDocument();
      expect(screen.getByText(/Route: best • Est. fees: 0.1% • Price: 0.4500/)).toBeInTheDocument();
    });
  });

  it('shows direct conversion for USDC asset', async () => {
    render(<FundWithSwap {...defaultProps} defaultFrom="USDC" />);

    // USDC button should be selected
    const usdcButton = screen.getByText('USDC');
    expect(usdcButton.closest('button')).toHaveClass('bg-brand-primary');

    await waitFor(() => {
      expect(screen.getByText(/You'll pay ~ 25.00 USDC/)).toBeInTheDocument();
      expect(screen.getByText(/Route: Direct • Est. fees: 0.0% • Price: 1.0000/)).toBeInTheDocument();
    });
  });

  it('handles NO_ROUTE error correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: () => Promise.resolve({ code: 'NO_ROUTE' }),
    });

    render(<FundWithSwap {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('No liquidity now—try another asset or venue.')).toBeInTheDocument();
    });
  });

  it('handles ORACLE_UNAVAILABLE error correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: () => Promise.resolve({ code: 'ORACLE_UNAVAILABLE' }),
    });

    render(<FundWithSwap {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Price oracle offline. Please try later.')).toBeInTheDocument();
    });
  });

  it('builds and signs swap transaction successfully', async () => {
    const mockQuoteResponse = {
      venue: 'best',
      inAmount: '55.56',
      outAmount: '25.00',
      price: '0.4500',
      feePct: '0.1',
    };

    const mockBuildResponse = {
      xdr: 'AAAA...mockxdr',
    };

    const mockTxResult = {
      hash: 'abc123def456',
    };

    // Mock quote fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockQuoteResponse),
    });

    // Mock build fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockBuildResponse),
    });

    mockSignAndSubmit.mockResolvedValueOnce(mockTxResult);

    render(<FundWithSwap {...defaultProps} />);

    // Wait for quote to load
    await waitFor(() => {
      expect(screen.getByText(/You'll pay ~ 55.56 XLM/)).toBeInTheDocument();
    });

    // Click build and sign button
    const buildButton = screen.getByText('Build & Sign Swap');
    fireEvent.click(buildButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/swap/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'XLM',
          to: 'USDC',
          amount: '25.00',
          maxSlippageBps: 50,
          payerPublicKey: 'GTEST123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789ABCDEF',
          memo: undefined,
        }),
      });
    });

    await waitFor(() => {
      expect(mockSignAndSubmit).toHaveBeenCalledWith('AAAA...mockxdr');
    });

    await waitFor(() => {
      expect(defaultProps.onSuccess).toHaveBeenCalledWith('abc123def456');
    });
  });

  it('handles TRUSTLINE_REQUIRED error and shows trustline button', async () => {
    const mockQuoteResponse = {
      venue: 'best',
      inAmount: '55.56',
      outAmount: '25.00',
      price: '0.4500',
      feePct: '0.1',
    };

    // Mock quote fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockQuoteResponse),
    });

    // Mock build fetch with trustline error
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: () => Promise.resolve({ code: 'TRUSTLINE_REQUIRED' }),
    });

    render(<FundWithSwap {...defaultProps} />);

    // Wait for quote to load
    await waitFor(() => {
      expect(screen.getByText(/You'll pay ~ 55.56 XLM/)).toBeInTheDocument();
    });

    // Click build and sign button
    const buildButton = screen.getByText('Build & Sign Swap');
    fireEvent.click(buildButton);

    await waitFor(() => {
      expect(screen.getByText('Add USDC Trustline')).toBeInTheDocument();
    });
  });

  it('handles trustline creation and retries build', async () => {
    const mockQuoteResponse = {
      venue: 'best',
      inAmount: '55.56',
      outAmount: '25.00',
      price: '0.4500',
      feePct: '0.1',
    };

    const mockTrustlineResponse = {
      xdr: 'TRUSTLINE...mockxdr',
    };

    const mockBuildResponse = {
      xdr: 'AAAA...mockxdr',
    };

    const mockTxResult = {
      hash: 'abc123def456',
    };

    // Mock quote fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockQuoteResponse),
    });

    // Mock build fetch with trustline error
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: () => Promise.resolve({ code: 'TRUSTLINE_REQUIRED' }),
    });

    // Mock trustline fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockTrustlineResponse),
    });

    // Mock successful build after trustline
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockBuildResponse),
    });

    mockSignAndSubmit
      .mockResolvedValueOnce({ hash: 'trustline-hash' })
      .mockResolvedValueOnce(mockTxResult);

    render(<FundWithSwap {...defaultProps} />);

    // Wait for quote to load
    await waitFor(() => {
      expect(screen.getByText(/You'll pay ~ 55.56 XLM/)).toBeInTheDocument();
    });

    // Click build and sign button (triggers trustline error)
    const buildButton = screen.getByText('Build & Sign Swap');
    fireEvent.click(buildButton);

    // Wait for trustline button to appear
    await waitFor(() => {
      expect(screen.getByText('Add USDC Trustline')).toBeInTheDocument();
    });

    // Click trustline button
    const trustlineButton = screen.getByText('Add USDC Trustline');
    fireEvent.click(trustlineButton);

    // Verify trustline call
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/swap/change-trust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset: 'USDC',
          account: 'GTEST123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789ABCDEF',
        }),
      });
    });

    // Verify trustline signing
    await waitFor(() => {
      expect(mockSignAndSubmit).toHaveBeenCalledWith('TRUSTLINE...mockxdr');
    });

    // After trustline, it should retry the build
    await waitFor(() => {
      expect(mockSignAndSubmit).toHaveBeenCalledWith('AAAA...mockxdr');
    });

    await waitFor(() => {
      expect(defaultProps.onSuccess).toHaveBeenCalledWith('abc123def456');
    });
  });

  it('handles SLIPPAGE error correctly', async () => {
    const mockQuoteResponse = {
      venue: 'best',
      inAmount: '55.56',
      outAmount: '25.00',
      price: '0.4500',
      feePct: '0.1',
    };

    // Mock quote fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockQuoteResponse),
    });

    // Mock build fetch with slippage error
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: () => Promise.resolve({ code: 'SLIPPAGE' }),
    });

    render(<FundWithSwap {...defaultProps} />);

    // Wait for quote to load
    await waitFor(() => {
      expect(screen.getByText(/You'll pay ~ 55.56 XLM/)).toBeInTheDocument();
    });

    // Click build and sign button
    const buildButton = screen.getByText('Build & Sign Swap');
    fireEvent.click(buildButton);

    await waitFor(() => {
      expect(screen.getByText('Price moved > slippage. Refresh quote.')).toBeInTheDocument();
    });
  });

  it('updates quote when asset or venue changes', async () => {
    const mockQuoteResponse1 = {
      venue: 'best',
      inAmount: '55.56',
      outAmount: '25.00',
      price: '0.4500',
      feePct: '0.1',
    };

    const mockQuoteResponse2 = {
      venue: 'dex',
      inAmount: '60.00',
      outAmount: '25.00',
      price: '0.4167',
      feePct: '0.2',
    };

    // Mock initial quote
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockQuoteResponse1),
    });

    render(<FundWithSwap {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/You'll pay ~ 55.56 XLM/)).toBeInTheDocument();
    });

    // Mock second quote
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockQuoteResponse2),
    });

    // Change venue to DEX
    const dexButton = screen.getByText('dex');
    fireEvent.click(dexButton);

    await waitFor(() => {
      expect(screen.getByText(/You'll pay ~ 60.00 XLM/)).toBeInTheDocument();
      expect(screen.getByText(/Route: dex • Est. fees: 0.2% • Price: 0.4167/)).toBeInTheDocument();
    });
  });

  it('shows oracle reference when oracleMaxNoSlippage is provided', async () => {
    const mockQuoteResponse = {
      venue: 'best',
      inAmount: '55.56',
      outAmount: '25.00',
      price: '0.4500',
      feePct: '0.1',
      oracleMaxNoSlippage: '55.00',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockQuoteResponse),
    });

    render(<FundWithSwap {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Oracle ref ≤ 55.00 XLM \(0 bps\)/)).toBeInTheDocument();
    });
  });

  it('allows refreshing quote', async () => {
    const mockQuoteResponse = {
      venue: 'best',
      inAmount: '55.56',
      outAmount: '25.00',
      price: '0.4500',
      feePct: '0.1',
    };

    // Mock initial quote
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockQuoteResponse),
    });

    render(<FundWithSwap {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/You'll pay ~ 55.56 XLM/)).toBeInTheDocument();
    });

    // Mock refresh quote
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockQuoteResponse),
    });

    // Click refresh button
    const refreshButton = screen.getByText('↻ Refresh Quote');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  it('disables build button when quote is loading or has error', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<FundWithSwap {...defaultProps} />);

    const buildButton = screen.getByText('Build & Sign Swap');
    expect(buildButton).toBeDisabled();
  });
});
