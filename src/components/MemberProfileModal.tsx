'use client';

import React, { useState } from 'react';
import { X, QrCode, Upload, CreditCard, Phone, Wallet, Check } from 'lucide-react';
import { Member } from '@/types';
import QRCodeDisplay from './QRCodeDisplay';

interface MemberProfileModalProps {
  member: Member;
  isOpen: boolean;
  onClose: () => void;
  onUpdateMember: (updated: Member) => void;
}

export default function MemberProfileModal({
  member,
  isOpen,
  onClose,
  onUpdateMember,
}: MemberProfileModalProps) {
  const [upiId, setUpiId] = useState(member.upiId || '');
  const [phone, setPhone] = useState(member.phone || '');
  const [budget, setBudget] = useState(member.monthlyBudget?.toString() || '9000');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | undefined>(member.qrCodeUrl);
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleUploadQr = (dataUrl: string) => {
    setQrCodeUrl(dataUrl);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateMember({
      ...member,
      upiId: upiId.trim(),
      phone: phone.trim(),
      monthlyBudget: parseFloat(budget) || 9000,
      qrCodeUrl,
    });

    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                My Payment QR &amp; Settings
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Setup your UPI ID &amp; QR so roommates can pay you back instantly
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 max-h-[82vh] overflow-y-auto space-y-5">
          {/* QR Code Preview & Upload Area */}
          <div className="flex flex-col items-center justify-center">
            <QRCodeDisplay
              name={member.name}
              upiId={upiId}
              customQrUrl={qrCodeUrl}
              onUploadCustomQr={handleUploadQr}
              allowUpload={true}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Hover over or click the QR code image to upload your GPay / PhonePe / Paytm QR
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Your UPI ID (Virtual Payment Address) *
              </label>
              <div className="relative">
                <CreditCard className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. yourname@okhdfcbank"
                  className="w-full pl-9 pr-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Mobile Phone (for WhatsApp Reminders)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9845012345"
                  className="w-full pl-9 pr-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Monthly Spending Budget (₹ INR)
              </label>
              <div className="relative">
                <Wallet className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="number"
                  step="500"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="e.g. 9000"
                  className="w-full pl-9 pr-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Used in your portal for smart budget tracking and money savings tips.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all"
            >
              {isSaved ? <Check className="w-4 h-4" /> : null}
              <span>{isSaved ? 'Saved!' : 'Save Credentials'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
