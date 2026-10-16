'use client';

import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  PlusCircle,
  Users,
  Calendar,
  FileDown,
  CheckCircle2,
  Clock,
  ArrowRight,
  Edit2,
  Edit3,
  Trash2,
  Search,
  RotateCcw,
  ShoppingBag,
  TrendingUp,
  Receipt,
  UserPlus,
  Lock,
  KeyRound,
  Shield,
  MessageCircle,
} from 'lucide-react';
import {
  Member,
  Expense,
  ExpenseShare,
  RecurringBill,
  PurchaseRequest,
  DirectPaymentClaim,
} from '@/types';
import {
  formatINR,
  calculateNetBalances,
  getRecurringBillStatus,
  getDirectDebtSummaries,
} from '@/lib/calculations';
import { getAutomatedRentReminders } from '@/lib/whatsappAutomation';
import { generateHolderMasterAuditPDF } from '@/lib/pdfGenerator';

interface HolderPortalProps {
  holder: Member;
  members: Member[];
  expenses: Expense[];
  shares: ExpenseShare[];
  recurringBills: RecurringBill[];
  purchaseRequests: PurchaseRequest[];
  paymentClaims: DirectPaymentClaim[];
  holderPasscode?: string;
  onUpdateHolderPasscode?: (newPasscode: string) => void;
  onOpenRecordExpense: () => void;
  onOpenRentManager: () => void;
  onOpenCheckModal: (member: Member) => void;
  onOpenEditMember: (member: Member) => void;
  onOpenAddMember: () => void;
  onSettleShare: (shareId: string) => void;
  onRevertShare: (shareId: string) => void;
  onConfirmPaymentClaim: (claimId: string) => void;
  onRejectPaymentClaim: (claimId: string) => void;
  onConvertRequestToExpense: (request: PurchaseRequest, targetMemberIds?: string[]) => void;
  onOpenEditExpense?: (expense: Expense) => void;
  onDeleteExpense?: (expenseId: string) => void;
  onDeleteShare?: (shareId: string) => void;
  onDeletePurchaseRequest?: (requestId: string) => void;
  onUpdateMember?: (updated: Member) => void;
}

