import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QRScanner } from './QRScanner';

// Mock the QR scanner library
vi.mock('@yudiel/react-qr-scanner', () => ({
  QrScanner: ({ onDecode, onError }: any) => {
    // Store callbacks for testing
    (window as any).__qrCallbacks = { onDecode, onError };
    return <div data-testid="qr-scanner">Mock QR Scanner</div>;
  },
}));

// Mock jsQR
vi.mock('jsqr', () => ({
  default: vi.fn(),
}));

describe('QRScanner', () => {
  const mockOnResult = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset navigator.mediaDevices mock
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn() },
      writable: true,
    });
  });

  it('renders scanner when camera is available', () => {
    render(<QRScanner onResult={mockOnResult} />);
    
    expect(screen.getByTestId('qr-scanner')).toBeInTheDocument();
    expect(screen.getByText('Scan QR Code')).toBeInTheDocument();
  });

  it('renders custom overlay label', () => {
    render(
      <QRScanner 
        onResult={mockOnResult} 
        overlayLabel="Scan Envelope QR" 
      />
    );
    
    expect(screen.getByText('Scan Envelope QR')).toBeInTheDocument();
  });

  it('calls onResult when QR code is decoded', () => {
    render(<QRScanner onResult={mockOnResult} />);
    
    // Trigger decode callback
    const callbacks = (window as any).__qrCallbacks;
    callbacks.onDecode('test-qr-data');
    
    expect(mockOnResult).toHaveBeenCalledWith('test-qr-data');
  });

  it('shows close button when onClose is provided', () => {
    render(<QRScanner onResult={mockOnResult} onClose={mockOnClose} />);
    
    const closeButton = screen.getByText('✕');
    expect(closeButton).toBeInTheDocument();
    
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows file input fallback when camera is not available', () => {
    // Mock navigator.mediaDevices as undefined
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      writable: true,
    });

    render(<QRScanner onResult={mockOnResult} />);
    
    expect(screen.getByText('Camera not available')).toBeInTheDocument();
    expect(screen.getByText('Please upload an image containing a QR code')).toBeInTheDocument();
  });

  it('shows file input when scanner encounters error', () => {
    render(<QRScanner onResult={mockOnResult} />);
    
    // Trigger error callback
    const callbacks = (window as any).__qrCallbacks;
    callbacks.onError(new Error('Camera permission denied'));
    
    expect(screen.getByText('Camera permission denied')).toBeInTheDocument();
  });

  it('handles file upload', async () => {
    const jsQR = await import('jsqr');
    (jsQR.default as any).mockReturnValue({
      data: 'file-qr-data',
    });

    // Mock navigator.mediaDevices as undefined to show file input
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      writable: true,
    });

    render(<QRScanner onResult={mockOnResult} />);
    
    const fileInput = screen.getByLabelText(/upload/i, { selector: 'input[type="file"]' }) || 
                     document.querySelector('input[type="file"]');
    
    if (!fileInput) {
      throw new Error('File input not found');
    }

    // Create a mock file
    const file = new File(['dummy'], 'qr.png', { type: 'image/png' });
    
    // Mock Image and Canvas
    const mockImage = {
      onload: null as any,
      src: '',
      width: 100,
      height: 100,
    };
    
    global.Image = vi.fn(() => mockImage) as any;
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    
    const mockCanvas = {
      getContext: vi.fn(() => ({
        drawImage: vi.fn(),
        getImageData: vi.fn(() => ({
          data: new Uint8ClampedArray(100 * 100 * 4),
          width: 100,
          height: 100,
        })),
      })),
      width: 0,
      height: 0,
    };
    
    document.createElement = vi.fn((tag) => {
      if (tag === 'canvas') return mockCanvas as any;
      return document.createElementNS('http://www.w3.org/1999/xhtml', tag);
    });

    // Trigger file change
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Trigger image load
    await waitFor(() => {
      if (mockImage.onload) {
        mockImage.onload();
      }
    });

    await waitFor(() => {
      expect(mockOnResult).toHaveBeenCalledWith('file-qr-data');
    });
  });

  it('shows error when no QR code found in uploaded image', async () => {
    const jsQR = await import('jsqr');
    (jsQR.default as any).mockReturnValue(null);

    // Mock navigator.mediaDevices as undefined to show file input
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      writable: true,
    });

    render(<QRScanner onResult={mockOnResult} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    // Create a mock file
    const file = new File(['dummy'], 'no-qr.png', { type: 'image/png' });
    
    // Mock Image
    const mockImage = {
      onload: null as any,
      src: '',
      width: 100,
      height: 100,
    };
    
    global.Image = vi.fn(() => mockImage) as any;
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    
    const mockCanvas = {
      getContext: vi.fn(() => ({
        drawImage: vi.fn(),
        getImageData: vi.fn(() => ({
          data: new Uint8ClampedArray(100 * 100 * 4),
          width: 100,
          height: 100,
        })),
      })),
      width: 0,
      height: 0,
    };
    
    document.createElement = vi.fn((tag) => {
      if (tag === 'canvas') return mockCanvas as any;
      return document.createElementNS('http://www.w3.org/1999/xhtml', tag);
    });

    // Trigger file change
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Trigger image load
    await waitFor(() => {
      if (mockImage.onload) {
        mockImage.onload();
      }
    });

    await waitFor(() => {
      expect(screen.getByText('No QR code found in image')).toBeInTheDocument();
    });
  });
});