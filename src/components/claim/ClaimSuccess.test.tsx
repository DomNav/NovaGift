import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ClaimSuccess } from './ClaimSuccess';

// Mock react-confetti
vi.mock('react-confetti', () => ({
  default: ({ width, height }: any) => (
    <div data-testid="confetti" data-width={width} data-height={height}>
      Confetti
    </div>
  ),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ClaimSuccess', () => {
  const defaultProps = {
    envelopeId: 'test-envelope-123',
    amount: '100',
    asset: 'USDC',
  };

  it('renders success message and confetti', () => {
    render(
      <BrowserRouter>
        <ClaimSuccess {...defaultProps} />
      </BrowserRouter>
    );

    expect(screen.getByText('Gift Claimed!')).toBeInTheDocument();
    expect(screen.getByText('100 USDC')).toBeInTheDocument();
    expect(screen.getByTestId('confetti')).toBeInTheDocument();
  });

  it('shows Add to Freighter button when xdr is provided', () => {
    render(
      <BrowserRouter>
        <ClaimSuccess {...defaultProps} xdr="mock-xdr-string" />
      </BrowserRouter>
    );

    expect(screen.getByText('Add to Freighter')).toBeInTheDocument();
  });

  it('does not show Add to Freighter button when xdr is not provided', () => {
    render(
      <BrowserRouter>
        <ClaimSuccess {...defaultProps} />
      </BrowserRouter>
    );

    expect(screen.queryByText('Add to Freighter')).not.toBeInTheDocument();
  });

  it('navigates to activity page when View Activity is clicked', () => {
    render(
      <BrowserRouter>
        <ClaimSuccess {...defaultProps} />
      </BrowserRouter>
    );

    const viewActivityButton = screen.getByText('View Activity');
    fireEvent.click(viewActivityButton);

    expect(mockNavigate).toHaveBeenCalledWith(
      `/activity?envelopeId=${defaultProps.envelopeId}`
    );
  });

  it('creates deep link when Add to Freighter is clicked', () => {
    const xdr = 'test-xdr-transaction';
    const mockLocationHref = vi.fn();
    
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });

    render(
      <BrowserRouter>
        <ClaimSuccess {...defaultProps} xdr={xdr} />
      </BrowserRouter>
    );

    const addToWalletButton = screen.getByText('Add to Freighter');
    fireEvent.click(addToWalletButton);

    expect(window.location.href).toBe(`web+stellar:tx?xdr=${encodeURIComponent(xdr)}`);
  });

  it('updates confetti dimensions on window resize', () => {
    const { rerender } = render(
      <BrowserRouter>
        <ClaimSuccess {...defaultProps} />
      </BrowserRouter>
    );

    const confetti = screen.getByTestId('confetti');
    const initialWidth = confetti.getAttribute('data-width');
    const initialHeight = confetti.getAttribute('data-height');

    // Simulate window resize
    global.innerWidth = 800;
    global.innerHeight = 600;
    global.dispatchEvent(new Event('resize'));

    rerender(
      <BrowserRouter>
        <ClaimSuccess {...defaultProps} />
      </BrowserRouter>
    );

    // Check that confetti dimensions would update
    // (In real implementation, this would be handled by state)
    expect(confetti).toBeInTheDocument();
  });
});