export default function HolderPortal({
  holder,
  members,
  expenses,
  shares,
  recurringBills,
  purchaseRequests,
  paymentClaims,
  holderPasscode = '1234',
  onUpdateHolderPasscode,
  onOpenRecordExpense,
  onOpenRentManager,
  onOpenCheckModal,
  onOpenEditMember,
  onOpenAddMember,
  onSettleShare,
  onRevertShare,
  onConfirmPaymentClaim,
  onRejectPaymentClaim,
  onConvertRequestToExpense,
  onOpenEditExpense,
  onDeleteExpense,
  onDeleteShare,
  onDeletePurchaseRequest,
  onUpdateMember,
}: HolderPortalProps) {
  const [activeTab, setActiveTab] = useState<'mates' | 'expenses' | 'arrears' | 'completed' | 'requests' | 'matrix' | 'security'>('mates');
  const [arrearFilter, setArrearFilter] = useState<'all' | 'owedToMe' | 'owedByMe' | string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCatFilter, setExpenseCatFilter] = useState('all');

  // Subset split modal state for purchase requests
  const [subsetRequest, setSubsetRequest] = useState<PurchaseRequest | null>(null);
  const [subsetSelectedMemberIds, setSubsetSelectedMemberIds] = useState<string[]>([]);

  // Passcode change state
  const [newPasscode, setNewPasscode] = useState('');
  const [passcodeSuccess, setPasscodeSuccess] = useState(false);

  // Metrics
  const totalSpentViaHolder = useMemo(() => {
    return expenses
      .filter((e) => e.paidById === holder.id)
      .reduce((sum, e) => sum + e.totalAmount, 0);
  }, [expenses, holder.id]);

  const totalUnresolvedArrears = useMemo(() => {
    return shares
      .filter((s) => s.status === 'ARREAR' && s.creditorId === holder.id)
      .reduce((sum, s) => sum + s.amount, 0);
  }, [shares, holder.id]);

  const currentMonthSpend = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    return expenses
      .filter((e) => {
        const dt = new Date(e.createdAt);
        return dt.getFullYear() === curYear && dt.getMonth() === curMonth;
      })
      .reduce((sum, e) => sum + e.totalAmount, 0);
  }, [expenses]);

  // House Rent on 11th status
  const rentBill = recurringBills.find((b) => b.dueDay === 11) || recurringBills[0];
  const rentStatus = rentBill ? getRecurringBillStatus(rentBill) : null;

  // Net Balance matrix
  const netBalances = useMemo(() => {
    return calculateNetBalances(members, shares);
  }, [members, shares]);

  // Crystal clear direct debt summaries ("Rohan has to give ₹X to Prajwal")
  const directDebts = useMemo(() => {
    return getDirectDebtSummaries(members, shares);
  }, [members, shares]);

  // Automated WhatsApp Rent reminders (active within 3 days before 11th or 15th)
  const automatedReminders = useMemo(() => {
    return getAutomatedRentReminders(recurringBills, members, shares, holder);
  }, [recurringBills, members, shares, holder]);

  // Active Arrears
  const activeArrears = useMemo(() => {
    return shares.filter((s) => s.status === 'ARREAR');
  }, [shares]);

  // Completed Shares
  const completedShares = useMemo(() => {
    return shares.filter((s) => s.status === 'COMPLETED');
  }, [shares]);

  // Filtered Arrears
  const filteredArrears = useMemo(() => {
    return activeArrears.filter((s) => {
      if (arrearFilter === 'owedToMe') {
        if (s.creditorId !== holder.id) return false;
      } else if (arrearFilter === 'owedByMe') {
        if (s.debtorId !== holder.id) return false;
      } else if (arrearFilter !== 'all') {
        if (s.debtorId !== arrearFilter && s.creditorId !== arrearFilter) return false;
      }
      if (selectedCategory !== 'all' && s.category !== selectedCategory) return false;
      return true;
    });
  }, [activeArrears, arrearFilter, selectedCategory, holder.id]);

  // Filtered Expenses for Management
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchSearch =
        e.title.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        (e.notes && e.notes.toLowerCase().includes(expenseSearch.toLowerCase()));
      const matchCat =
        expenseCatFilter === 'all' || e.category === expenseCatFilter;
      return matchSearch && matchCat;
    });
  }, [expenses, expenseSearch, expenseCatFilter]);

  // Pending claims to Holder
  const pendingClaimsToHolder = paymentClaims.filter(
    (c) => c.toMemberId === holder.id && c.status === 'PENDING'
  );

  const handleQuickSettle = (shareId: string) => {
    onSettleShare(shareId);
  };

  const handleExportMasterAudit = () => {
    generateHolderMasterAuditPDF(expenses, shares, members);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner / Role Identity */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-indigo-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
              Holder Authority Active
            </span>
            <span className="text-xs text-indigo-300">
              Transaction &amp; Split Controller
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Holder Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Welcome, <strong>{holder.name}</strong>. House expenses, rent dates, member checks, and settlements are managed here.
          </p>
        </div>

        {/* Master Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {/* ONLY HOLDER CAN RECORD NEW EXPENSE */}
          <button
            type="button"
            onClick={onOpenRecordExpense}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all transform active:scale-95"
            title="Holder-exclusive: Record bill & dynamically split shares"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record New Expense</span>
          </button>

          <button
            type="button"
            onClick={onOpenRentManager}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors"
            title="House Rent (11th) and Appliances (15th) manager"
          >
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span>Rents &amp; Bills</span>
          </button>

          <button
            type="button"
            onClick={handleExportMasterAudit}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Download Master Audit PDF Statement"
          >
            <FileDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Spent Via Holder */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
            <span>Total Spent via Holder</span>
            <Receipt className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {formatINR(totalSpentViaHolder)}
          </div>
          <p className="text-xs text-slate-400">
            Across {expenses.filter((e) => e.paidById === holder.id).length} recorded house bills
          </p>
        </div>

        {/* Total Unresolved Arrears */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-red-200/80 dark:border-red-900/40 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
            <span>Total Arrear to Collect</span>
            <Clock className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400">
            {formatINR(totalUnresolvedArrears)}
          </div>
          <p className="text-xs text-red-500/80">
            {activeArrears.filter((s) => s.creditorId === holder.id).length} pending payments owed by mates
          </p>
        </div>

        {/* Current Month House Spend */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
            <span>This Month Spend</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {formatINR(currentMonthSpend)}
          </div>
          <p className="text-xs text-slate-400">
            Current calendar billing cycle
          </p>
        </div>

        {/* Rent Schedule (11th of Month) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
            <span>House Rent on 11th</span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {rentBill ? formatINR(rentBill.amount) : '₹30,000'}
          </div>
          <div className="text-xs font-medium text-amber-600 dark:text-amber-400">
            {rentStatus?.isWithinReminderWindow
              ? `🔔 Due in ${rentStatus.daysRemaining} days (Reminders Active)`
              : `Scheduled for ${rentStatus?.formattedDueDate || '11th of month'}`}
          </div>
        </div>
      </div>

      {/* Pending Incoming Claims Alert Banner (if mates clicked Pay to Mates) */}
      {pendingClaimsToHolder.length > 0 && (
        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
              {pendingClaimsToHolder.length}
            </div>
            <div>
              <div className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
                You have {pendingClaimsToHolder.length} incoming payment confirmation request{pendingClaimsToHolder.length > 1 ? 's' : ''}!
              </div>
              <p className="text-xs text-indigo-700 dark:text-indigo-300">
                Roommates transferred money via UPI and are awaiting your verification.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors"
          >
            Review &amp; Verify Now
          </button>
        </div>
      )}

      {/* 3 Days Before Rent — Automated WhatsApp Reminders Active */}
      {automatedReminders.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-indigo-500/15 border-2 border-amber-400/60 shadow-lg space-y-3 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-lg shadow-md shrink-0">
                ⏰
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Rent Due in 3 Days — Automated WhatsApp Reminders
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white uppercase tracking-wider">
                    Automated
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {automatedReminders.length} roommate{automatedReminders.length > 1 ? 's have' : ' has'} pending rent. Click below to notify them on WhatsApp automatically.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                automatedReminders.forEach((r, idx) => {
                  setTimeout(() => window.open(r.whatsappUrl, '_blank'), idx * 500);
                });
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 shrink-0"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Send WhatsApp to All ({automatedReminders.length})</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t border-amber-300/30">
            {automatedReminders.map((rem) => (
              <div
                key={`${rem.billId}_${rem.debtor.id}`}
                className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs shadow-sm"
              >
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{rem.debtor.name}</div>
                  <div className="text-[11px] text-slate-500">
                    {rem.billTitle} &bull; <strong className="text-red-500">{formatINR(rem.amount)}</strong>
                  </div>
                </div>
                <a
                  href={rem.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold hover:bg-emerald-100 transition-colors"
                >
                  <MessageCircle className="w-3 h-3 text-emerald-600" />
                  <span>WhatsApp</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center justify-between overflow-x-auto pb-px">
        <div className="flex items-center gap-2">
          {/* MATES TAB - AS REQUESTED */}
          <button
            type="button"
            onClick={() => setActiveTab('mates')}
            className={`inline-flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'mates'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Mates ({members.length})</span>
          </button>

          {/* ALL EXPENSES TAB - EDIT & DELETE AUTHORITY */}
          <button
            type="button"
            onClick={() => setActiveTab('expenses')}
            className={`inline-flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'expenses'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>All Expenses ({expenses.length})</span>
          </button>

          {/* ARREARS TAB */}
          <button
            type="button"
            onClick={() => setActiveTab('arrears')}
            className={`inline-flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'arrears'
                ? 'border-red-600 text-red-600 dark:text-red-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Arrears Bucket ({activeArrears.length})</span>
          </button>

          {/* COMPLETED TAB */}
          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`inline-flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'completed'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Completed Audit ({completedShares.length})</span>
          </button>

          {/* REQUESTS & CLAIMS TAB */}
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`inline-flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'requests'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>House Requests &amp; Claims</span>
            {(pendingClaimsToHolder.length > 0 || purchaseRequests.filter((r) => r.status === 'PENDING').length > 0) && (
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            )}
          </button>

          {/* WHO PAYS WHOM (SUMMARY) */}
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`inline-flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'matrix'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Who Pays Whom (Summary)</span>
          </button>

          {/* SECURITY & PASSCODE */}
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`inline-flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'security'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Security &amp; Passcode</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: MATES DIRECTORY ================= */}
      {activeTab === 'mates' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Flatmates Directory
              </h2>
              <p className="text-xs text-slate-500">
                Click &quot;Check&quot; on any roommate to open their itemized split modal, send WhatsApp reminders, or download their personal statement.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenAddMember}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Roommate</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {members.map((member) => {
              const memShares = shares.filter((s) => s.debtorId === member.id);
              const pendingSum = memShares
                .filter((s) => s.status === 'ARREAR' || s.status === 'CLAIMED_PAID')
                .reduce((sum, s) => sum + s.amount, 0);

              const settledSum = memShares
                .filter((s) => s.status === 'COMPLETED')
                .reduce((sum, s) => sum + s.amount, 0);

              return (
                <div
                  key={member.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 shadow-sm flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition-all space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-base shadow-sm ${
                          member.avatarBg || 'bg-slate-600'
                        }`}
                      >
                        {member.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 dark:text-white">
                            {member.name}
                          </h3>
                          {member.isHolder && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                              Holder
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-mono">
                          {member.upiId || 'No UPI ID set'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {member.phone}
                        </p>
                      </div>
                    </div>

                    {/* Rename/Edit Button for Holder */}
                    <button
                      type="button"
                      onClick={() => onOpenEditMember(member)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                      title="Edit roommate name, phone or UPI ID"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Balance Snippet */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <div className="text-[10px] font-semibold text-slate-400 uppercase">
                        Has to Give (Arrear)
                      </div>
                      <div
                        className={`text-sm font-bold ${
                          pendingSum > 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {formatINR(pendingSum)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold text-slate-400 uppercase">
                        Settled
                      </div>
                      <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {formatINR(settledSum)}
                      </div>
                    </div>
                  </div>

                  {/* THE "CHECK" BUTTON - POPUPS THE MODAL AS REQUESTED */}
                  <button
                    type="button"
                    onClick={() => onOpenCheckModal(member)}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all transform active:scale-95"
                    title={`Check ${member.name}'s items, send WhatsApp reminders, and export PDF`}
                  >
                    <span>Check {member.name}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB: ALL EXPENSES (EDIT & DELETE AUTHORITY) ================= */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>All Recorded House Expenses</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {filteredExpenses.length} Records
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                You can change everything: Click Edit on any expense to modify amounts, dates, split members, or delete records.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                  placeholder="Search expenses..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <select
                value={expenseCatFilter}
                onChange={(e) => setExpenseCatFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
              >
                <option value="all">All Categories</option>
                <option value="Groceries">Groceries</option>
                <option value="Utilities">Utilities</option>
                <option value="Rent">Rent</option>
                <option value="Appliance Rental">Appliance Rental</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Food & Dining">Food & Dining</option>
                <option value="Personal">Personal</option>
                <option value="Other">Other</option>
              </select>

              <button
                type="button"
                onClick={onOpenRecordExpense}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>New Expense</span>
              </button>
            </div>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              No expenses match your search or filter.
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Expense Title</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Paid By</th>
                      <th className="py-3 px-4">Split Mode</th>
                      <th className="py-3 px-4 text-right">Total Amount</th>
                      <th className="py-3 px-4 text-center">Manage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredExpenses.map((exp) => {
                      const payer = members.find((m) => m.id === exp.paidById)?.name || 'Holder';
                      const splitCount = exp.splitMemberIds?.length || 1;

                      return (
                        <tr
                          key={exp.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-4 text-slate-500 font-mono">
                            {new Date(exp.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {exp.title}
                            </div>
                            {exp.notes && (
                              <div className="text-[11px] text-slate-400 italic">
                                {exp.notes}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {exp.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                            {payer}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">
                            {exp.mode === 'solo' ? (
                              <span className="text-amber-600 font-semibold">Solo</span>
                            ) : (
                              <span>Split ({splitCount} mates)</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-sm text-slate-900 dark:text-white">
                            {formatINR(exp.totalAmount)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {onOpenEditExpense && (
                                <button
                                  type="button"
                                  onClick={() => onOpenEditExpense(exp)}
                                  className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors border border-indigo-200 dark:border-indigo-900"
                                  title="Edit Expense Details, Amount or Splits"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {onDeleteExpense && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Delete "${exp.title}"? This will also remove all split arrears.`)) {
                                      onDeleteExpense(exp.id);
                                    }
                                  }}
                                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg transition-colors border border-red-200 dark:border-red-900"
                                  title="Delete Expense"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: ARREARS BUCKET ================= */}
      {activeTab === 'arrears' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Active Debts &amp; Unsettled Arrears</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                  {filteredArrears.length} Pending
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                1-click transition: Click &quot;Settle / Mark Paid&quot; to immediately archive into Completed.
              </p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={arrearFilter}
                onChange={(e) => setArrearFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
              >
                <option value="all">Filter: All Pending Payments</option>
                <option value="owedToMe">To Receive (As Holder)</option>
                <option value="owedByMe">I Have to Give</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    By Member: {m.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
              >
                <option value="all">All Categories</option>
                <option value="Rent">Rent</option>
                <option value="Appliance Rental">Appliance Rental</option>
                <option value="Groceries">Groceries</option>
                <option value="Utilities">Utilities</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>
          </div>

          {filteredArrears.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Zero Unsettled Arrears!
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No pending payments matching your filter. Everyone is settled up.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Expense Title</th>
                      <th className="py-3 px-4">Who Has to Give &rarr; Who Receives</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4 text-right">Share Amount</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredArrears.map((share) => {
                      const debtor = members.find((m) => m.id === share.debtorId);
                      const creditor = members.find((m) => m.id === share.creditorId) || holder;

                      return (
                        <tr
                          key={share.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                            {share.expenseTitle}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-red-600 dark:text-red-400">
                              {debtor?.name}
                            </span>{' '}
                            <span className="text-slate-400">has to give to</span>{' '}
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {creditor.name}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {share.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">
                            {new Date(share.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-sm text-red-600 dark:text-red-400">
                            {formatINR(share.amount)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleQuickSettle(share.id)}
                              className="px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors"
                            >
                              Settle / Mark Paid
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: COMPLETED TAB ================= */}
      {activeTab === 'completed' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Completed &amp; Settled Archive</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {completedShares.length} Settled
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Audited ledger of all settled shares. Accidental settlements can be reverted with 1 click.
              </p>
            </div>
          </div>

          {completedShares.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No completed records yet.</p>
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Expense Title</th>
                      <th className="py-3 px-4">Paid By &amp; Received By</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Settled Date</th>
                      <th className="py-3 px-4 text-right">Settled Amount</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {completedShares.map((share) => {
                      const debtor = members.find((m) => m.id === share.debtorId);
                      const creditor = members.find((m) => m.id === share.creditorId) || holder;

                      return (
                        <tr
                          key={share.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors opacity-90"
                        >
                          <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                            {share.expenseTitle}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold">{debtor?.name}</span>{' '}
                            <span className="text-slate-400">&rarr;</span>{' '}
                            <span className="font-semibold text-emerald-600">
                              {creditor.name}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              {share.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">
                            {share.settledAt
                              ? new Date(share.settledAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : 'Settled'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-sm text-emerald-600 dark:text-emerald-400">
                            {formatINR(share.amount)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => onRevertShare(share.id)}
                              className="px-2.5 py-1 text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/60 rounded-lg border border-amber-200 dark:border-amber-800 transition-colors inline-flex items-center gap-1"
                              title="Mark back as Pending"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Mark as Pending (Undo)</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 4: REQUESTS & CLAIMS ================= */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Direct Payment Claims */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span>Incoming Payment Claims from Roommates</span>
              <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {pendingClaimsToHolder.length} Awaiting Verification
              </span>
            </h3>

            {pendingClaimsToHolder.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                No unverified payment claims right now.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pendingClaimsToHolder.map((claim) => {
                  const sender = members.find((m) => m.id === claim.fromMemberId);
                  return (
                    <div
                      key={claim.id}
                      className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs ${
                              sender?.avatarBg || 'bg-indigo-600'
                            }`}
                          >
                            {sender?.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              {sender?.name} reported paying:
                            </div>
                            <div className="text-xs text-slate-500">
                              {claim.note || 'Direct payment via UPI'}
                            </div>
                          </div>
                        </div>
                        <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                          {formatINR(claim.amount)}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-indigo-100 dark:border-indigo-900">
                        <button
                          type="button"
                          onClick={() => onRejectPaymentClaim(claim.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-white dark:bg-slate-900 hover:bg-red-50 rounded-lg border border-red-200"
                        >
                          Not Received
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onConfirmPaymentClaim(claim.id);
                          }}
                          className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                        >
                          Confirm Received ✓
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* House Purchase Requests (Wishlist) */}
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span>Flat Purchase Wishlist / Needs</span>
              <span className="text-xs font-normal text-slate-400">
                (Holder can 1-click convert into an expense split)
              </span>
            </h3>

            {purchaseRequests.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No purchase requests submitted yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {purchaseRequests.map((req) => {
                  const requester = members.find((m) => m.id === req.requestedById);
                  return (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {req.title}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Requested by {requester?.name} &bull; Est. cost: <strong>{formatINR(req.estimatedCost)}</strong>
                          </div>
                          {req.notes && (
                            <p className="text-xs text-slate-400 mt-1 italic">
                              &ldquo;{req.notes}&rdquo;
                            </p>
                          )}
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {req.status}
                        </span>
                      </div>

                      {req.status !== 'PURCHASED' && (
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                          <button
                            type="button"
                            onClick={() => onConvertRequestToExpense(req)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-transform active:scale-95"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>Buy &amp; Split to Everyone</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSubsetRequest(req);
                              setSubsetSelectedMemberIds(members.map((m) => m.id));
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>Buy &amp; Split to Selected Persons Only</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 5: WHO PAYS WHOM (SUMMARY) ================= */}
      {activeTab === 'matrix' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Who Pays Whom (Direct Balance Summary)
              </h2>
              <p className="text-xs text-slate-500">
                Crystal clear peer settlement records showing exactly who has to give money to whom.
              </p>
            </div>
          </div>

          {/* 1. Direct Debt Statements */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Direct Peer Obligations ({directDebts.length} active balances)
            </h3>
            {directDebts.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Everyone is completely settled up!
                </p>
                <p className="text-xs text-slate-500">
                  No roommate has any pending payments to make.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {directDebts.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50/20 dark:bg-red-950/10 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-xl">👉</div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          <span className="text-red-600 dark:text-red-400 font-extrabold">{item.fromMemberName}</span>{' '}
                          has to give to{' '}
                          <span className="text-slate-900 dark:text-white font-extrabold">{item.toMemberName}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Across {item.itemCount} pending split item{item.itemCount > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-lg font-black text-red-600 dark:text-red-400">
                      {formatINR(item.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Roommate Totals */}
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Roommate Balance Ledger
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {netBalances.map((item) => {
                const isPositive = item.netBalance > 0;
                const isNegative = item.netBalance < 0;

                return (
                  <div
                    key={item.memberId}
                    className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white text-base">
                        {item.memberName}
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          isPositive
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : isNegative
                            ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {isPositive
                          ? 'To Receive'
                          : isNegative
                          ? 'Has to Give'
                          : 'Settled'}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-2">
                      <div className="flex justify-between">
                        <span>Total to Receive:</span>
                        <span className="font-semibold text-emerald-600">
                          {formatINR(item.totalOwedToThem)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total to Give:</span>
                        <span className="font-semibold text-red-600">
                          {formatINR(item.totalTheyOwe)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-1 font-bold text-slate-900 dark:text-white">
                        <span>Net Position:</span>
                        <span
                          className={
                            isPositive
                              ? 'text-emerald-600'
                              : isNegative
                              ? 'text-red-600'
                              : 'text-slate-600'
                          }
                        >
                          {isPositive ? `+${formatINR(item.netBalance)}` : formatINR(item.netBalance)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 6: SECURITY & PASSCODE ================= */}
      {activeTab === 'security' && (
        <div className="space-y-6 max-w-xl">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-500" />
              <span>Holder Master Security &amp; Passcode</span>
            </h2>
            <p className="text-xs text-slate-500">
              Configure master access protection. The Holder portal automatically locks 10 seconds after leaving.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Change Master Holder Password
                </h3>
                <p className="text-xs text-slate-500">
                  Enter a new secret password for the Holder portal.
                </p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newPasscode.trim()) return;
                if (onUpdateHolderPasscode) {
                  onUpdateHolderPasscode(newPasscode.trim());
                  setPasscodeSuccess(true);
                  setNewPasscode('');
                  setTimeout(() => setPasscodeSuccess(false), 3000);
                }
              }}
              className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  New Password / PIN
                </label>
                <input
                  type="password"
                  value={newPasscode}
                  onChange={(e) => setNewPasscode(e.target.value)}
                  placeholder="Enter new master password"
                  className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {passcodeSuccess && (
                <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Password updated successfully!
                </p>
              )}

              <button
                type="submit"
                disabled={!newPasscode.trim()}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm transition-all"
              >
                Update Password
              </button>
            </form>
          </div>

          {/* Flatmate Credentials & Passwords Management (Holder Authority) */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Roommate Names &amp; Passwords
                  </h3>
                  <p className="text-xs text-slate-500">
                    Holder master authority: View and change any roommate&apos;s name and login password.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs ${m.avatarBg || 'bg-indigo-600'}`}>
                      {m.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{m.name}</span>
                        {m.isHolder && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                            Holder
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Password: <span className="font-bold text-indigo-500">{m.passcode || (m.isHolder ? holderPasscode || '1234' : '0000')}</span> &bull; {m.phone}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenEditMember(m)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 font-bold transition-colors"
                  >
                    Change Name / Password
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 space-y-1.5">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-indigo-500" />
              <span>10-Second Auto-Relock Security Policy</span>
            </div>
            <p>
              When you exit the Holder portal or switch to flatmate view, access remains unlocked for exactly 10 seconds.
              After 10 seconds of leaving the portal, you will be required to re-enter your password to ensure flatmate privacy and security.
            </p>
          </div>
        </div>
      )}

      {/* Subset Split Picker Modal for Purchase Requests */}
      {subsetRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Split &ldquo;{subsetRequest.title}&rdquo; Among Selected Roommates
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Total: <strong>{formatINR(subsetRequest.estimatedCost)}</strong> &bull; Requested by{' '}
                {members.find((m) => m.id === subsetRequest.requestedById)?.name}
              </p>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Select who shares this item:
              </div>
              {members.map((m) => {
                const isSelected = subsetSelectedMemberIds.includes(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSubsetSelectedMemberIds((prev) =>
                        prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                      );
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-950 dark:text-white'
                        : 'border-slate-200 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded flex items-center justify-center ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>
                        {isSelected ? '✓' : '○'}
                      </div>
                      <span className="text-xs font-semibold">{m.name}</span>
                    </div>
                    {isSelected && subsetSelectedMemberIds.length > 0 && (
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        ₹{(subsetRequest.estimatedCost / subsetSelectedMemberIds.length).toFixed(2)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSubsetRequest(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={subsetSelectedMemberIds.length === 0}
                onClick={() => {
                  onConvertRequestToExpense(subsetRequest, subsetSelectedMemberIds);
                  setSubsetRequest(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm"
              >
                Confirm Split ({subsetSelectedMemberIds.length} Mates)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
