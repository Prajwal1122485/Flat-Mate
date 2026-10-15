'use client';

import React from 'react';
import {
  X,
  MessageCircle,
  FileDown,
  CheckCircle2,
  Clock,
  User,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Member, ExpenseShare, Expense } from '@/types';
import {
  formatINR,
  generateWhatsAppLink,
  buildArrearReminderText,
} from '@/lib/calculations';
import { generateMemberExpensePDF } from '@/lib/pdfGenerator';

interface MemberCheckModalProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
  shares: ExpenseShare[];
  expenses: Expense[];
  allMembers: Member[];
  holder: Member;
  onSettleShare: (shareId: string) => void;
  onRevertShare: (shareId: string) => void;
}

export default function MemberCheckModal({
  member,
  isOpen,
  onClose,
  shares,
  expenses,
  allMembers,
  holder,
  onSettleShare,
  onRevertShare,
}: MemberCheckModalProps) {
  if (!isOpen || !member) return null;

  // Filter only this member's shares
  const memberShares = shares.filter((s) => s.debtorId === member.id);
  const expenseMap = new Map(expenses.map((e) => [e.id, e]));
  const memberMap = new Map(allMembers.map((m) => [m.id, m]));

  const totalOwed = memberShares
    .filter((s) => s.status === 'ARREAR' || s.status === 'CLAIMED_PAID')
    .reduce((sum, s) => sum + s.amount, 0);

  const totalSettled = memberShares
    .filter((s) => s.status === 'COMPLETED')
    .reduce((sum, s) => sum + s.amount, 0);

  const totalAllTime = memberShares.reduce((sum, s) => sum + s.amount, 0);

  // Group shares: pending first, then completed
  const pendingShares = memberShares.filter((s) => s.status !== 'COMPLETED');
  const completedShares = memberShares.filter((s) => s.status === 'COMPLETED');

  const handleDownloadPDF = () => {
    generateMemberExpensePDF(member, memberShares, expenses, allMembers);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm ${
                member.avatarBg || 'bg-indigo-600'
              }`}
            >
              {member.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {member.name}
                </h2>
                {member.isHolder && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 rounded-full">
                    Holder
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Phone: {member.phone || 'N/A'} • UPI: {member.upiId || 'Not set'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors"
            >
              <FileDown className="w-4 h-4" />
              <span>Export PDF Statement</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Exit modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-6 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900">
          <div className="p-4 rounded-xl bg-red-50/70 dark:bg-red-950/20 border border-red-200/80 dark:border-red-900/50">
            <div className="flex items-center justify-between text-xs font-semibold text-red-700 dark:text-red-400">
              <span>HOW MUCH HE HAS TO GIVE</span>
              <Clock className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
              {formatINR(totalOwed)}
            </div>
            <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5">
              {pendingShares.length} unsettled share{pendingShares.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/50">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <span>TOTAL SETTLED</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {formatINR(totalSettled)}
            </div>
            <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
              {completedShares.length} paid & verified
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
              <span>LIFETIME SPEND SHARE</span>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-1">
              {formatINR(totalAllTime)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Across {memberShares.length} total split items
            </p>
          </div>
        </div>

        {/* Modal Scrollable Body: Itemized Splits */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Active Arrears Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Pending Arrears ({pendingShares.length})
                </h3>
              </div>
              {totalOwed > 0 && (
                <span className="text-xs font-medium text-slate-500">
                  Total Outstanding: <strong className="text-red-600">{formatINR(totalOwed)}</strong>
                </span>
              )}
            </div>

            {pendingShares.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  All caught up! No active arrears for {member.name}.
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Any new expenses split for {member.name} will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingShares.map((share) => {
                  const parentExp = expenseMap.get(share.expenseId);
                  const creditor = memberMap.get(share.creditorId) || holder;
                  const splitCount = parentExp?.splitMemberIds?.length || 1;

                  // Pre-filled WhatsApp message
                  const waMsg = buildArrearReminderText({
                    debtorName: member.name,
                    creditorName: creditor.name,
                    creditorUpiId: creditor.upiId || holder.upiId,
                    expenseTitle: share.expenseTitle,
                    amount: share.amount,
                    category: share.category,
                  });
                  const waUrl = generateWhatsAppLink(member.phone, waMsg);

                  return (
                    <div
                      key={share.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-red-200/90 dark:border-red-900/40 bg-red-50/20 dark:bg-red-950/10 hover:border-red-300 transition-colors gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {share.expenseTitle}
                          </span>
                          <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {share.category}
                          </span>
                          <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                            Arrear (Pending)
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                          <span>
                            Date: {new Date(share.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          <span>•</span>
                          <span>
                            Total Bill: {parentExp ? formatINR(parentExp.totalAmount) : '-'} (Split between {splitCount} mates)
                          </span>
                          <span>•</span>
                          <span>Paid by: {creditor.name}</span>
                        </div>
                      </div>

                      {/* Right side: Amount & Action buttons */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-800">
                        <div className="text-left sm:text-right">
                          <div className="text-lg font-bold text-red-600 dark:text-red-400">
                            {formatINR(share.amount)}
                          </div>
                          <div className="text-[11px] text-slate-400">His Share</div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* WhatsApp Reminder Button - ACTIVE FOR UNPAID */}
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all transform active:scale-95"
                            title="Send WhatsApp Reminder with UPI ID & Amount"
                          >
                            <MessageCircle className="w-3.5 h-3.5 fill-current" />
                            <span>Remind on WhatsApp</span>
                          </a>

                          {/* Quick Settle Button */}
                          <button
                            onClick={() => onSettleShare(share.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg transition-colors"
                            title="Mark as Settled"
                          >
                            Mark Paid
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Settled History Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Completed & Settled ({completedShares.length})
              </h3>
              <span className="text-xs text-slate-400">
                Audit Trail (WhatsApp button disabled when paid)
              </span>
            </div>

            {completedShares.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No settled history yet.</p>
            ) : (
              <div className="space-y-2">
                {completedShares.map((share) => {
                  const parentExp = expenseMap.get(share.expenseId);
                  const creditor = memberMap.get(share.creditorId) || holder;
                  const settledDt = share.settledAt
                    ? new Date(share.settledAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })
                    : 'Settled';

                  return (
                    <div
                      key={share.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 opacity-80 hover:opacity-100 transition-opacity gap-2"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-slate-900 dark:text-slate-200">
                            {share.expenseTitle}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                            Settled ({settledDt})
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {share.category} • Paid to: {creditor.name}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          {formatINR(share.amount)}
                        </div>

                        {/* WhatsApp Reminder is DISABLED/HIDDEN because it is already paid */}
                        <span
                          className="px-2.5 py-1 text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 cursor-not-allowed select-none"
                          title="Share already paid - WhatsApp reminder disabled"
                        >
                          Paid ✓
                        </span>

                        {/* Holder Undo Button */}
                        <button
                          onClick={() => onRevertShare(share.id)}
                          className="text-xs text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 underline transition-colors"
                          title="Mark back as Pending if accidental"
                        >
                          Mark as Pending (Undo)
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <div className="text-xs text-slate-500">
            Exporting will generate a personal statement strictly containing <strong>{member.name}</strong>&apos;s items.
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors"
            >
              <FileDown className="w-4 h-4" />
              <span>Download {member.name}&apos;s PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition-colors"
            >
              Exit / Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
