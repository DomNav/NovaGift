import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RouteChips } from './RouteChips';
import { useRoutePreference } from '@/hooks/useRoutePreference';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('RouteChips', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('renders all route options', () => {
    render(<RouteChips value="best" onChange={mockOnChange} />);
    
    expect(screen.getByText('Best')).toBeInTheDocument();
    expect(screen.getByText('DEX')).toBeInTheDocument();
    expect(screen.getByText('AMM')).toBeInTheDocument();
  });

  it('highlights the selected route', () => {
    render(<RouteChips value="dex" onChange={mockOnChange} />);
    
    const dexButton = screen.getByText('DEX');
    expect(dexButton).toHaveAttribute('aria-pressed', 'true');
    
    const bestButton = screen.getByText('Best');
    expect(bestButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange when a route is clicked', () => {
    render(<RouteChips value="best" onChange={mockOnChange} />);
    
    const ammButton = screen.getByText('AMM');
    fireEvent.click(ammButton);
    
    expect(mockOnChange).toHaveBeenCalledWith('amm');
  });

  it('respects size prop', () => {
    const { rerender } = render(
      <RouteChips value="best" onChange={mockOnChange} size="sm" />
    );
    
    // Check that buttons have small size
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button.className).toContain('h-9'); // sm size class
    });
    
    rerender(<RouteChips value="best" onChange={mockOnChange} size="md" />);
    
    // Check that buttons have default size
    const buttonsAfter = screen.getAllByRole('button');
    buttonsAfter.forEach(button => {
      expect(button.className).toContain('h-10'); // default size class
    });
  });

  it('has correct accessibility attributes', () => {
    render(<RouteChips value="best" onChange={mockOnChange} />);
    
    const group = screen.getByRole('group');
    expect(group).toHaveAttribute('aria-label', 'Select routing preference');
  });
});

describe('useRoutePreference', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('returns default value when localStorage is empty', () => {
    const TestComponent = () => {
      const [route] = useRoutePreference();
      return <div>{route}</div>;
    };

    render(<TestComponent />);
    expect(screen.getByText('best')).toBeInTheDocument();
  });

  it('reads initial value from localStorage', () => {
    localStorageMock.setItem('nv.route', 'amm');
    
    const TestComponent = () => {
      const [route] = useRoutePreference();
      return <div>{route}</div>;
    };

    render(<TestComponent />);
    expect(screen.getByText('amm')).toBeInTheDocument();
  });

  it('updates localStorage when route changes', () => {
    const TestComponent = () => {
      const [route, setRoute] = useRoutePreference();
      return (
        <div>
          <span>{route}</span>
          <button onClick={() => setRoute('dex')}>Set DEX</button>
        </div>
      );
    };

    render(<TestComponent />);
    
    const button = screen.getByText('Set DEX');
    fireEvent.click(button);
    
    expect(localStorageMock.getItem('nv.route')).toBe('dex');
    expect(screen.getByText('dex')).toBeInTheDocument();
  });
});