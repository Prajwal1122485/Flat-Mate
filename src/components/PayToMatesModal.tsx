'use client';

import React, { useState } from 'react';
import {
  X,
  CreditCard,
  CheckCircle,
  Copy,
  ArrowRight,
  ShieldAlert,
  Send,
  User,
  Check,
} from 'lucide-react';
import { Member, ExpenseShare } from '@/types';
import { formatINR } from '@/lib/calculations';
import QRCodeDisplay from './QRCodeDisplay';

interface PayToMatesModalProps {
  currentMember: Member;
  isOpen: boolean;
  onClose: () => void;
  allMembers: Member[];
  shares: ExpenseShare[];
  onSubmitPaymentClaim: (claim: {
    fromMemberId: string;
    toMemberId: string;
    amount: number;
    note: string;
    shareIds?: string[];
  }) => void;
}

export default function PayToMatesModal({
  currentMember,
  isOpen,
  onClose,
  allMembers,
  shares,
  onSubmitPaymentClaim,
}: PayToMatesModalProps) {
  // Candidate recipients: all members except current user
  const otherMembers = allMembers.filter((m) => m.id !== currentMember.id);

  // Default to Holder or first other member
  const defaultRecipient =
    otherMembers.find((m) => m.isHolder) || otherMembers[0];

  const [selectedRecipientId, setSelectedRecipientId] = useState<string>(
    defaultRecipient?.id || ''
  );
  const [payAmount, setPayAmount] = useState<string>('');
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  const selectedRecipient =
    allMembers.find((m) => m.id === selectedRecipientId) || defaultRecipient;

  // Find arrears current member owes to this selected recipient
  const pendingOwedShares = shares.filter(
    (s) =>
      s.debtorId === currentMember.id &&
      s.creditorId === selectedRecipientId &&
      s.status === 'ARREAR'
  );

  const totalPendingOwed = pendingOwedShares.reduce(
    (sum, s) => sum + s.amount,
    0
  );

  const handleSelectPredefinedShare = (amount: number, title: string) => {
    setPayAmount(amount.toString());
    setPaymentNote(`Payment for ${title}`);
  };

  const handleSelectFullPending = () => {
    setPayAmount(totalPendingOwed.toString());
    setPaymentNote(`Full balance settlement for ${pendingOwedShares.length} arrears`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(payAmount);
    if (!numAmount || numAmount <= 0) return;

    onSubmitPaymentClaim({
      fromMemberId: currentMember.id,
      toMemberId: selectedRecipient.id,
      amount: numAmount,
      note:
        paymentNote.trim() ||
        `Direct payment from ${currentMember.name} to ${selectedRecipient.name}`,
      shareIds: pendingOwedShares.map((s) => s.id),
    });

    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setPayAmount('');
      setPaymentNote('');
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Pay to Mates
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Direct settlement: Scan UPI QR, transfer, and notify recipient
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

        {isSubmitted ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Payment Claim Sent!
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
              A notification and popup have been dispatched to{' '}
              <strong>{selectedRecipient?.name}</strong> to review and confirm
              receipt of <strong>₹{payAmount}</strong>.
            </p>
          </div>
        ) : (
          <div className="p-6 max-h-[80vh] overflow-y-auto space-y-6">
            {/* Step 1: Select Recipient */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                1. Select Flatmate to Pay
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {otherMembers.map((m) => {
                  const isSelected = m.id === selectedRecipientId;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedRecipientId(m.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-white ring-2 ring-indigo-500/20 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                          m.avatarBg || 'bg-slate-700'
                        }`}
                      >
                        {m.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <div className="text-sm font-semibold truncate">
                          {m.name}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {m.isHolder ? 'Holder' : 'Mate'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: View Selected Person's QR & UPI */}
            {selectedRecipient && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    2. Scan {selectedRecipient.name}&apos;s Payment QR &amp; Copy UPI
                  </div>
                  {totalPendingOwed > 0 && (
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                      Pending to give: {formatINR(totalPendingOwed)}
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
                  <QRCodeDisplay
                    name={selectedRecipient.name}
                    upiId={selectedRecipient.upiId}
                    customQrUrl={selectedRecipient.qrCodeUrl}
                    amount={parseFloat(payAmount) || undefined}
                  />

                  {/* Quick autofill buttons if there are active debts */}
                  {pendingOwedShares.length > 0 && (
                    <div className="w-full sm:w-60 space-y-2">
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Pending Arrears to Clear:
                      </div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {pendingOwedShares.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() =>
                              handleSelectPredefinedShare(s.amount, s.expenseTitle)
                            }
                            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 rounded-lg transition-colors text-left"
                          >
                            <span className="truncate pr-2 font-medium text-slate-700 dark:text-slate-300">
                              {s.expenseTitle}
                            </span>
                            <span className="font-bold text-red-600 shrink-0">
                              {formatINR(s.amount)}
                            </span>
                          </button>
                        ))}
                      </div>
                      {pendingOwedShares.length > 1 && (
                        <button
                          type="button"
                          onClick={handleSelectFullPending}
                          className="w-full py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors"
                        >
                          Fill Full Balance ({formatINR(totalPendingOwed)})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Enter Paid Amount and Mark as Paid */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Amount Paid (₹ INR) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm font-semibold text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="1"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="e.g. 450"
                      className="w-full pl-8 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Payment Note / UTR / Remarks
                  </label>
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="e.g. Sent via PhonePe for Groceries"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!payAmount || parseFloat(payAmount) <= 0}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition-all transform active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Mark as Paid &amp; Send Confirmation Request</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
