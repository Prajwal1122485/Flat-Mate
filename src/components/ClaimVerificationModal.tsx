'use client';

import React from 'react';
import {
  CheckCircle2,
  XCircle,
  X,
  CreditCard,
  UserCheck,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { DirectPaymentClaim, Member } from '@/types';
import { formatINR } from '@/lib/calculations';

interface ClaimVerificationModalProps {
  claim: DirectPaymentClaim | null;
  isOpen: boolean;
  onClose: () => void;
  allMembers: Member[];
  onConfirmReceived: (claimId: string) => void;
  onRejectClaim: (claimId: string) => void;
}

export default function ClaimVerificationModal({
  claim,
  isOpen,
  onClose,
  allMembers,
  onConfirmReceived,
  onRejectClaim,
}: ClaimVerificationModalProps) {
  if (!isOpen || !claim) return null;

  const sender = allMembers.find((m) => m.id === claim.fromMemberId);
  const senderName = sender?.name || 'A flatmate';

  const handleConfirm = () => {
    onConfirmReceived(claim.id);
    onClose();
  };

  const handleReject = () => {
    onRejectClaim(claim.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Banner */}
        <div className="p-6 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-medium mb-3 backdrop-blur-sm">
            <Clock className="w-3.5 h-3.5" />
            <span>Incoming Payment Verification</span>
          </div>
          <h2 className="text-xl font-bold">Did you receive this payment?</h2>
          <p className="text-xs text-indigo-100 mt-1">
            {senderName} reported transferring money to you via UPI.
          </p>
        </div>

        {/* Claim Details */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Amount Sent by {senderName}
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                {formatINR(claim.amount)}
              </div>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-base font-bold shadow-sm ${
                sender?.avatarBg || 'bg-indigo-600'
              }`}
            >
              {senderName.slice(0, 2).toUpperCase()}
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
              <span>Date Reported</span>
              <span className="font-semibold text-slate-900 dark:text-slate-200">
                {new Date(claim.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
              <span>Sender Remarks</span>
              <span className="font-medium text-slate-900 dark:text-slate-200 text-right max-w-[200px] truncate">
                {claim.note || 'Direct payment'}
              </span>
            </div>

            <div className="flex justify-between py-1.5 text-slate-600 dark:text-slate-400">
              <span>Sender Phone / UPI</span>
              <span className="font-mono text-slate-900 dark:text-slate-200">
                {sender?.phone} • {sender?.upiId || 'UPI'}
              </span>
            </div>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <span>
              Please verify in your GPay / PhonePe / Bank app before confirming.
              Once confirmed, it moves out of arrears permanently.
            </span>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={handleReject}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-xl border border-red-200 dark:border-red-900/50 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              <span>Not Received</span>
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all transform active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark Received ✓</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
