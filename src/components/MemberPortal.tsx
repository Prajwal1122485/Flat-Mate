'use client';

import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  QrCode,
  FileDown,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Wallet,
  Sparkles,
  ShieldCheck,
  Plus,
  Trash2,
  Wifi,
  Phone,
  Copy,
  Check,
  Package,
  CheckSquare,
  Square,
  BookOpen,
} from 'lucide-react';
import {
  Member,
  Expense,
  ExpenseShare,
  PurchaseRequest,
  DirectPaymentClaim,
  PersonalExpense,
  PersonalExpenseCategory,
  PantryItem,
  PantryStatus,
  FlatChore,
  FlatContact,
  FlatNotice,
} from '@/types';
import { formatINR } from '@/lib/calculations';
import { generateMemberExpensePDF } from '@/lib/pdfGenerator';

interface MemberPortalProps {
  currentMember: Member;
  allMembers: Member[];
  expenses: Expense[];
  shares: ExpenseShare[];
  purchaseRequests: PurchaseRequest[];
  paymentClaims: DirectPaymentClaim[];
  personalExpenses: PersonalExpense[];
  pantryItems: PantryItem[];
  chores: FlatChore[];
  contacts: FlatContact[];
  notices: FlatNotice[];
  onOpenPayToMates: () => void;
  onOpenProfileModal: () => void;
  onOpenRequestItem: (prefillTitle?: string, prefillCost?: number) => void;
  onConfirmClaimReceived: (claimId: string) => void;
  onRejectClaim: (claimId: string) => void;
  onViewClaimDetail: (claim: DirectPaymentClaim) => void;
  onSavePersonalExpense: (exp: Omit<PersonalExpense, 'id' | 'createdAt'>) => void;
  onDeletePersonalExpense: (id: string) => void;
  onUpdatePantryStatus: (itemId: string, status: PantryStatus) => void;
  onAddPantryItem: (item: Omit<PantryItem, 'id' | 'updatedAt'>) => void;
  onToggleChoreStatus: (choreId: string) => void;
  onOpenHolderPortal?: () => void;
}

