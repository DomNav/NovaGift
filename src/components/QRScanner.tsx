import { useState, useRef } from 'react';
import { QrScanner } from '@yudiel/react-qr-scanner';
import jsQR from 'jsqr';
import { Button } from './ui/button';

interface QRScannerProps {
  onResult: (text: string) => void;
  onClose?: () => void;
  className?: string;
  overlayLabel?: string;
}

export const QRScanner = ({ 
  onResult, 
  onClose,
  className = '', 
  overlayLabel = 'Scan QR Code' 
}: QRScannerProps) => {
  const [error, setError] = useState<string | null>(null);
  const [showFileInput, setShowFileInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDecode = (result: string) => {
    if (result) {
      onResult(result);
    }
  };

  const handleError = (error: Error) => {
    console.error('QR Scanner error:', error);
    setError(error.message);
    // Show file input as fallback
    setShowFileInput(true);
  };

  const decodeQRFromFile = async (file: File) => {
    try {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        if (!ctx) return;
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code) {
          onResult(code.data);
        } else {
          setError('No QR code found in image');
        }
      };

      img.src = URL.createObjectURL(file);
    } catch (err) {
      setError('Failed to read QR code from image');
      console.error(err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      decodeQRFromFile(file);
    }
  };

  // Check if camera is available
  const isCameraAvailable = typeof navigator !== 'undefined' && navigator.mediaDevices;

  return (
    <div className={`fixed inset-0 z-50 bg-black/80 dark:bg-black/90 ${className}`}>
      <div className="relative w-full h-full flex flex-col items-center justify-center">
        {/* Close button */}
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
          >
            ✕
          </Button>
        )}

        {/* Overlay label */}
        <div className="absolute top-20 left-0 right-0 text-center">
          <h2 className="text-white text-xl font-medium">{overlayLabel}</h2>
        </div>

        {/* Scanner or fallback */}
        {isCameraAvailable && !showFileInput ? (
          <div className="relative w-full max-w-md mx-auto">
            <QrScanner
              onDecode={handleDecode}
              onError={handleError}
              containerStyle={{
                width: '100%',
                maxWidth: '400px',
                margin: '0 auto'
              }}
              videoStyle={{
                borderRadius: '12px'
              }}
            />
            
            {/* Gradient overlay corners */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-white rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-white rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-white rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-white rounded-br-xl" />
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl max-w-md mx-4">
            <h3 className="text-lg font-medium mb-4 text-slate-900 dark:text-slate-100">
              {error || 'Camera not available'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Please upload an image containing a QR code
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="w-full text-sm text-slate-900 dark:text-slate-100
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-medium
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                dark:file:bg-blue-900/20 dark:file:text-blue-400
                dark:hover:file:bg-blue-900/30"
            />
            
            {error && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
          </div>
        )}

        {/* Alternative file upload button */}
        {isCameraAvailable && !showFileInput && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 text-white/80 hover:text-white text-sm underline"
          >
            Or upload from gallery
          </button>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
};