import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/useToast';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';

interface ShareSheetProps {
  envelopeUrl: string;
  address: string;
  memo?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareSheet = ({ envelopeUrl, address, memo, isOpen, onClose }: ShareSheetProps) => {
  const { addToast } = useToast();
  const qrRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Generate QR code on mount
  useState(() => {
    QRCode.toDataURL(envelopeUrl, { width: 256, margin: 2 })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Error generating QR:', err));
  });

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(envelopeUrl);
      addToast({ message: 'Link copied', type: 'success' });
    } catch (error) {
      addToast({ message: 'Failed to copy link', type: 'error' });
    }
  };

  const handleCopyDetails = async () => {
    try {
      const details = memo ? `${address}\n${memo}` : address;
      await navigator.clipboard.writeText(details);
      addToast({ message: 'Funding details copied', type: 'success' });
    } catch (error) {
      addToast({ message: 'Failed to copy details', type: 'error' });
    }
  };

  const handleDownloadQR = async () => {
    if (!qrRef.current) return;

    try {
      // Download as PNG using html2canvas
      const canvas = await html2canvas(qrRef.current, {
        backgroundColor: '#ffffff',
        scale: 2
      });
      
      const link = document.createElement('a');
      link.download = 'envelope-qr.png';
      link.href = canvas.toDataURL();
      link.click();

      // Also create SVG version
      const svgData = await QRCode.toString(envelopeUrl, { type: 'svg', width: 256 });
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
      const svgUrl = URL.createObjectURL(svgBlob);
      
      const svgLink = document.createElement('a');
      svgLink.download = 'envelope-qr.svg';
      svgLink.href = svgUrl;
      setTimeout(() => {
        svgLink.click();
        URL.revokeObjectURL(svgUrl);
      }, 100);

      addToast({ message: 'QR codes downloaded', type: 'success' });
    } catch (error) {
      addToast({ message: 'Failed to download QR', type: 'error' });
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;

    const printContent = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      addToast({ message: 'Failed to open print window', type: 'error' });
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fund Envelope</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              padding: 40px;
              max-width: 600px;
              margin: 0 auto;
            }
            .qr-container {
              text-align: center;
              margin: 40px 0;
            }
            .qr-code {
              width: 256px;
              height: 256px;
              margin: 0 auto;
            }
            .details {
              margin-top: 40px;
              padding: 20px;
              border: 1px solid #e5e5e5;
              border-radius: 8px;
            }
            .detail-row {
              margin: 10px 0;
              display: flex;
              justify-content: space-between;
            }
            .label {
              font-weight: 600;
            }
            .value {
              font-family: monospace;
              word-break: break-all;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Share Envelope
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {/* QR Code Preview */}
        <div ref={qrRef} className="bg-white p-4 rounded-lg mb-6">
          {qrDataUrl && (
            <img src={qrDataUrl} alt="Envelope QR Code" className="w-full h-auto max-w-[256px] mx-auto" />
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            onClick={handleCopyLink}
            className="w-full justify-start"
          >
            <span className="mr-2">🔗</span>
            Copy Link
          </Button>

          <Button
            variant="outline"
            onClick={handleCopyDetails}
            className="w-full justify-start"
          >
            <span className="mr-2">📋</span>
            Copy Funding Details
          </Button>

          <Button
            variant="outline"
            onClick={handleDownloadQR}
            className="w-full justify-start"
          >
            <span className="mr-2">⬇</span>
            Download QR (SVG + PNG)
          </Button>

          <Button
            variant="outline"
            onClick={handlePrint}
            className="w-full justify-start"
          >
            <span className="mr-2">🖨</span>
            Print
          </Button>
        </div>

        {/* Hidden Print Content */}
        <div ref={printRef} style={{ display: 'none' }}>
          <div className="qr-container">
            <h1>Fund Envelope</h1>
            <div className="qr-code">
              {qrDataUrl && <img src={qrDataUrl} alt="QR Code" style={{ width: '100%', height: '100%' }} />}
            </div>
          </div>
          <div className="details">
            <div className="detail-row">
              <span className="label">Envelope URL:</span>
              <span className="value">{envelopeUrl}</span>
            </div>
            <div className="detail-row">
              <span className="label">Address:</span>
              <span className="value">{address}</span>
            </div>
            {memo && (
              <div className="detail-row">
                <span className="label">Memo:</span>
                <span className="value">{memo}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};