'use client';

import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  CheckCircle2,
  ShieldCheck,
  QrCode,
  Smartphone,
} from 'lucide-react';
import { Member } from '@/types';
import { formatINR } from '@/lib/calculations';
import QRCodeDisplay from './QRCodeDisplay';

interface SafeUpiPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: Member;
  amount: number;
  billTitle: string;
  onPaymentClaimed?: (note?: string) => void;
}

export default function SafeUpiPaymentModal({
  isOpen,
  onClose,
  recipient,
  amount,
  billTitle,
  onPaymentClaimed,
}: SafeUpiPaymentModalProps) {
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [activeTab, setActiveTab] = useState<'qr' | 'apps'>('qr');
  const [userPaidNote, setUserPaidNote] = useState('');

  if (!isOpen || !recipient) return null;

  const cleanUpi = recipient.upiId?.trim() || '';
  const cleanName = recipient.name?.trim() || 'Flatmate';
  const roundedAmount = Math.round(amount);

  const handleCopyUpi = () => {
    if (!cleanUpi) return;
    navigator.clipboard.writeText(cleanUpi);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleCopyAmount = () => {
    navigator.clipboard.writeText(roundedAmount.toString());
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  // Launch specific UPI app safely with auto-copied UPI ID
  const handleOpenApp = (appType: 'gpay' | 'phonepe' | 'paytm' | 'generic') => {
    // 1. First automatically copy UPI ID to clipboard so if the bank blocks intent, user can paste in 1 tap
    if (cleanUpi) {
      navigator.clipboard.writeText(cleanUpi);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 3000);
    }

    // 2. Clean sanitized intent URI without 'tn' or forced merchant codes that trigger bank fraud filters
    const basePayload = `pa=${encodeURIComponent(cleanUpi)}&pn=${encodeURIComponent(cleanName)}&am=${roundedAmount}&cu=INR`;

    let targetUri = `upi://pay?${basePayload}`;
    if (appType === 'gpay') {
      targetUri = `tez://upi/pay?${basePayload}`;
    } else if (appType === 'phonepe') {
      targetUri = `phonepe://pay?${basePayload}`;
    } else if (appType === 'paytm') {
      targetUri = `paytmmp://pay?${basePayload}`;
    }

    // Try opening the deep link safely
    window.location.href = targetUri;
  };

  const handleConfirmPaid = () => {
    if (onPaymentClaimed) {
      onPaymentClaimed(
        userPaidNote.trim() || `Paid ${formatINR(roundedAmount)} for ${billTitle}`
      );
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-md ${
                recipient.avatarBg || 'bg-indigo-600'
              }`}
            >
              {cleanName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Pay {cleanName}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Zero Bank Error Mode
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-xs">
                {billTitle} &bull; Total: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{formatINR(roundedAmount)}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Security Notice Explaining Why QR / Copy is Safe */}
          <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300/60 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-950 dark:text-amber-100">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Safe NPCI Payment Method</span>
            </div>
            <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
              Banks block pre-filled browser web links on personal UPI accounts with security warnings.
              <strong> Scanning the QR code or pasting the copied UPI ID</strong> is 100% allowed by NPCI and will never be blocked!
            </p>
          </div>

          {/* Quick Tab Selector: QR Code vs Direct UPI Apps */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('qr')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'qr'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Scan QR Code (Safe)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('apps')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'apps'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Open Payment Apps</span>
            </button>
          </div>

          {/* TAB 1: QR CODE DISPLAY */}
          {activeTab === 'qr' && (
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="p-3 bg-white dark:bg-slate-950 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-md">
                <QRCodeDisplay
                  name={cleanName}
                  upiId={cleanUpi}
                  customQrUrl={recipient.qrCodeUrl}
                  amount={roundedAmount}
                />
              </div>
              <p className="text-[11px] text-slate-500 text-center max-w-xs">
                Scan with Google Pay, PhonePe, or Paytm camera. You can also take a screenshot of this QR to scan from gallery.
              </p>
            </div>
          )}

          {/* TAB 2: UPI APPS LAUNCHER & 1-CLICK COPY */}
          {activeTab === 'apps' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Select Your Payment App:
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Google Pay */}
                <button
                  type="button"
                  onClick={() => handleOpenApp('gpay')}
                  className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all flex items-center gap-2.5 text-left group"
                >
                  <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-sm text-indigo-600 shadow-sm">
                    G
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Google Pay
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Auto-copies UPI ID
                    </div>
                  </div>
                </button>

                {/* PhonePe */}
                <button
                  type="button"
                  onClick={() => handleOpenApp('phonepe')}
                  className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 transition-all flex items-center gap-2.5 text-left group"
                >
                  <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    पे
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      PhonePe
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Auto-copies UPI ID
                    </div>
                  </div>
                </button>

                {/* Paytm */}
                <button
                  type="button"
                  onClick={() => handleOpenApp('paytm')}
                  className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:border-sky-500 hover:bg-sky-50/50 dark:hover:bg-sky-950/30 transition-all flex items-center gap-2.5 text-left group"
                >
                  <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    Py
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Paytm
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Auto-copies UPI ID
                    </div>
                  </div>
                </button>

                {/* Any UPI App */}
                <button
                  type="button"
                  onClick={() => handleOpenApp('generic')}
                  className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-all flex items-center gap-2.5 text-left group"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    UPI
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Any UPI App
                    </div>
                    <div className="text-[10px] text-slate-400">
                      BHIM / Cred / Other
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Copyable Credentials Box */}
          <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Recipient UPI ID:</span>
              <button
                type="button"
                onClick={handleCopyUpi}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 shadow-xs transition-colors"
              >
                {copiedUpi ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy UPI</span>
                  </>
                )}
              </button>
            </div>
            <div className="font-mono font-bold text-sm text-slate-900 dark:text-white truncate">
              {cleanUpi || 'No UPI ID set for this recipient'}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Exact Amount:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">
                  {formatINR(roundedAmount)}
                </span>
                <button
                  type="button"
                  onClick={handleCopyAmount}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {copiedAmount ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          {/* Optional Note for Confirmation */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Payment Remarks / UTR Reference (Optional):
            </label>
            <input
              type="text"
              placeholder="e.g. Sent via GPay (Ref: 1234...)"
              value={userPaidNote}
              onChange={(e) => setUserPaidNote(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 space-y-2">
          <button
            type="button"
            onClick={handleConfirmPaid}
            className="w-full py-3 px-4 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-600/25 transition-transform active:scale-95 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>I Have Paid &bull; Send Confirmation to {cleanName}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            Cancel / Pay Later
          </button>
        </div>
      </div>
    </div>
  );
}
