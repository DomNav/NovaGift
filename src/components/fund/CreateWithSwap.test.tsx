import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CreateWithSwap } from './CreateWithSwap';

// Mock SwapPanel component
vi.mock('./SwapPanel', () => ({
  SwapPanel: ({ onBuildSwap, buttonText, buttonIcon, ...props }: any) => (
    <div data-testid="swap-panel">
      <div data-testid="button-text">{buttonText}</div>
      <div data-testid="button-icon">{buttonIcon}</div>
      <button onClick={onBuildSwap}>Create</button>
      <div data-testid="props">{JSON.stringify(props)}</div>
    </div>
  ),
}));

describe('CreateWithSwap', () => {
  const defaultProps = {
    onAmountChange: vi.fn(),
    onAssetChange: vi.fn(),
    onCreateEnvelope: vi.fn(),
    amount: '100',
    selectedAsset: 'XLM' as const,
  };

  it('renders SwapPanel with correct props', () => {
    render(<CreateWithSwap {...defaultProps} />);

    expect(screen.getByTestId('swap-panel')).toBeInTheDocument();
    expect(screen.getByTestId('button-text')).toHaveTextContent('Create Envelope');
    expect(screen.getByTestId('button-icon')).toHaveTextContent('✉');

    const propsData = JSON.parse(screen.getByTestId('props').textContent || '{}');
    expect(propsData.mode).toBe('exactIn');
    expect(propsData.fromAsset).toBe('XLM');
    expect(propsData.toAsset).toBe('USDC');
    expect(propsData.amount).toBe('100');
  });

  it('calls onCreateEnvelope when create button is clicked', () => {
    render(<CreateWithSwap {...defaultProps} />);

    const createButton = screen.getByText('Create');
    fireEvent.click(createButton);

    expect(defaultProps.onCreateEnvelope).toHaveBeenCalledWith({
      asset: 'XLM',
      venue: 'best',
      slippageBps: 50,
      estimatedUsd: '100',
    });
  });

  it('passes disabled state correctly', () => {
    render(<CreateWithSwap {...defaultProps} disabled={true} />);

    const propsData = JSON.parse(screen.getByTestId('props').textContent || '{}');
    expect(propsData.disabled).toBe(true);
  });

  it('passes isCreating state correctly', () => {
    render(<CreateWithSwap {...defaultProps} isCreating={true} />);

    const propsData = JSON.parse(screen.getByTestId('props').textContent || '{}');
    expect(propsData.isBuilding).toBe(true);
  });

  it('updates venue and slippage state', () => {
    const { rerender } = render(<CreateWithSwap {...defaultProps} />);

    // Initial state should have default values
    let propsData = JSON.parse(screen.getByTestId('props').textContent || '{}');
    expect(propsData.venue).toBe('best');
    expect(propsData.slippageBps).toBe(50);

    // Simulate venue change through prop callback
    const onVenueChange = propsData.onVenueChange;
    onVenueChange('dex');

    rerender(<CreateWithSwap {...defaultProps} />);

    // After change, venue should be updated
    propsData = JSON.parse(screen.getByTestId('props').textContent || '{}');
    expect(propsData.venue).toBe('dex');
  });
});
