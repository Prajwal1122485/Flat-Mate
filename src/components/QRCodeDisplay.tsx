'use client';

import React from 'react';
import { Copy, Check, Upload } from 'lucide-react';

interface QRCodeDisplayProps {
  upiId: string;
  name: string;
  customQrUrl?: string;
  amount?: number;
  onUploadCustomQr?: (dataUrl: string) => void;
  allowUpload?: boolean;
}

export default function QRCodeDisplay({
  upiId,
  name,
  customQrUrl,
  amount,
  onUploadCustomQr,
  allowUpload = false,
}: QRCodeDisplayProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopyUPI = () => {
    if (!upiId) return;
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadCustomQr) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onUploadCustomQr(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Standard UPI URI format
  const cleanUpi = upiId?.trim() || 'payment@upi';
  const upiUri = `upi://pay?pa=${encodeURIComponent(cleanUpi)}&pn=${encodeURIComponent(name)}${
    amount && amount > 0 ? `&am=${amount.toFixed(2)}` : ''
  }&cu=INR`;

  // Dynamic QR code API service as fallback (using reliable api.qrserver.com with fallback SVG)
  const autoQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(
    upiUri
  )}`;

  return (
    <div className="flex flex-col items-center p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
      <div className="relative group w-48 h-48 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center p-2 mb-3">
        {customQrUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={customQrUrl}
            alt={`${name}'s Payment QR`}
            className="w-full h-full object-contain rounded-lg"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={autoQrUrl}
            alt={`UPI QR for ${name}`}
            className="w-full h-full object-contain"
            onError={(e) => {
              // If offline or image failed, show placeholder SVG
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        )}

        {allowUpload && (
          <label className="absolute inset-0 bg-slate-900/75 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-opacity duration-200">
            <Upload className="w-6 h-6 mb-1 text-indigo-400" />
            <span className="text-xs font-medium">Upload My QR Code</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        )}
      </div>

      <div className="w-full max-w-xs space-y-1.5">
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
          UPI ID for {name}
        </div>
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-mono text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700">
          <span className="truncate">{cleanUpi}</span>
          <button
            type="button"
            onClick={handleCopyUPI}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-600 dark:text-slate-300"
            title="Copy UPI ID"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
        {amount && amount > 0 && (
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
            Pay Exact Share: ₹{amount.toFixed(2)}
          </div>
        )}
      </div>

      {allowUpload && (
        <label className="mt-3 inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium cursor-pointer">
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Custom QR Image</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      )}
    </div>
  );
}