export default function MemberPortal({
  currentMember,
  allMembers,
  expenses,
  shares,
  purchaseRequests,
  paymentClaims,
  personalExpenses,
  pantryItems,
  chores,
  contacts,
  notices,
  onOpenPayToMates,
  onOpenProfileModal,
  onOpenRequestItem,
  onConfirmClaimReceived,
  onRejectClaim,
  onViewClaimDetail,
  onSavePersonalExpense,
  onDeletePersonalExpense,
  onUpdatePantryStatus,
  onAddPantryItem,
  onToggleChoreStatus,
  onOpenHolderPortal,
}: MemberPortalProps) {
  const [activeTab, setActiveTab] = useState<
    'myShares' | 'personalDiary' | 'pantry' | 'chores' | 'noticeboard' | 'incoming' | 'wishlist'
  >('myShares');

  // Modals inside MemberPortal
  const [showAddPersonalModal, setShowAddPersonalModal] = useState(false);
  const [newPersonalTitle, setNewPersonalTitle] = useState('');
  const [newPersonalAmount, setNewPersonalAmount] = useState('');
  const [newPersonalCategory, setNewPersonalCategory] = useState<PersonalExpenseCategory>('Food & Snacks');
  const [newPersonalDate, setNewPersonalDate] = useState(new Date().toISOString().slice(0, 10));
  const [newPersonalNotes, setNewPersonalNotes] = useState('');

  const [showAddPantryModal, setShowAddPantryModal] = useState(false);
  const [newPantryName, setNewPantryName] = useState('');
  const [newPantryCategory, setNewPantryCategory] = useState<'Groceries' | 'Cleaning' | 'Water & Gas' | 'Toiletries' | 'Other'>('Groceries');
  const [newPantryQty, setNewPantryQty] = useState('');

  const [copiedWifi, setCopiedWifi] = useState(false);

  const holder = allMembers.find((m) => m.isHolder) || allMembers[0];
  const memberMap = new Map(allMembers.map((m) => [m.id, m]));
  const expenseMap = new Map(expenses.map((e) => [e.id, e]));

  // 1. Personal shares of shared expenses
  const myShares = useMemo(() => {
    return shares.filter((s) => s.debtorId === currentMember.id);
  }, [shares, currentMember.id]);

  const myPendingArrears = useMemo(() => {
    return myShares.filter((s) => s.status === 'ARREAR' || s.status === 'CLAIMED_PAID');
  }, [myShares]);

  const mySettledShares = useMemo(() => {
    return myShares.filter((s) => s.status === 'COMPLETED');
  }, [myShares]);

  const totalOwed = useMemo(() => {
    return myPendingArrears.reduce((sum, s) => sum + s.amount, 0);
  }, [myPendingArrears]);

  const totalSettled = useMemo(() => {
    return mySettledShares.reduce((sum, s) => sum + s.amount, 0);
  }, [mySettledShares]);

  // Current month personal share of house spend
  const currentMonthSharedSpend = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    return myShares
      .filter((s) => {
        const dt = new Date(s.createdAt);
        return dt.getFullYear() === curYear && dt.getMonth() === curMonth;
      })
      .reduce((sum, s) => sum + s.amount, 0);
  }, [myShares]);

  // 2. Personal Private Diary Expenses (Isolated to this member)
  const myPersonalExpenses = useMemo(() => {
    return personalExpenses.filter((p) => p.memberId === currentMember.id);
  }, [personalExpenses, currentMember.id]);

  const currentMonthPrivateSpend = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    return myPersonalExpenses
      .filter((p) => {
        const dt = new Date(p.date || p.createdAt);
        return dt.getFullYear() === curYear && dt.getMonth() === curMonth;
      })
      .reduce((sum, p) => sum + p.amount, 0);
  }, [myPersonalExpenses]);

  // Combined Monthly Spend = Shared Flat Share + Private Personal Diary
  const totalCombinedMonthlySpend = currentMonthSharedSpend + currentMonthPrivateSpend;

  // Monthly Budget & Savings Advisor
  const monthlyBudget = currentMember.monthlyBudget || 9000;
  const budgetRemaining = Math.max(0, monthlyBudget - totalCombinedMonthlySpend);
  const budgetPercentageUsed = Math.min(
    100,
    Math.round((totalCombinedMonthlySpend / monthlyBudget) * 100)
  );

  // Incoming payment claims to currentMember
  const incomingClaims = useMemo(() => {
    return paymentClaims.filter((c) => c.toMemberId === currentMember.id);
  }, [paymentClaims, currentMember.id]);

  const pendingIncomingClaims = useMemo(() => {
    return incomingClaims.filter((c) => c.status === 'PENDING');
  }, [incomingClaims]);

  const handleDownloadPersonalPDF = () => {
    generateMemberExpensePDF(currentMember, myShares, expenses, allMembers);
  };

  const handleCreatePersonalExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonalTitle.trim() || !newPersonalAmount) return;

    onSavePersonalExpense({
      memberId: currentMember.id,
      title: newPersonalTitle.trim(),
      amount: parseFloat(newPersonalAmount),
      category: newPersonalCategory,
      date: newPersonalDate,
      notes: newPersonalNotes.trim() || undefined,
    });

    setNewPersonalTitle('');
    setNewPersonalAmount('');
    setNewPersonalNotes('');
    setShowAddPersonalModal(false);
  };

  const handleCreatePantryItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPantryName.trim()) return;

    onAddPantryItem({
      name: newPantryName.trim(),
      category: newPantryCategory,
      status: 'IN_STOCK',
      quantity: newPantryQty.trim() || undefined,
      updatedByMemberId: currentMember.id,
    });

    setNewPantryName('');
    setNewPantryQty('');
    setShowAddPantryModal(false);
  };

  const copyWifiPassword = () => {
    navigator.clipboard.writeText('FlatMates@2026!');
    setCopiedWifi(true);
    setTimeout(() => setCopiedWifi(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Personalized Greeting Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-indigo-900/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md ${
              currentMember.avatarBg || 'bg-indigo-600'
            }`}
          >
            {currentMember.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                Personal Portal
              </span>
              {currentMember.isHolder && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  👑 House Holder Mate
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
              {currentMember.name}&apos;s Dashboard
            </h1>
            <p className="text-xs text-slate-300">
              UPI: <code className="text-indigo-300 font-mono">{currentMember.upiId || 'Not set'}</code> &bull; Phone: {currentMember.phone}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {/* Holder Master Shortcut if Prajwal is logged in */}
          {currentMember.isHolder && onOpenHolderPortal && (
            <button
              type="button"
              onClick={onOpenHolderPortal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg transition-transform transform active:scale-95"
              title="Open House Master Ledger & Control Hub"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Holder Controls</span>
            </button>
          )}

          {/* Pay to Mates Button */}
          <button
            type="button"
            onClick={onOpenPayToMates}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all transform active:scale-95"
            title="Scan roommate QR codes or pay directly via UPI"
          >
            <QrCode className="w-4 h-4" />
            <span>Pay to Mates</span>
          </button>

          {/* Flat Wishlist Request */}
          <button
            type="button"
            onClick={() => onOpenRequestItem()}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors"
            title="Tell flatmates to buy a house grocery or appliance"
          >
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            <span>Request Item</span>
          </button>

          {/* Profile & Payment Setup */}
          <button
            type="button"
            onClick={onOpenProfileModal}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Upload your payment QR and edit UPI credentials"
          >
            <QrCode className="w-4 h-4" />
          </button>

          {/* Strictly Personal PDF Export */}
          <button
            type="button"
            onClick={handleDownloadPersonalPDF}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Download strictly your personal statement PDF"
          >
            <FileDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Incoming Verification Alert Banner (if someone paid this member) */}
      {pendingIncomingClaims.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
              {pendingIncomingClaims.length}
            </div>
            <div>
              <div className="text-sm font-bold text-amber-950 dark:text-amber-200">
                You received a payment claim of {formatINR(pendingIncomingClaims[0].amount)}!
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                A flatmate reported sending money to your UPI. Please verify in your bank app.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onViewClaimDetail(pendingIncomingClaims[0])}
            className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition-colors"
          >
            Review &amp; Confirm Received
          </button>
        </div>
      )}

      {/* Financial Health & Budgeting Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Arrears I Owe */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-red-200/80 dark:border-red-900/40 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
            <span>What I Owe (House Arrear)</span>
            <Clock className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400">
            {formatINR(totalOwed)}
          </div>
          <p className="text-xs text-red-500/80">
            {myPendingArrears.length} pending &bull; {formatINR(totalSettled)} settled all-time
          </p>
        </div>

        {/* Private Personal Diary Spend */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
            <span>Personal Private Diary</span>
            <BookOpen className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {formatINR(currentMonthPrivateSpend)}
          </div>
          <p className="text-xs text-slate-400">
            {myPersonalExpenses.length} private records (non-shared)
          </p>
        </div>

        {/* Total Combined Spend This Month */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
            <span>Total Month Spend</span>
            <Wallet className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {formatINR(totalCombinedMonthlySpend)}
          </div>
          <p className="text-xs text-slate-400">
            House ({formatINR(currentMonthSharedSpend)}) + Personal ({formatINR(currentMonthPrivateSpend)})
          </p>
        </div>

        {/* Monthly Budget & Savings Advisor */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
            <span>Budget &amp; Savings</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-600 dark:text-slate-300">
                {budgetPercentageUsed}% of ₹{monthlyBudget}
              </span>
              <span className="text-emerald-600 font-bold">
                ₹{budgetRemaining} left
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden mt-1">
              <div
                className={`h-full transition-all duration-500 ${
                  budgetPercentageUsed > 85 ? 'bg-red-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${budgetPercentageUsed}%` }}
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            {budgetPercentageUsed > 85
              ? 'Warning: Nearing your monthly limit. Minimize optional spends.'
              : 'On track to save money this month!'}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-1 overflow-x-auto pb-px">
        {/* 1. House Shares & Arrears */}
        <button
          type="button"
          onClick={() => setActiveTab('myShares')}
          className={`inline-flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'myShares'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>House Shares &amp; Arrears ({myShares.length})</span>
        </button>

        {/* 2. Personal Diary */}
        <button
          type="button"
          onClick={() => setActiveTab('personalDiary')}
          className={`inline-flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'personalDiary'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Personal Private Diary ({myPersonalExpenses.length})</span>
        </button>

        {/* 3. Pantry & Essentials */}
        <button
          type="button"
          onClick={() => setActiveTab('pantry')}
          className={`inline-flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'pantry'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Flat Pantry &amp; Staples ({pantryItems.length})</span>
          {pantryItems.some((i) => i.status !== 'IN_STOCK') && (
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          )}
        </button>

        {/* 4. Chore & Duty Roster */}
        <button
          type="button"
          onClick={() => setActiveTab('chores')}
          className={`inline-flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'chores'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Duty Roster &amp; Chores ({chores.length})</span>
        </button>

        {/* 5. Noticeboard & Contacts */}
        <button
          type="button"
          onClick={() => setActiveTab('noticeboard')}
          className={`inline-flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'noticeboard'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wifi className="w-4 h-4" />
          <span>Wi-Fi &amp; Flat Info</span>
        </button>

        {/* 6. Payments to Me */}
        <button
          type="button"
          onClick={() => setActiveTab('incoming')}
          className={`inline-flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'incoming'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Payments to Me ({incomingClaims.length})</span>
          {pendingIncomingClaims.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>

        {/* 7. House Wishlist */}
        <button
          type="button"
          onClick={() => setActiveTab('wishlist')}
          className={`inline-flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'wishlist'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Flat Wishlist ({purchaseRequests.length})</span>
        </button>
      </div>

      {/* ================= TAB 1: MY SHARES & ARREARS ================= */}
      {activeTab === 'myShares' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Itemized Shares for {currentMember.name}
              </h2>
              <p className="text-xs text-slate-500">
                Shared house expenses split for you. Click &quot;Pay to Mates&quot; to transfer and clear pending arrears.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadPersonalPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Download PDF Statement</span>
            </button>
          </div>

          {myShares.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No expense shares recorded for you yet.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {myShares.map((share) => {
                const parentExp = expenseMap.get(share.expenseId);
                const creditor = memberMap.get(share.creditorId) || holder;
                const isPaid = share.status === 'COMPLETED';

                return (
                  <div
                    key={share.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all gap-3 ${
                      isPaid
                        ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 opacity-80'
                        : 'border-red-200 dark:border-red-900/40 bg-red-50/20 dark:bg-red-950/10'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {share.expenseTitle}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {share.category}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                          }`}
                        >
                          {isPaid ? 'Settled ✓' : 'Arrear (Pending)'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                        <span>
                          {new Date(share.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <span>&bull;</span>
                        <span>Paid by: {creditor.name}</span>
                        {parentExp && (
                          <>
                            <span>&bull;</span>
                            <span>Total Bill: {formatINR(parentExp.totalAmount)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      <div className="text-left sm:text-right">
                        <div
                          className={`text-lg font-bold ${
                            isPaid ? 'text-slate-700 dark:text-slate-300' : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {formatINR(share.amount)}
                        </div>
                        <div className="text-[10px] text-slate-400">Your Share</div>
                      </div>

                      {!isPaid && (
                        <button
                          type="button"
                          onClick={onOpenPayToMates}
                          className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-transform active:scale-95"
                        >
                          Pay Now
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: PERSONAL PRIVATE EXPENSE DIARY ================= */}
      {activeTab === 'personalDiary' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Personal Private Expense Diary</span>
                <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-full">
                  Private to You
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Track personal expenses like snacks, metro recharge, gym, or Amazon orders. Not shared with the flat ledger.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddPersonalModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/20 transition-all transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Record Personal Spend</span>
            </button>
          </div>

          {/* Personal Spend Summary Banner */}
          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-indigo-900 dark:text-indigo-300">
                This Month&apos;s Private Spend: <strong className="text-base font-black text-indigo-700 dark:text-indigo-400">{formatINR(currentMonthPrivateSpend)}</strong>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Automatically factored into your monthly budget progress bar.
              </p>
            </div>
            <div className="text-xs font-medium text-slate-500">
              {myPersonalExpenses.length} total entries recorded
            </div>
          </div>

          {myPersonalExpenses.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
              <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Your personal diary is currently empty.
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Keep track of your individual day-to-day spending without mixing it into flatmate calculations.
              </p>
              <button
                type="button"
                onClick={() => setShowAddPersonalModal(true)}
                className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
              >
                + Add First Personal Expense
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {myPersonalExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {exp.title}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {exp.category}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span>{exp.date || new Date(exp.createdAt).toLocaleDateString()}</span>
                      {exp.notes && (
                        <>
                          <span>&bull;</span>
                          <span className="italic text-slate-400">{exp.notes}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-base font-black text-slate-900 dark:text-white">
                      {formatINR(exp.amount)}
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeletePersonalExpense(exp.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Delete personal entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: FLAT PANTRY & STAPLES ================= */}
      {activeTab === 'pantry' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Flat Pantry &amp; Staples Inventory</span>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-full">
                  Shared House
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Live inventory of water cans, cooking gas, spices, oil, and cleaning essentials.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddPantryModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Pantry Item</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {pantryItems.map((item) => {
              const isInStock = item.status === 'IN_STOCK';
              const isLow = item.status === 'RUNNING_LOW';
              const isOut = item.status === 'OUT_OF_STOCK';

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 shadow-sm flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {item.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          isInStock
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : isLow
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        }`}
                      >
                        {isInStock ? 'In Stock' : isLow ? 'Running Low' : 'Empty / Needed'}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      {item.name}
                    </h3>

                    {item.quantity && (
                      <p className="text-xs text-slate-500">
                        Level: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.quantity}</span>
                      </p>
                    )}
                  </div>

                  {/* Quick Status Buttons */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onUpdatePantryStatus(item.id, 'IN_STOCK')}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                          isInStock ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        In Stock
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdatePantryStatus(item.id, 'RUNNING_LOW')}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                          isLow ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        Low
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdatePantryStatus(item.id, 'OUT_OF_STOCK')}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                          isOut ? 'bg-red-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        Needed
                      </button>
                    </div>

                    {(isLow || isOut) && (
                      <button
                        type="button"
                        onClick={() => onOpenRequestItem(`Restock: ${item.name}`, 300)}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        <ShoppingBag className="w-3 h-3" />
                        <span>Request Restock</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 4: CHORE & DUTY ROSTER ================= */}
      {activeTab === 'chores' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Flat Duty Roster &amp; Chores</span>
              <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-full">
                Weekly Responsibility
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Clear accountability for cleaning, garbage disposal, and water can maintenance.
            </p>
          </div>

          <div className="space-y-3">
            {chores.map((chore) => {
              const assigned = memberMap.get(chore.assignedMemberId);
              const isMe = chore.assignedMemberId === currentMember.id;
              const isDone = chore.status === 'DONE';

              return (
                <div
                  key={chore.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all gap-3 ${
                    isMe
                      ? 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/20 dark:bg-indigo-950/10'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => onToggleChoreStatus(chore.id)}
                      className={`mt-0.5 p-1 rounded-lg transition-colors ${
                        isDone
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-400 hover:text-indigo-600'
                      }`}
                    >
                      {isDone ? (
                        <CheckSquare className="w-5 h-5 fill-emerald-100 dark:fill-emerald-950" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold ${isDone ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                          {chore.title}
                        </span>
                        {isMe && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-600 text-white">
                            Assigned to You
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                            isDone
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {isDone ? 'Completed ✓' : 'Pending'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                        <span>Assigned to: <strong>{assigned?.name || 'Unassigned'}</strong></span>
                        <span>&bull;</span>
                        <span>Frequency: {chore.frequency}</span>
                        <span>&bull;</span>
                        <span>Due: {chore.dueDay}</span>
                        {chore.lastCompletedAt && isDone && (
                          <>
                            <span>&bull;</span>
                            <span className="text-emerald-600 dark:text-emerald-400">
                              Done on {new Date(chore.lastCompletedAt).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleChoreStatus(chore.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
                      isDone
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white border-transparent shadow-sm'
                    }`}
                  >
                    {isDone ? 'Mark as Pending' : 'Mark Done ✓'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 5: NOTICEBOARD & ESSENTIAL CONTACTS ================= */}
      {activeTab === 'noticeboard' && (
        <div className="space-y-6">
          {/* Flat Wi-Fi Box */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white shadow-xl border border-indigo-700/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
                <Wifi className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                  Flat Wi-Fi Credentials
                </span>
                <h3 className="text-lg font-black text-white">
                  SSID: Flat304_HighSpeed_5G
                </h3>
                <p className="text-xs text-slate-300">
                  Password: <code className="bg-slate-800 px-2 py-0.5 rounded font-mono text-indigo-300">FlatMates@2026!</code>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={copyWifiPassword}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 transition-colors shadow-sm"
            >
              {copiedWifi ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Password Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-600" />
                  <span>Copy Password</span>
                </>
              )}
            </button>
          </div>

          {/* Essential House Contacts */}
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Essential House Contacts
              </h3>
              <p className="text-xs text-slate-500">
                Landlord, caretaker, plumber, electrician, and building security.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 shadow-sm flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      {contact.role}
                    </span>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      {contact.name}
                    </h4>
                    <p className="text-xs font-mono text-slate-600 dark:text-slate-300">
                      {contact.phone}
                    </p>
                    {contact.notes && (
                      <p className="text-[11px] text-slate-400 mt-1">
                        {contact.notes}
                      </p>
                    )}
                  </div>

                  <a
                    href={`tel:${contact.phone}`}
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-indigo-50 hover:text-indigo-600 transition-colors shrink-0"
                    title={`Call ${contact.name}`}
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Flat Rules / Guidelines */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Flat Noticeboard
            </h3>
            <div className="space-y-2.5">
              {notices.map((notice) => (
                <div
                  key={notice.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      {notice.title}
                    </h4>
                    {notice.isImportant && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                        Important
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {notice.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 6: INCOMING PAYMENTS ================= */}
      {activeTab === 'incoming' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Payment Claims Sent to You
            </h2>
            <p className="text-xs text-slate-500">
              When roommates transfer money to your UPI, their claims appear here for your confirmation.
            </p>
          </div>

          {incomingClaims.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <CreditCard className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No payment claims sent to you yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {incomingClaims.map((claim) => {
                const sender = memberMap.get(claim.fromMemberId);
                const isPending = claim.status === 'PENDING';

                return (
                  <div
                    key={claim.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all gap-3 ${
                      isPending
                        ? 'border-amber-300 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/10'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {sender?.name} reported paying {formatINR(claim.amount)}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            isPending
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : claim.status === 'CONFIRMED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          }`}
                        >
                          {claim.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Reported on {new Date(claim.createdAt).toLocaleDateString()} at{' '}
                        {new Date(claim.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isPending ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onConfirmClaimReceived(claim.id)}
                            className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-transform active:scale-95"
                          >
                            Confirm Received ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => onRejectClaim(claim.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {claim.status === 'CONFIRMED' ? 'Verified in Bank' : 'Rejected'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 7: FLAT WISHLIST & NEEDS ================= */}
      {activeTab === 'wishlist' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Flat Wishlist &amp; Needs</span>
                <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-full">
                  All Roommates
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Any roommate can request items for the house (e.g. water cans, detergent, spices, repairs).
              </p>
            </div>

            <button
              type="button"
              onClick={() => onOpenRequestItem()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition-all transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Request New Item</span>
            </button>
          </div>

          {purchaseRequests.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <ShoppingBag className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No house purchase requests currently active.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {purchaseRequests.map((req) => {
                const requester = memberMap.get(req.requestedById);
                const isPurchased = req.status === 'PURCHASED';

                return (
                  <div
                    key={req.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 shadow-sm flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Requested by {requester?.name || 'Flatmate'}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            isPurchased
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">
                        {req.title}
                      </h3>
                      {req.notes && (
                        <p className="text-xs text-slate-500 italic">
                          &quot;{req.notes}&quot;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">
                          Estimated Cost
                        </div>
                        <div className="text-base font-black text-slate-900 dark:text-white">
                          {formatINR(req.estimatedCost)}
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: ADD PERSONAL EXPENSE ================= */}
      {showAddPersonalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Add Private Personal Spend
                </h3>
                <p className="text-xs text-slate-500">
                  Visible strictly to you &bull; Not shared with roommates
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPersonalModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePersonalExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Description / Item
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Office Metro Card, Gym Protein, Coffee"
                  value={newPersonalTitle}
                  onChange={(e) => setNewPersonalTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={newPersonalAmount}
                    onChange={(e) => setNewPersonalAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newPersonalDate}
                    onChange={(e) => setNewPersonalDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Category
                </label>
                <select
                  value={newPersonalCategory}
                  onChange={(e) => setNewPersonalCategory(e.target.value as PersonalExpenseCategory)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Food & Snacks">Food &amp; Snacks</option>
                  <option value="Commute & Travel">Commute &amp; Travel</option>
                  <option value="Shopping & Personal">Shopping &amp; Personal</option>
                  <option value="Subscriptions & Bills">Subscriptions &amp; Bills</option>
                  <option value="Health & Fitness">Health &amp; Fitness</option>
                  <option value="Groceries (Personal)">Groceries (Personal)</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Optional notes or details"
                  value={newPersonalNotes}
                  onChange={(e) => setNewPersonalNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPersonalModal(false)}
                  className="py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm"
                >
                  Save to Diary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD PANTRY ITEM ================= */}
      {showAddPantryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Add Flat Pantry Item
                </h3>
                <p className="text-xs text-slate-500">
                  Shared house staple to track
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPantryModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePantryItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Item Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Water Cans, Cooking Oil, Salt, Sugar"
                  value={newPantryName}
                  onChange={(e) => setNewPantryName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Category
                </label>
                <select
                  value={newPantryCategory}
                  onChange={(e) => setNewPantryCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Groceries">Groceries</option>
                  <option value="Cleaning">Cleaning</option>
                  <option value="Water & Gas">Water &amp; Gas</option>
                  <option value="Toiletries">Toiletries</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Initial Quantity / Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2 cans, 5 kg packet"
                  value={newPantryQty}
                  onChange={(e) => setNewPantryQty(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPantryModal(false)}
                  className="py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm"
                >
                  Add to Pantry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
