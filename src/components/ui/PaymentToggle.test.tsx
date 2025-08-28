import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PaymentToggle } from './PaymentToggle';

describe('PaymentToggle', () => {
  it('renders both USDC and XLM options', () => {
    const mockOnChange = vi.fn();
    render(<PaymentToggle value="USDC" onChange={mockOnChange} />);

    expect(screen.getByText('USDC')).toBeInTheDocument();
    expect(screen.getByText('XLM')).toBeInTheDocument();
  });

  it('calls onChange when USDC is clicked', () => {
    const mockOnChange = vi.fn();
    render(<PaymentToggle value="XLM" onChange={mockOnChange} />);

    fireEvent.click(screen.getByText('USDC'));
    expect(mockOnChange).toHaveBeenCalledWith('USDC');
  });

  it('calls onChange when XLM is clicked', () => {
    const mockOnChange = vi.fn();
    render(<PaymentToggle value="USDC" onChange={mockOnChange} />);

    fireEvent.click(screen.getByText('XLM'));
    expect(mockOnChange).toHaveBeenCalledWith('XLM');
  });

  it('applies correct styling based on selected value', () => {
    const mockOnChange = vi.fn();
    const { rerender } = render(<PaymentToggle value="USDC" onChange={mockOnChange} />);

    // Check initial state - the text color is applied to the span, not the button
    const usdcSpan = screen.getByText('USDC');
    const xlmSpan = screen.getByText('XLM');

    expect(usdcSpan).toHaveClass('text-white');
    expect(xlmSpan).toHaveClass('text-brand-text/60');

    // Rerender with XLM selected
    rerender(<PaymentToggle value="XLM" onChange={mockOnChange} />);

    expect(usdcSpan).toHaveClass('text-brand-text/60');
    expect(xlmSpan).toHaveClass('text-white');
  });
});
