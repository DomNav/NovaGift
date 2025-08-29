import { useState, useRef } from 'react';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/useToast';

interface CSVImportProps {
  onImportComplete?: () => void;
}

interface ImportResult {
  okCount: number;
  errorCount: number;
  errorCsvUrl?: string;
}

export const CSVImport = ({ onImportComplete }: CSVImportProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      setResult(null);
    } else if (file) {
      addToast({ message: 'Please select a CSV file', type: 'error' });
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('csv', selectedFile);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/contacts/import', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const data: ImportResult = await response.json();
      setResult(data);

      // Show result toast
      if (data.errorCount === 0) {
        addToast({ 
          message: `Successfully imported ${data.okCount} contacts`, 
          type: 'success' 
        });
      } else {
        addToast({ 
          message: `Imported ${data.okCount} contacts, ${data.errorCount} failed`, 
          type: 'warning' 
        });
      }

      // Reset file selection
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Callback to refresh list
      onImportComplete?.();
    } catch (error) {
      console.error('Import error:', error);
      addToast({ message: 'Import failed', type: 'error' });
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  const handleDownloadErrors = () => {
    if (result?.errorCsvUrl) {
      window.open(result.errorCsvUrl, '_blank');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
        Import Contacts from CSV
      </h3>

      <div className="space-y-4">
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
            id="csv-upload"
          />
          <label
            htmlFor="csv-upload"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 
              bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 
              hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
          >
            📁 Choose CSV File
          </label>
          
          {selectedFile && (
            <span className="ml-3 text-sm text-slate-600 dark:text-slate-400">
              {selectedFile.name}
            </span>
          )}
        </div>

        {selectedFile && !isUploading && (
          <Button onClick={handleImport}>
            Import Contacts
          </Button>
        )}

        {isUploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Importing...</span>
              <span className="text-slate-900 dark:text-slate-100">{progress}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-blue-500 h-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {result && (
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-slate-900 dark:text-slate-100">
              Import Results
            </h4>
            
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Successful:</span>
                <span className="text-green-600 dark:text-green-400 font-medium">
                  {result.okCount} contacts
                </span>
              </div>
              
              {result.errorCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Failed:</span>
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    {result.errorCount} contacts
                  </span>
                </div>
              )}
            </div>

            {result.errorCsvUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadErrors}
                className="w-full"
              >
                ⬇ Download Error Report
              </Button>
            )}
          </div>
        )}

        <div className="text-xs text-slate-500 dark:text-slate-400">
          <p className="mb-1">CSV format: name, email/phone, wallet (optional), tags (optional)</p>
          <p>Example: John Doe, john@example.com, GXXXXX, VIP;Team</p>
        </div>
      </div>
    </div>
  );
};