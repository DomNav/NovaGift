import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EnvelopePreview } from './EnvelopePreview';
import type { ShaderSettings } from '@/components/skins/GradientShader';

describe('EnvelopePreview', () => {
  const mockSettings: ShaderSettings = {
    angle: 35,
    noise: 0.1,
    stops: ['#EEEFF3', '#D5D8E0', '#B8BEC9', '#F7F9FF'],
  };

  const defaultProps = {
    skinId: 'test-skin',
    settings: mockSettings,
    animation: 'none' as const,
    opened: false,
    locked: false,
    amount: '100',
    from: 'GDEMO...SENDER',
    to: 'GDEMO...RECIPIENT',
  };

  it('renders sealed envelope correctly', () => {
    render(<EnvelopePreview {...defaultProps} />);
    
    expect(screen.getByText('Sealed')).toBeInTheDocument();
    expect(screen.getByText('Gift Envelope')).toBeInTheDocument();
    expect(screen.getByText(/\$100 USDC/)).toBeInTheDocument();
    expect(screen.getByText(/To: GDEMO/)).toBeInTheDocument();
  });

  it('renders opened envelope correctly', () => {
    render(<EnvelopePreview {...defaultProps} opened={true} />);
    
    expect(screen.getByText('Opened')).toBeInTheDocument();
    expect(screen.getByText('You received')).toBeInTheDocument();
    expect(screen.getByText(/\$100 USDC/)).toBeInTheDocument();
    expect(screen.getByText(/From:/)).toBeInTheDocument();
  });

  it('shows lock overlay when locked', () => {
    const { container } = render(<EnvelopePreview {...defaultProps} locked={true} />);
    
    const lockOverlay = container.querySelector('.bg-black\\/50');
    expect(lockOverlay).toBeInTheDocument();
  });

  it('formats wallet addresses correctly', () => {
    render(
      <EnvelopePreview
        {...defaultProps}
        opened={true}
        from="GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"
        to="GXYZABCDEFGHIJKLMNOPQRSTUVWXYZ1234567"
      />
    );
    
    expect(screen.getByText(/GABCDE...7890/)).toBeInTheDocument();
    expect(screen.getByText(/GXYZAB...4567/)).toBeInTheDocument();
  });

  it('handles XLM asset correctly', () => {
    render(<EnvelopePreview {...defaultProps} asset="XLM" amount="500" />);
    
    expect(screen.getByText(/500 XLM/)).toBeInTheDocument();
  });
});