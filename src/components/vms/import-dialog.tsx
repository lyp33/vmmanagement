"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Upload, Download, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ImportError {
  row: number;
  field: string;
  value: string;
  error: string;
}

interface ImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  failedCount: number;
  errors: ImportError[];
  importErrors: Array<{ vmAccount: string; error: string }>;
}

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export function ImportDialog({ open, onOpenChange, onImportComplete }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/vms/import');
      if (!response.ok) {
        throw new Error('Failed to download template');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vm-import-template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download template:', error);
      alert('Failed to download template');
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/vms/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setResult(data);

      // If any records were imported successfully, refresh the page
      if (data.successCount > 0) {
        onImportComplete();
        
        // If all records were imported successfully, close dialog automatically
        if (data.failedCount === 0) {
          setTimeout(() => {
            handleClose();
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Import error:', error);
      alert(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import VM Records</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple VM records at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Download */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div>
              <p className="font-medium text-blue-900">Need a template?</p>
              <p className="text-sm text-blue-700">Download the CSV template to get started</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Template
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Select CSV File
            </label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
            </div>
            {file && (
              <p className="text-sm text-gray-600">
                Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          {/* Import Result */}
          {result && (
            <div className="space-y-4">
              {/* Summary */}
              <Alert className={result.successCount > 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <div className="flex items-start gap-3">
                  {result.successCount > 0 && result.failedCount === 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : result.successCount > 0 ? (
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">Import Summary</h4>
                    <div className="mt-2 text-sm space-y-1">
                      <p>Total rows: {result.totalRows}</p>
                      <p className="text-green-700">✓ Successfully imported: {result.successCount}</p>
                      {result.failedCount > 0 && (
                        <p className="text-red-700">✗ Failed: {result.failedCount}</p>
                      )}
                    </div>
                  </div>
                </div>
              </Alert>

              {/* Validation Errors */}
              {result.errors.length > 0 && (
                <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <h4 className="font-semibold text-red-900 mb-2">Validation Errors</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {result.errors.map((error, index) => (
                      <div key={index} className="text-sm bg-white p-2 rounded border border-red-100">
                        <p className="font-medium text-red-800">
                          Row {error.row}, Field: {error.field}
                        </p>
                        <p className="text-red-600">
                          Value: "{error.value}" - {error.error}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Import Errors */}
              {result.importErrors && result.importErrors.length > 0 && (
                <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                  <h4 className="font-semibold text-orange-900 mb-2">Import Errors</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {result.importErrors.map((error, index) => (
                      <div key={index} className="text-sm bg-white p-2 rounded border border-orange-100">
                        <p className="font-medium text-orange-800">
                          VM Account: {error.vmAccount}
                        </p>
                        <p className="text-orange-600">{error.error}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Success Message */}
              {result.successCount > 0 && result.failedCount === 0 && (
                <p className="text-sm text-green-700">
                  All records imported successfully! The dialog will close automatically.
                </p>
              )}
              {result.successCount > 0 && result.failedCount > 0 && (
                <p className="text-sm text-yellow-700">
                  {result.successCount} record(s) imported successfully. The VM list has been refreshed. You can close this dialog to continue.
                </p>
              )}
            </div>
          )}

          {/* Instructions */}
          {!result && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">CSV Format Requirements</h4>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li><strong>email</strong>: Valid email format (required)</li>
                <li><strong>vmAccount</strong>: Unique VM account name (required)</li>
                <li><strong>vmInternalIP</strong>: Valid IP address format (required)</li>
                <li><strong>vmDomain</strong>: Valid domain name (required)</li>
                <li><strong>currentExpiryDate</strong>: Date in MM/DD/YYYY format (required)</li>
                <li><strong>projectCode</strong>: Existing project name (required)</li>
                <li><strong>lastExpiryDate</strong>: Date in MM/DD/YYYY format (optional)</li>
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button
              onClick={handleImport}
              disabled={!file || importing}
              className="flex items-center gap-2"
            >
              {importing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Import
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
