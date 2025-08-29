import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareSheet } from './ShareSheet';

// Mock dependencies
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    addToast: vi.fn(),
  }),
}));

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mockQR'),
    toString: vi.fn().mockResolvedValue('<svg>mock</svg>'),
  },
}));

vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    toDataURL: () => 'data:image/png;base64,mockCanvas',
  }),
}));

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

describe('ShareSheet', () => {
  const defaultProps = {
    envelopeUrl: 'https://novagift.app/envelope/123',
    address: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    memo: 'Test Memo',
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open', () => {
    render(<ShareSheet {...defaultProps} />);
    expect(screen.getByText('Share Envelope')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ShareSheet {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Share Envelope')).not.toBeInTheDocument();
  });

  it('displays all action buttons', () => {
    render(<ShareSheet {...defaultProps} />);
    expect(screen.getByText('Copy Link')).toBeInTheDocument();
    expect(screen.getByText('Copy Funding Details')).toBeInTheDocument();
    expect(screen.getByText('Download QR (SVG + PNG)')).toBeInTheDocument();
    expect(screen.getByText('Print')).toBeInTheDocument();
  });

  it('copies link to clipboard when Copy Link is clicked', async () => {
    render(<ShareSheet {...defaultProps} />);
    const copyLinkButton = screen.getByText('Copy Link');
    
    fireEvent.click(copyLinkButton);
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(defaultProps.envelopeUrl);
    });
  });

  it('copies funding details with memo when Copy Funding Details is clicked', async () => {
    render(<ShareSheet {...defaultProps} />);
    const copyDetailsButton = screen.getByText('Copy Funding Details');
    
    fireEvent.click(copyDetailsButton);
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        `${defaultProps.address}\n${defaultProps.memo}`
      );
    });
  });

  it('copies only address when memo is not provided', async () => {
    const propsWithoutMemo = { ...defaultProps, memo: undefined };
    render(<ShareSheet {...propsWithoutMemo} />);
    const copyDetailsButton = screen.getByText('Copy Funding Details');
    
    fireEvent.click(copyDetailsButton);
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(defaultProps.address);
    });
  });

  it('calls onClose when close button is clicked', () => {
    render(<ShareSheet {...defaultProps} />);
    const closeButton = screen.getByText('✕');
    
    fireEvent.click(closeButton);
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('creates download links when Download QR is clicked', async () => {
    const createElementSpy = vi.spyOn(document, 'createElement');
    const { container } = render(<ShareSheet {...defaultProps} />);
    
    // Wait for QR generation
    await waitFor(() => {
      const qrImage = container.querySelector('img[alt="Envelope QR Code"]');
      expect(qrImage).toBeInTheDocument();
    });

    const downloadButton = screen.getByText('Download QR (SVG + PNG)');
    fireEvent.click(downloadButton);

    await waitFor(() => {
      // Should create anchor elements for download
      const anchorCalls = createElementSpy.mock.calls.filter(call => call[0] === 'a');
      expect(anchorCalls.length).toBeGreaterThan(0);
    });
  });

  it('opens print window when Print is clicked', () => {
    const mockOpen = vi.fn().mockReturnValue({
      document: {
        write: vi.fn(),
        close: vi.fn(),
      },
      focus: vi.fn(),
      print: vi.fn(),
      close: vi.fn(),
    });
    
    window.open = mockOpen;
    
    render(<ShareSheet {...defaultProps} />);
    const printButton = screen.getByText('Print');
    
    fireEvent.click(printButton);
    
    expect(mockOpen).toHaveBeenCalledWith('', '_blank');
  });
});