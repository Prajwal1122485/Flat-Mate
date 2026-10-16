'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  PlusCircle,
  Trash2,
  Phone,
  Copy,
  Check,
  CheckSquare,
  Square,
  BookOpen,
  MessageCircle,
  Calendar,
  AlertCircle,
  ArrowUpDown,
  Search,
  Lock,
} from 'lucide-react';
import {
  Member,
  Expense,
  ExpenseShare,
  RecurringBill,
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
import QRCodeDisplay from './QRCodeDisplay';
import {
  formatINR,
  calculateMemberBillShare,
  getRecurringBillStatus,
  buildRentReminderText,
  generateWhatsAppLink,
  cleanPhoneNumber,
} from '@/lib/calculations';
import {
  generateMemberExpensePDF,
  generatePurchasedItemsPDF,
  generatePurchasedItemsCSV,
} from '@/lib/pdfGenerator';

interface MemberPortalProps {
  currentMember: Member;
  allMembers: Member[];
  expenses: Expense[];
  shares: ExpenseShare[];
  recurringBills: RecurringBill[];
  purchaseRequests: PurchaseRequest[];
  paymentClaims: DirectPaymentClaim[];
  personalExpenses: PersonalExpense[];
  pantryItems?: PantryItem[];
  chores: FlatChore[];
  contacts: FlatContact[];
  notices: FlatNotice[];
  onOpenPayToMates: () => void;
  onOpenRecordExpense?: () => void;
  onOpenProfileModal: () => void;
  onOpenRequestItem: (prefillTitle?: string, prefillCost?: number) => void;
  onConfirmClaimReceived: (claimId: string) => void;
  onRejectClaim: (claimId: string) => void;
  onViewClaimDetail: (claim: DirectPaymentClaim) => void;
  onSavePersonalExpense: (exp: Omit<PersonalExpense, 'id' | 'createdAt'>) => void;
  onDeletePersonalExpense: (id: string) => void;
  onUpdatePantryStatus?: (itemId: string, status: PantryStatus) => void;
  onAddPantryItem?: (item: Omit<PantryItem, 'id' | 'updatedAt'>) => void;
  onToggleChoreStatus: (choreId: string) => void;
  onAddChore?: (chore: Omit<FlatChore, 'id'>) => void;
  onDeleteChore?: (choreId: string) => void;
  onSettleShare?: (shareId: string) => void;
  onRevertShare?: (shareId: string) => void;
  onOpenHolderPortal?: () => void;
  onUpdateMember?: (updated: Member) => void;
  onSubmitPaymentClaim?: (claim: {
    fromMemberId: string;
    toMemberId: string;
    amount: number;
    note?: string;
    shareIds?: string[];
  }) => void;
  deepLinkPayAction?: { billId?: string; amount?: number } | null;
  onClearDeepLinkPayAction?: () => void;
  onSendExtensionRequest?: (data: {
    billId: string;
    billTitle: string;
    fromMemberId: string;
    days: number;
    reason: string;
    amount: number;
  }) => void;
}

export default function MemberPortal({
  currentMember,
  allMembers,
  expenses,
  shares,
  recurringBills,
  purchaseRequests,
  paymentClaims,
  personalExpenses,
  pantryItems = [],
  chores,
  contacts,
  notices,
  onOpenPayToMates,
  onOpenRecordExpense,
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
  onAddChore,
  onDeleteChore,
  onSettleShare,
  onRevertShare,
  onOpenHolderPortal,
  onUpdateMember,
  onSubmitPaymentClaim,
  deepLinkPayAction,
  onClearDeepLinkPayAction,
  onSendExtensionRequest,
}: MemberPortalProps) {
  // 10 Tabs matching exact user requirements
  const [activeTab, setActiveTab] = useState<
    | 'arrears'
    | 'settled'
    | 'rent'
    | 'mySplit'
    | 'personalSpend'
    | 'transactions'
    | 'chores'
    | 'flatInfo'
    | 'incoming'
    | 'wishlist'
  >('arrears');

  // Modals inside MemberPortal
  const [showAddPersonalModal, setShowAddPersonalModal] = useState(false);
  const [newPersonalTitle, setNewPersonalTitle] = useState('');
  const [newPersonalAmount, setNewPersonalAmount] = useState('');
  const [newPersonalCategory, setNewPersonalCategory] = useState<PersonalExpenseCategory>('Food & Snacks');
  const [newPersonalDate, setNewPersonalDate] = useState(new Date().toISOString().slice(0, 10));
  const [newPersonalNotes, setNewPersonalNotes] = useState('');

  // Helper to calculate chore due date automatically based on frequency
  const calculateChoreDueDate = (freq: FlatChore['frequency']): string => {
    const now = new Date();
    let daysToAdd = 1;
    if (freq === 'Daily') daysToAdd = 1;
    else if (freq === 'A day after') daysToAdd = 2;
    else if (freq === 'Weekly') daysToAdd = 7;
    else if (freq === 'Monthly') daysToAdd = 30;
    else return new Date().toISOString().slice(0, 10);

    const target = new Date(now.getTime() + daysToAdd * 86400000);
    return target.toISOString().slice(0, 10);
  };

  // Add Flat Duties & Room Tasks Modal
  const [showAddChoreModal, setShowAddChoreModal] = useState(false);
  const [newChoreTitle, setNewChoreTitle] = useState('');
  const [newChoreAssignedId, setNewChoreAssignedId] = useState(currentMember.id);
  const [newChoreFrequency, setNewChoreFrequency] = useState<FlatChore['frequency']>('Weekly');
  const [newChoreDueDate, setNewChoreDueDate] = useState<string>(() => calculateChoreDueDate('Weekly'));

  // Search filter for My Split
  const [splitSearchQuery, setSplitSearchQuery] = useState('');
  const [splitCategoryFilter, setSplitCategoryFilter] = useState('ALL');

  // Copied indicator for phone numbers
  const [copiedContactId, setCopiedContactId] = useState<string | null>(null);

  // Set Budget Modal (Dedicated Self-Contained Portal)
  const [showSetBudgetModal, setShowSetBudgetModal] = useState(false);
  const [budgetInputValue, setBudgetInputValue] = useState(
    currentMember.monthlyBudget ? currentMember.monthlyBudget.toString() : ''
  );

  // Rent Extension Request Modal (Self-Contained inside Rent)
  const [requestingExtensionBill, setRequestingExtensionBill] = useState<RecurringBill | null>(null);
  const [extensionDays, setExtensionDays] = useState<number>(3);
  const [extensionReason, setExtensionReason] = useState<string>('Salary credit delayed by a few days');
  const [extensionSuccessMsg, setExtensionSuccessMsg] = useState(false);

  // QR Code viewing modal inside Rent
  const [showHolderQrForRent, setShowHolderQrForRent] = useState(false);
  const [selectedQrBill, setSelectedQrBill] = useState<{
    bill: RecurringBill;
    shareAmount: number;
    breakdown: { title: string; amount: number }[];
  } | null>(null);

  // Automated UPI Payment Return & Tracking
  const [pendingUpiSession, setPendingUpiSession] = useState<{
    billId?: string;
    shareId?: string;
    billTitle: string;
    amount: number;
    fromMemberId: string;
    fromMemberName: string;
    toMemberId: string;
    toMemberName: string;
    toUpiId?: string;
    toPhone?: string;
    timestamp: number;
    breakdownStr?: string;
  } | null>(null);
  const [showUpiReturnConfirmModal, setShowUpiReturnConfirmModal] = useState(false);
  const [directPayModalBill, setDirectPayModalBill] = useState<RecurringBill | null>(null);
  const [paymentClaimToast, setPaymentClaimToast] = useState<string | null>(null);

  // Deep link routing effect
  useEffect(() => {
    if (deepLinkPayAction?.billId) {
      const b = recurringBills.find((bill) => bill.id === deepLinkPayAction.billId);
      if (b) {
        setActiveTab('rent');
        setDirectPayModalBill(b);
      }
    }
  }, [deepLinkPayAction, recurringBills]);

  // Handle initiating UPI payment to track when returning from GPay/PhonePe/Paytm
  const handleInitiateUpiPayment = (params: {
    billId?: string;
    shareId?: string;
    billTitle: string;
    amount: number;
    recipient: Member;
    breakdownStr?: string;
  }) => {
    const session = {
      billId: params.billId,
      shareId: params.shareId,
      billTitle: params.billTitle,
      amount: params.amount,
      fromMemberId: currentMember.id,
      fromMemberName: currentMember.name,
      toMemberId: params.recipient.id,
      toMemberName: params.recipient.name,
      toUpiId: params.recipient.upiId,
      toPhone: params.recipient.phone,
      timestamp: Date.now(),
      breakdownStr: params.breakdownStr,
    };
    try {
      localStorage.setItem('flatmate_pending_upi_session', JSON.stringify(session));
    } catch (e) {
      console.error('Storage error', e);
    }
    setPendingUpiSession(session);
  };

  // Automatic detection when roommate switches back to FlatMate after paying in UPI app
  useEffect(() => {
    const checkUpiReturn = () => {
      try {
        const stored = localStorage.getItem('flatmate_pending_upi_session');
        if (!stored) return;
        const session = JSON.parse(stored);
        if (
          session &&
          session.fromMemberId === currentMember.id &&
          Date.now() - session.timestamp < 15 * 60 * 1000
        ) {
          setPendingUpiSession(session);
          setShowUpiReturnConfirmModal(true);
        }
      } catch (err) {
        console.error('Error checking UPI return session', err);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkUpiReturn();
      }
    };

    window.addEventListener('focus', checkUpiReturn);
    document.addEventListener('visibilitychange', handleVisibility);
    checkUpiReturn();

    return () => {
      window.removeEventListener('focus', checkUpiReturn);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [currentMember.id]);

  // 1-Click Auto Confirm Paid upon return from online app
  const handleConfirmUpiPaid = () => {
    if (!pendingUpiSession) return;
    if (onSubmitPaymentClaim) {
      onSubmitPaymentClaim({
        fromMemberId: pendingUpiSession.fromMemberId,
        toMemberId: pendingUpiSession.toMemberId,
        amount: pendingUpiSession.amount,
        shareIds: pendingUpiSession.shareId ? [pendingUpiSession.shareId] : undefined,
        note: `Automated UPI payment for ${pendingUpiSession.billTitle} (${pendingUpiSession.breakdownStr || formatINR(pendingUpiSession.amount)})`,
      });
    }

    const waMsg = `Hi ${pendingUpiSession.toMemberName}! 👋\n\nI have just completed the payment of *${formatINR(pendingUpiSession.amount)}* for *${pendingUpiSession.billTitle}* via UPI.\n${pendingUpiSession.breakdownStr ? `📋 Breakdown: ${pendingUpiSession.breakdownStr}\n` : ''}✅ Direct Payment Claim has been recorded in Flat-Mate App. Please verify! Thank you 🙌`;
    const waUrl = generateWhatsAppLink(pendingUpiSession.toPhone || '', waMsg);

    try {
      localStorage.removeItem('flatmate_pending_upi_session');
    } catch (e) {}

    setShowUpiReturnConfirmModal(false);
    setDirectPayModalBill(null);
    setPendingUpiSession(null);
    if (onClearDeepLinkPayAction) onClearDeepLinkPayAction();

    setPaymentClaimToast(`Payment claim for ${formatINR(pendingUpiSession.amount)} submitted! Opening WhatsApp receipt...`);
    setTimeout(() => setPaymentClaimToast(null), 5000);

    if (typeof window !== 'undefined') {
      const win = window.open(waUrl, '_blank');
      if (!win || win.closed || typeof win.closed === 'undefined') {
        window.location.href = waUrl;
      }
    }
  };

  const handleDismissUpiReturn = () => {
    try {
      localStorage.removeItem('flatmate_pending_upi_session');
    } catch (e) {}
    setShowUpiReturnConfirmModal(false);
    setPendingUpiSession(null);
  };

  const holder = allMembers.find((m) => m.isHolder) || allMembers[0];
  const memberMap = useMemo(() => new Map(allMembers.map((m) => [m.id, m])), [allMembers]);
  const expenseMap = useMemo(() => new Map(expenses.map((e) => [e.id, e])), [expenses]);

  // Auto-transfer upcoming rent / bills into Arrear folder ONLY within 3 days before due date and AFTER WhatsApp reminder is sent
  const upcomingDueBillsForMe = useMemo(() => {
    if (currentMember.id === holder.id) return [];
    return recurringBills
      .map((bill) => {
        const status = getRecurringBillStatus(bill);
        const shareData = calculateMemberBillShare(bill, currentMember.id);
        return {
          bill,
          status,
          shareData,
        };
      })
      .filter((item) => {
        // Strictly 3 days or fewer before due date (0, 1, 2, or 3 days remaining)
        const isWithin3Days =
          item.status.daysRemaining >= 0 &&
          item.status.daysRemaining <= (item.bill.reminderDaysBefore || 3);
        // Occurs in Arrear folder ONLY after the reminder message has been dispatched
        const isReminderSent = !!item.bill.lastReminderSentAt;
        return isWithin3Days && isReminderSent && item.shareData.total > 0;
      });
  }, [recurringBills, currentMember.id, holder.id]);

  const upcomingBillsTotal = useMemo(() => {
    return upcomingDueBillsForMe.reduce((sum, item) => sum + item.shareData.total, 0);
  }, [upcomingDueBillsForMe]);

  // 1. Personal shares of shared expenses
  const myShares = useMemo(() => {
    return shares.filter((s) => s.debtorId === currentMember.id);
  }, [shares, currentMember.id]);

  // Helper to determine if a share is House Rent or recurring house bill
  const isRentShare = useCallback(
    (share: ExpenseShare) => {
      const category = (share.category || '').toLowerCase();
      const title = (share.expenseTitle || '').toLowerCase();
      const parentExp = expenseMap.get(share.expenseId);
      const parentCategory = (parentExp?.category || '').toLowerCase();
      const parentTitle = (parentExp?.title || '').toLowerCase();
      return (
        category === 'rent' ||
        parentCategory === 'rent' ||
        title.includes('rent') ||
        parentTitle.includes('rent')
      );
    },
    [expenseMap]
  );

  const myPendingArrears = useMemo(() => {
    return myShares.filter((s) => {
      if (s.status !== 'ARREAR' && s.status !== 'CLAIMED_PAID') return false;

      // STRICT USER RULE: Rent/recurring house expenses must NEVER appear immediately in Arrear folder!
      // They only transfer to the Arrear folder strictly 3 days or fewer before the due date AND after WhatsApp message is sent.
      if (isRentShare(s)) {
        const matchingBill = recurringBills.find(
          (b) =>
            b.category === 'Rent' ||
            b.title.toLowerCase().includes('rent') ||
            s.expenseTitle.toLowerCase().includes(b.title.toLowerCase())
        );
        if (!matchingBill) return false;
        const status = getRecurringBillStatus(matchingBill);
        const reminderDays = matchingBill.reminderDaysBefore || 3;
        const reminderSent = !!matchingBill.lastReminderSentAt;
        const isWithin3Days = status.daysRemaining >= 0 && status.daysRemaining <= reminderDays;

        if (!isWithin3Days || !reminderSent) {
          return false;
        }

        // If already represented in upcomingDueBillsForMe, don't duplicate
        if (upcomingDueBillsForMe.some((u) => u.bill.id === matchingBill.id)) {
          return false;
        }
      }

      return true;
    });
  }, [myShares, recurringBills, isRentShare, upcomingDueBillsForMe]);

  const mySettledShares = useMemo(() => {
    return myShares.filter((s) => s.status === 'COMPLETED');
  }, [myShares]);

  // Mate-to-mate debts strictly excluding house rent and house recurring bills
  const matePendingDebts = useMemo(() => {
    return myPendingArrears.filter((s) => !isRentShare(s));
  }, [myPendingArrears, isRentShare]);

  const mateSettledShares = useMemo(() => {
    return mySettledShares.filter((s) => !isRentShare(s));
  }, [mySettledShares, isRentShare]);

  const totalPendingToPay = useMemo(() => {
    return myPendingArrears.reduce((sum, s) => sum + s.amount, 0) + upcomingBillsTotal;
  }, [myPendingArrears, upcomingBillsTotal]);

  const totalSettled = useMemo(() => {
    return mySettledShares.reduce((sum, s) => sum + s.amount, 0);
  }, [mySettledShares]);

  // All-time personal share of house spend till now
  const totalSharedSpendTillNow = useMemo(() => {
    return myShares.reduce((sum, s) => sum + s.amount, 0);
  }, [myShares]);

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

  // All-time private diary spend till now
  const totalPrivateSpendTillNow = useMemo(() => {
    return myPersonalExpenses.reduce((sum, p) => sum + p.amount, 0);
  }, [myPersonalExpenses]);

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

  // Total Spend Till Now = All Shared House Shares + All Private Diary Records
  const totalSpendTillNow = totalSharedSpendTillNow + totalPrivateSpendTillNow;

  // Combined Monthly Spend = Shared Flat Share + Private Personal Diary (for monthly budget tracking)
  const totalCombinedMonthlySpend = currentMonthSharedSpend + currentMonthPrivateSpend;

  // Monthly Budget (optional, can be Nil / 0)
  const hasBudgetSet = !!currentMember.monthlyBudget && currentMember.monthlyBudget > 0;
  const monthlyBudget = currentMember.monthlyBudget || 0;
  const budgetRemaining = Math.max(0, monthlyBudget - totalCombinedMonthlySpend);
  const budgetPercentageUsed = hasBudgetSet
    ? Math.min(100, Math.round((totalCombinedMonthlySpend / monthlyBudget) * 100))
    : 0;

  // Incoming payment claims to currentMember
  const incomingClaims = useMemo(() => {
    return paymentClaims.filter((c) => c.toMemberId === currentMember.id);
  }, [paymentClaims, currentMember.id]);

  const pendingIncomingClaims = useMemo(() => {
    return incomingClaims.filter((c) => c.status === 'PENDING');
  }, [incomingClaims]);

  // Itemized My Split expenses: ONLY show expenses that have been paid/settled by the member
  const mySplitsList = useMemo(() => {
    return expenses
      .filter((exp) => exp.splitMemberIds.includes(currentMember.id))
      .filter((exp) => {
        // Exclude unpaid expenses: only include if paid by currentMember, completed share, or pre-collected settled
        const myShare = shares.find(
          (s) => s.expenseId === exp.id && s.debtorId === currentMember.id
        );
        const isPaid =
          exp.paidById === currentMember.id ||
          myShare?.status === 'COMPLETED' ||
          exp.isPreCollectedSettled;
        return !!isPaid;
      })
      .filter((exp) => {
        if (splitCategoryFilter !== 'ALL' && exp.category !== splitCategoryFilter) {
          return false;
        }
        if (splitSearchQuery.trim()) {
          const q = splitSearchQuery.toLowerCase();
          return (
            exp.title.toLowerCase().includes(q) ||
            exp.category.toLowerCase().includes(q) ||
            (exp.notes && exp.notes.toLowerCase().includes(q))
          );
        }
        return true;
      });
  }, [expenses, shares, currentMember.id, splitSearchQuery, splitCategoryFilter]);

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

  const handleCreateChore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChoreTitle.trim()) return;

    if (onAddChore) {
      onAddChore({
        title: newChoreTitle.trim(),
        assignedMemberId: newChoreAssignedId,
        frequency: newChoreFrequency,
        dueDate: newChoreDueDate,
        dueDay: new Date(newChoreDueDate).toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
        status: 'PENDING',
      });
    }

    setNewChoreTitle('');
    setShowAddChoreModal(false);
  };

  const copyPhone = (phone: string, id: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedContactId(id);
    setTimeout(() => setCopiedContactId(null), 2000);
  };

  // Helper to trigger direct WhatsApp message for payment reminder or confirmation
  const handleAskByMessage = (
    phone: string,
    targetName: string,
    expenseTitle: string,
    amount: number,
    mode: 'paying' | 'asking'
  ) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    let text = '';
    if (mode === 'paying') {
      text = `Hi ${targetName}, I have made the payment of ₹${amount} for flat expense "${expenseTitle}". Please check and confirm in our FlatMate Register!`;
    } else {
      text = `Hi ${targetName}, gentle reminder for flat expense "${expenseTitle}". Your pending share is ₹${amount}. You can pay to my UPI: ${currentMember.upiId || 'via flat app'}. Thank you!`;
    }
    const url = `https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
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
                  Holder
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
              {currentMember.name}
            </h1>
            <p className="text-xs text-slate-300">
              UPI: <code className="text-indigo-300 font-mono">{currentMember.upiId || 'Not set'}</code> &bull; Phone: {currentMember.phone}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {/* Holder Shortcut if Holder is logged in */}
          {currentMember.isHolder && onOpenHolderPortal && (
            <button
              type="button"
              onClick={onOpenHolderPortal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg transition-transform transform active:scale-95"
              title="Open Holder Portal"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Holder</span>
            </button>
          )}

          {/* Record New Expense Button (1-to-1, 1-to-all, or selected) */}
          {onOpenRecordExpense && (
            <button
              type="button"
              onClick={onOpenRecordExpense}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition-all transform active:scale-95"
              title="Record an expense you paid and split with roommates (1-to-1, 1-to-all, or selected)"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Record New Expense</span>
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

          {/* Dedicated Set My Monthly Budget Button */}
          <button
            type="button"
            onClick={() => {
              setBudgetInputValue(currentMember.monthlyBudget ? currentMember.monthlyBudget.toString() : '');
              setShowSetBudgetModal(true);
            }}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-400/40 transition-colors shadow-sm"
            title="Configure your personal monthly budget & savings goal"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Set My Budget</span>
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

          {/* Download Personal Statement PDF */}
          <button
            type="button"
            onClick={handleDownloadPersonalPDF}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Download strictly your personal statement PDF"
          >
            <FileDown className="w-4 h-4" />
          </button>

          {/* Download All Bought Items Register (Separate PDF & CSV) */}
          <button
            type="button"
            onClick={() => generatePurchasedItemsPDF(expenses, allMembers)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors text-xs font-semibold"
            title="Download complete register of all items bought for the flat as PDF"
          >
            <FileDown className="w-3.5 h-3.5 text-indigo-400" />
            <span>Bought Items</span>
          </button>

          <button
            type="button"
            onClick={() => generatePurchasedItemsCSV(expenses, allMembers)}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition-colors text-xs font-bold"
            title="Export all bought items to CSV / Excel spreadsheet"
          >
            CSV
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
        {/* Pending to Give (House Arrears) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-red-200/80 dark:border-red-900/40 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
            <span>Pending to Give</span>
            <Clock className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400">
            {formatINR(totalPendingToPay)}
          </div>
          <p className="text-xs text-red-500/80">
            {myPendingArrears.length} unsettled &bull; {formatINR(totalSettled)} completed all-time
          </p>
        </div>

        {/* Private Personal Diary Spend */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
            <span>Personal Spend (Diary)</span>
            <BookOpen className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {formatINR(totalPrivateSpendTillNow)}
          </div>
          <p className="text-xs text-slate-400">
            {myPersonalExpenses.length} private records (all-time)
          </p>
        </div>

        {/* Total Spend Till Now */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
            <span>Total Spend Till Now</span>
            <Wallet className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {formatINR(totalSpendTillNow)}
          </div>
          <p className="text-xs text-slate-400">
            House ({formatINR(totalSharedSpendTillNow)}) + Personal ({formatINR(totalPrivateSpendTillNow)})
          </p>
        </div>

        {/* Monthly Budget & Savings Advisor (Optional, Nil by default) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
            <span>Monthly Budget</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>

          {hasBudgetSet ? (
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
              <p className="text-[11px] text-slate-400 mt-1">
                {budgetPercentageUsed > 85
                  ? 'Warning: Nearing monthly budget.'
                  : 'On track to save this month!'}
              </p>
            </div>
          ) : (
            <div>
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Nil / Not Set
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                No monthly spending limit configured. Click below to set a goal.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setBudgetInputValue(currentMember.monthlyBudget ? currentMember.monthlyBudget.toString() : '');
              setShowSetBudgetModal(true);
            }}
            className="w-full mt-2 py-1.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{hasBudgetSet ? 'Change Monthly Budget' : 'Set My Monthly Budget'}</span>
          </button>
        </div>
      </div>

      {/* ================= EXACT 10 NAVIGATION TABS ================= */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-1 overflow-x-auto pb-px">
        {/* 1. Arrear */}
        <button
          type="button"
          onClick={() => setActiveTab('arrears')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'arrears'
              ? 'border-red-600 text-red-600 dark:text-red-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4 text-red-500" />
          <span>Arrear ({myPendingArrears.length})</span>
        </button>

        {/* 2. Settled/Completed */}
        <button
          type="button"
          onClick={() => setActiveTab('settled')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'settled'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>Settled / Completed ({mySettledShares.length})</span>
        </button>

        {/* 3. Rent or Expence */}
        <button
          type="button"
          onClick={() => setActiveTab('rent')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'rent'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4 text-indigo-500" />
          <span>Rent or Expense</span>
        </button>

        {/* 4. My Split */}
        <button
          type="button"
          onClick={() => setActiveTab('mySplit')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'mySplit'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Wallet className="w-4 h-4 text-indigo-500" />
          <span>My Split ({mySplitsList.length})</span>
        </button>

        {/* 5. Personal Spend */}
        <button
          type="button"
          onClick={() => setActiveTab('personalSpend')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'personalSpend'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4 text-indigo-500" />
          <span>Personal Spend ({myPersonalExpenses.length})</span>
        </button>

        {/* 6. Mate Ledger (Excludes House Rent) */}
        <button
          type="button"
          onClick={() => setActiveTab('transactions')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'transactions'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ArrowUpDown className="w-4 h-4 text-indigo-500" />
          <span>Mate Ledger</span>
        </button>

        {/* 7. Flat Duties & Tasks */}
        <button
          type="button"
          onClick={() => setActiveTab('chores')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'chores'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <CheckSquare className="w-4 h-4 text-indigo-500" />
          <span>Flat Duties &amp; Tasks ({chores.length})</span>
        </button>

        {/* 8. Flat info (No Wi-Fi) */}
        <button
          type="button"
          onClick={() => setActiveTab('flatInfo')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'flatInfo'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Phone className="w-4 h-4 text-indigo-500" />
          <span>Flat Info</span>
        </button>

        {/* 9. Payments to me */}
        <button
          type="button"
          onClick={() => setActiveTab('incoming')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'incoming'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4 text-indigo-500" />
          <span>Payments to Me ({incomingClaims.length})</span>
          {pendingIncomingClaims.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>

        {/* 10. Wishlist */}
        <button
          type="button"
          onClick={() => setActiveTab('wishlist')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'wishlist'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ShoppingBag className="w-4 h-4 text-amber-500" />
          <span>Wishlist ({purchaseRequests.length})</span>
        </button>
      </div>

      {/* ================= TAB 1: ARREAR (WHOM I HAVE TO GIVE) ================= */}
      {activeTab === 'arrears' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                <span>Arrear (To Whom I Have to Give)</span>
                <span className="px-2.5 py-0.5 text-xs font-black bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 rounded-full">
                  Total: {formatINR(totalPendingToPay + upcomingBillsTotal)}
                </span>
                {upcomingBillsTotal > 0 && (
                  <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                    (includes {formatINR(upcomingBillsTotal)} 3-day upcoming rent)
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500">
                All house expenses &amp; 3-day upcoming rents transferred here to remind you. Pay directly via UPI or QR code.
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenPayToMates}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition-all active:scale-95"
            >
              <QrCode className="w-4 h-4" />
              <span>Pay to Mates via QR / UPI</span>
            </button>
          </div>

          {/* AUTO-TRANSFERRED UPCOMING 3-DAY RENT & EXPENSES REMINDER SECTION */}
          {upcomingDueBillsForMe.length > 0 && (
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-500/15 via-red-500/10 to-indigo-500/15 border-2 border-amber-500/50 shadow-lg space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-base shadow-sm shrink-0">
                    ⏰
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-amber-950 dark:text-amber-100 uppercase tracking-wide flex items-center gap-2">
                      <span>Transferred to Arrear: Upcoming Due in 3 Days</span>
                      <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-amber-500 text-slate-950">
                        {upcomingDueBillsForMe.length} Bill{upcomingDueBillsForMe.length > 1 ? 's' : ''}
                      </span>
                    </h3>
                    <p className="text-xs text-amber-900/80 dark:text-amber-300/80">
                      High-priority notice transferred directly to your Arrear folder to remind you before the due date.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {upcomingDueBillsForMe.map(({ bill, status, shareData }) => {
                  const formulaStr =
                    shareData.breakdown.length > 1
                      ? `(${shareData.breakdown.map((i) => formatINR(i.amount)).join(' + ')})`
                      : formatINR(shareData.total);

                  return (
                    <div
                      key={bill.id}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-amber-400/90 dark:border-amber-600 shadow-md space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                              {status.daysRemaining === 0
                                ? '🚨 DUE TODAY!'
                                : `⏰ Due in ${status.daysRemaining} day(s) • ${status.formattedDueDate}`}
                            </span>
                            <h4 className="text-base font-black text-slate-900 dark:text-white mt-1">
                              {bill.title}
                            </h4>
                            <p className="text-[11px] text-slate-500">
                              Payable to Holder: <strong>{holder.name}</strong> ({holder.upiId || 'via QR code'})
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
                              {formatINR(shareData.total)}
                            </div>
                            <div className="text-[10px] text-slate-400">Total to Pay</div>
                          </div>
                        </div>

                        {/* Exact Mathematical Formula & Itemized Breakdown */}
                        <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-slate-800/80 border border-amber-200/60 dark:border-amber-900/40 space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-[10px] uppercase text-slate-500 tracking-wider">Formula:</span>
                            <span className="font-mono text-indigo-600 dark:text-indigo-400 font-black text-sm">
                              {formulaStr}
                            </span>
                          </div>
                          <div className="pt-1.5 border-t border-amber-200/50 dark:border-slate-700 space-y-1">
                            {shareData.breakdown.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <span className="text-slate-600 dark:text-slate-400 font-medium">• {item.title}:</span>
                                <span className="font-bold text-slate-900 dark:text-white font-mono">{formatINR(item.amount)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="pt-1.5 border-t border-amber-200/60 dark:border-slate-700 flex items-center justify-between text-xs font-black">
                            <span className="text-slate-700 dark:text-slate-300">Total Calculated Amount:</span>
                            <span className="text-amber-700 dark:text-amber-300 font-mono font-extrabold text-sm">{formatINR(shareData.total)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Pay Options at the End */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                        <a
                          href={
                            holder.upiId
                              ? `upi://pay?pa=${holder.upiId}&pn=${encodeURIComponent(holder.name)}&am=${Math.round(shareData.total)}&cu=INR&tn=${encodeURIComponent(bill.title)}`
                              : undefined
                          }
                          onClick={(e) => {
                            if (!holder.upiId) {
                              e.preventDefault();
                              alert('Holder UPI not configured. Please use QR code or ask Holder.');
                              return;
                            }
                            handleInitiateUpiPayment({
                              billId: bill.id,
                              billTitle: bill.title,
                              amount: shareData.total,
                              recipient: holder,
                              breakdownStr: formulaStr,
                            });
                          }}
                          className="flex items-center justify-center gap-1 py-2 px-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-sm text-center active:scale-95 transition-transform"
                        >
                          <span>⚡ Pay UPI</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedQrBill({
                              bill,
                              shareAmount: shareData.total,
                              breakdown: shareData.breakdown,
                            });
                            setShowHolderQrForRent(true);
                          }}
                          className="flex items-center justify-center gap-1 py-2 px-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Show QR</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRequestingExtensionBill(bill)}
                          className="flex items-center justify-center gap-1 py-2 px-2.5 text-xs font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-300 hover:bg-amber-100 rounded-xl transition-colors col-span-2 sm:col-span-1"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Ask Time</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {myPendingArrears.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                All clear! You have no pending arrears to pay.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Any future shared rent, washing machine, or grocery shares will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myPendingArrears.map((share) => {
                const creditor = memberMap.get(share.creditorId) || holder;
                const parentExp = expenseMap.get(share.expenseId);
                const isClaimed = share.status === 'CLAIMED_PAID';

                return (
                  <div
                    key={share.id}
                    className="p-4 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/20 dark:bg-red-950/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 dark:text-white text-base">
                          {share.expenseTitle}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {share.category}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                          {isClaimed ? 'Payment Verification Pending' : 'Pending to Give'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                        👉 You have to give <strong className="text-red-600 dark:text-red-400 font-bold">{formatINR(share.amount)}</strong> to <strong>{creditor.name}</strong>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                        <span>Created: {new Date(share.createdAt).toLocaleDateString()}</span>
                        <span>&bull;</span>
                        <span>Creditor UPI: <code className="font-mono text-indigo-400">{creditor.upiId || 'Not set'}</code></span>
                        {parentExp && (
                          <>
                            <span>&bull;</span>
                            <span>Total Bill: {formatINR(parentExp.totalAmount)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {/* Ask / Notify on WhatsApp */}
                      <button
                        type="button"
                        onClick={() =>
                          handleAskByMessage(
                            creditor.phone,
                            creditor.name,
                            share.expenseTitle,
                            share.amount,
                            'paying'
                          )
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-xl hover:bg-emerald-100 transition-colors"
                        title="Send WhatsApp message to recipient"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Send Message</span>
                      </button>

                      {/* Pay via UPI */}
                      <a
                        href={
                          creditor.upiId
                            ? `upi://pay?pa=${creditor.upiId}&pn=${encodeURIComponent(creditor.name)}&am=${share.amount}&cu=INR&tn=${encodeURIComponent(share.expenseTitle)}`
                            : undefined
                        }
                        onClick={(e) => {
                          if (!creditor.upiId) {
                            e.preventDefault();
                            alert(`${creditor.name} has not set a UPI ID yet.`);
                            return;
                          }
                          handleInitiateUpiPayment({
                            shareId: share.id,
                            billTitle: share.expenseTitle,
                            amount: share.amount,
                            recipient: creditor,
                          });
                        }}
                        className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-sm transition-transform active:scale-95"
                      >
                        Pay via UPI
                      </a>

                      {/* Settle */}
                      {onSettleShare && (
                        <button
                          type="button"
                          onClick={() => onSettleShare(share.id)}
                          className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
                        >
                          Mark Paid
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

      {/* ================= TAB 2: SETTLED / COMPLETED ================= */}
      {activeTab === 'settled' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Settled / Completed Shares
              </h2>
              <p className="text-xs text-slate-500">
                Archive of all shares you have fully cleared. Tap &quot;Mark as Pending (Undo)&quot; if marked by mistake.
              </p>
            </div>
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              Total Cleared: {formatINR(totalSettled)}
            </div>
          </div>

          {mySettledShares.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No settled shares yet.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {mySettledShares.map((share) => {
                const creditor = memberMap.get(share.creditorId) || holder;

                return (
                  <div
                    key={share.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 transition-all gap-3 opacity-90"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {share.expenseTitle}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {share.category}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Settled ✓
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                        <span>Paid to: <strong>{creditor.name}</strong></span>
                        <span>&bull;</span>
                        <span>Settled: {share.settledAt ? new Date(share.settledAt).toLocaleDateString() : 'Confirmed'}</span>
                        {share.paymentNote && (
                          <>
                            <span>&bull;</span>
                            <span className="italic text-slate-400">{share.paymentNote}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="text-right">
                        <div className="text-base font-bold text-slate-800 dark:text-slate-200">
                          {formatINR(share.amount)}
                        </div>
                        <div className="text-[10px] text-slate-400">Completed</div>
                      </div>

                      {onRevertShare && (
                        share.creditorId === holder.id && !currentMember.isHolder ? (
                          <div
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-semibold"
                            title="This payment was received by the House Holder and cannot be reverted by roommates"
                          >
                            <Lock className="w-3.5 h-3.5 text-amber-500" />
                            <span>Holder Verified</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onRevertShare(share.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors"
                            title="Undo settlement and return to Arrears"
                          >
                            Mark as Pending (Undo)
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: RENT OR EXPENCE ================= */}
      {activeTab === 'rent' && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Rent &amp; House Fixed Expenses
            </h2>
            <p className="text-xs text-slate-500">
              Schedule for Flat Rent (11th of month) and Washing Machine / Appliances (15th of month) with deposit logistics.
            </p>
          </div>

          {/* Automated 3-Day Rent Due Alert Banner */}
          {(() => {
            const today = new Date().getDate();
            const rentDueSoon = today >= 8 && today <= 11;
            const applianceDueSoon = today >= 12 && today <= 15;
            if (!rentDueSoon && !applianceDueSoon) return null;
            const dueDaysLeft = rentDueSoon ? 11 - today : 15 - today;
            const targetBillTitle = rentDueSoon ? 'House Rent (Due 11th)' : 'Washing Machine Rent (Due 15th)';

            return (
              <div className="p-4 rounded-3xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-lg shrink-0">
                    ⏰
                  </div>
                  <div>
                    <div className="text-sm font-black text-amber-950 dark:text-amber-100">
                      Automated 3-Day Notice: {targetBillTitle} is due {dueDaysLeft === 0 ? 'Today!' : `in ${dueDaysLeft} day(s)`}!
                    </div>
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      Please clear your share with {holder.name} or request extra time below to keep house books balanced.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRequestingExtensionBill({
                      id: rentDueSoon ? 'rec_rent' : 'rec_appliances',
                      title: rentDueSoon ? 'House Rent' : 'Washing Machine & Appliances',
                      amount: rentDueSoon ? 12000 : 500,
                      dueDay: rentDueSoon ? 11 : 15,
                      category: rentDueSoon ? 'Rent' : 'Appliance Rental',
                      splitMemberIds: allMembers.map((m) => m.id),
                      reminderDaysBefore: 3,
                      payerId: holder.id,
                    });
                  }}
                  className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl shadow-sm transition-transform active:scale-95 whitespace-nowrap"
                >
                  Request Time Extension
                </button>
              </div>
            );
          })()}

          {extensionSuccessMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Extension request sent to Holder {holder.name} via WhatsApp successfully!</span>
            </div>
          )}

          {recurringBills.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No recurring rents or bills scheduled yet.
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                When Holder {holder.name} configures house rent or appliance rental bills, they will appear here with automated reminders and UPI payment options.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recurringBills.map((bill) => {
                const shareData = calculateMemberBillShare(bill, currentMember.id);
                const status = getRecurringBillStatus(bill);
                const isParticipating =
                  shareData.total > 0 ||
                  (bill.splitMemberIds && bill.splitMemberIds.includes(currentMember.id));
                const formulaStr =
                  shareData.breakdown.length > 1
                    ? `(${shareData.breakdown.map((i) => formatINR(i.amount)).join(' + ')})`
                    : formatINR(shareData.total);

                return (
                  <div
                    key={bill.id}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-800 shadow-md space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                              Due Every {bill.dueDay}th of Month
                            </span>
                            {status.isWithinReminderWindow && (
                              <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse">
                                {status.daysRemaining === 0 ? 'DUE TODAY' : `Due in ${status.daysRemaining}d`}
                              </span>
                            )}
                          </div>
                          <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                            {bill.title}
                          </h3>
                          <p className="text-xs text-slate-500">
                            Category: {bill.category} &bull; Holder: {holder.name}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                            {formatINR(bill.amount)}
                          </div>
                          <div className="text-[10px] text-slate-400">Total Base Monthly Bill</div>
                        </div>
                      </div>

                      {bill.notes && (
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 italic">
                          {bill.notes}
                        </div>
                      )}

                      {/* Formula & Itemized Line-Items Breakdown (Ex: 2000 + 3000, Rent - 2000, Deposite - 3000) */}
                      {isParticipating ? (
                        <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-slate-800/90 border border-indigo-200 dark:border-indigo-900/60 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                            <span className="text-[10px] uppercase text-slate-500 tracking-wider">Formula:</span>
                            <span className="font-mono text-indigo-600 dark:text-indigo-400 font-black text-sm">
                              {formulaStr}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-indigo-200/50 dark:border-slate-700 space-y-1">
                            {shareData.breakdown.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <span className="text-slate-700 dark:text-slate-300 font-medium">
                                  • {item.title}
                                </span>
                                <span className="font-bold font-mono text-slate-900 dark:text-white">
                                  {formatINR(item.amount)}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="pt-2 border-t border-indigo-200/60 dark:border-slate-700 flex items-center justify-between text-xs font-black">
                            <span className="text-slate-700 dark:text-slate-300">Total Calculated Amount:</span>
                            <span className="text-indigo-600 dark:text-indigo-400 text-base font-extrabold font-mono">
                              {formatINR(shareData.total)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-400 italic">
                          You are not included in this bill split (₹0.00).
                        </div>
                      )}
                    </div>

                    {/* Pay Options at the End */}
                    {isParticipating && (
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <a
                            href={
                              holder.upiId
                                ? `upi://pay?pa=${holder.upiId}&pn=${encodeURIComponent(holder.name)}&am=${Math.round(shareData.total)}&cu=INR&tn=${encodeURIComponent(bill.title)}`
                                : undefined
                            }
                            onClick={(e) => {
                              if (!holder.upiId) {
                                e.preventDefault();
                                alert('Holder has not configured a UPI ID yet. Please check with Holder or view QR.');
                                return;
                              }
                              handleInitiateUpiPayment({
                                billId: bill.id,
                                billTitle: bill.title,
                                amount: shareData.total,
                                recipient: holder,
                                breakdownStr: formulaStr,
                              });
                            }}
                            className="flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-sm transition-transform active:scale-95 text-center"
                          >
                            <span>⚡ Pay UPI ({formatINR(shareData.total)})</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedQrBill({
                                bill,
                                shareAmount: shareData.total,
                                breakdown: shareData.breakdown,
                              });
                              setShowHolderQrForRent(true);
                            }}
                            className="flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Show QR</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setRequestingExtensionBill(bill)}
                            className="flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-300 hover:bg-amber-100 rounded-xl transition-colors"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Ask Time</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 4: MY SPLIT (ALL THINGS SPLITTED INCLUDING ME) ================= */}
      {activeTab === 'mySplit' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                My Split (All Things Split Including You)
              </h2>
              <p className="text-xs text-slate-500">
                Every grocery bill, utility, and house expense that you are participating in.
              </p>
            </div>

            {/* Filter & Search */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search splits..."
                  value={splitSearchQuery}
                  onChange={(e) => setSplitSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={splitCategoryFilter}
                onChange={(e) => setSplitCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="Groceries">Groceries</option>
                <option value="Rent">Rent</option>
                <option value="Appliance Rental">Appliance Rental</option>
                <option value="Utilities">Utilities</option>
                <option value="Cook & Maid">Cook &amp; Maid</option>
                <option value="Personal">Personal</option>
              </select>

              <button
                type="button"
                onClick={() => generatePurchasedItemsPDF(expenses, allMembers)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                title="Download Bought Items Register (PDF)"
              >
                <FileDown className="w-3.5 h-3.5 text-indigo-500" />
                <span>PDF</span>
              </button>

              <button
                type="button"
                onClick={() => generatePurchasedItemsCSV(expenses, allMembers)}
                className="px-2 py-1.5 text-xs font-bold text-emerald-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                title="Download Bought Items Register (CSV)"
              >
                CSV
              </button>
            </div>
          </div>

          {mySplitsList.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <Wallet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No split expenses found matching your query.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {mySplitsList.map((exp) => {
                const payer = memberMap.get(exp.paidById) || holder;
                const myShare = shares.find(
                  (s) => s.expenseId === exp.id && s.debtorId === currentMember.id
                );
                const isPaid = exp.paidById === currentMember.id || myShare?.status === 'COMPLETED';

                return (
                  <div
                    key={exp.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 dark:text-white text-base">
                          {exp.title}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {exp.category}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            exp.isPreCollectedSettled
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : isPaid
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                          }`}
                        >
                          {exp.isPreCollectedSettled
                            ? 'Pre-Collected & Settled ✓'
                            : isPaid
                            ? 'Settled ✓'
                            : 'Pending Share'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                        <span>Paid by: <strong>{payer.name}</strong></span>
                        <span>&bull;</span>
                        <span>Total Bill: <strong>{formatINR(exp.totalAmount)}</strong></span>
                        <span>&bull;</span>
                        <span>Split Among: {exp.splitMemberIds.length} mates</span>
                        {exp.notes && (
                          <>
                            <span>&bull;</span>
                            <span className="italic text-slate-400">&quot;{exp.notes}&quot;</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-black text-indigo-600 dark:text-indigo-400">
                        {myShare ? formatINR(myShare.amount) : formatINR(exp.totalAmount / exp.splitMemberIds.length)}
                      </div>
                      <div className="text-[10px] text-slate-400">Your Calculated Share</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 5: PERSONAL SPEND ================= */}
      {activeTab === 'personalSpend' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Personal Spend (Private Expense Diary)</span>
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-full">
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
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Record Personal Spend</span>
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
                Your personal spend diary is currently empty.
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

      {/* ================= TAB 6: MATE DEBT & SETTLEMENT LEDGER ================= */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Mate-to-Mate Debt &amp; Settlement Ledger</span>
                <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-full">
                  House Rent Excluded
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Direct 1-on-1 roommate shares and peer debts. House Rent and flat recurring expenses are managed separately in the Arrear and Rent tabs and are strictly excluded from personal ledgers.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* 1. Pending to Give section */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-2">
                <span>Pending to Give ({matePendingDebts.length})</span>
              </h3>

              {matePendingDebts.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                  No pending mate debts to pay!
                </div>
              ) : (
                matePendingDebts.map((share) => {
                  const creditor = memberMap.get(share.creditorId) || holder;

                  return (
                    <div
                      key={share.id}
                      className="p-3.5 rounded-2xl border border-red-200 dark:border-red-900/40 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          {share.expenseTitle}
                        </div>
                        <div className="text-xs text-slate-500">
                          To give to: <strong>{creditor.name}</strong> &bull; Amount: <span className="font-bold text-red-600">{formatINR(share.amount)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* WhatsApp Ask By Message */}
                        <button
                          type="button"
                          onClick={() =>
                            handleAskByMessage(
                              creditor.phone,
                              creditor.name,
                              share.expenseTitle,
                              share.amount,
                              'paying'
                            )
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl hover:bg-emerald-100"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Ask by Message</span>
                        </button>

                        {/* Pay via UPI */}
                        <a
                          href={
                            creditor.upiId
                              ? `upi://pay?pa=${creditor.upiId}&pn=${encodeURIComponent(creditor.name)}&am=${share.amount}&cu=INR&tn=${encodeURIComponent(share.expenseTitle)}`
                              : undefined
                          }
                          onClick={(e) => {
                            if (!creditor.upiId) {
                              e.preventDefault();
                              alert(`${creditor.name} has not configured a UPI ID yet.`);
                              return;
                            }
                            handleInitiateUpiPayment({
                              shareId: share.id,
                              billTitle: share.expenseTitle,
                              amount: share.amount,
                              recipient: creditor,
                            });
                          }}
                          className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-sm"
                        >
                          Pay via UPI
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 2. Completed / Settled section */}
            <div className="space-y-2 pt-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Completed / Settled ({mateSettledShares.length})
              </h3>

              {mateSettledShares.slice(0, 5).map((share) => {
                const creditor = memberMap.get(share.creditorId) || holder;
                return (
                  <div
                    key={share.id}
                    className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {share.expenseTitle}
                      </span>
                      <span className="text-slate-400 ml-2">Paid to {creditor.name}</span>
                    </div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">
                      {formatINR(share.amount)} ✓
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 7: FLAT DUTY ROSTER & CHORES ================= */}
      {activeTab === 'chores' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Flat Duties &amp; Room Tasks</span>
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-full">
                  Fully Changeable
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Easy house tasks for cleaning, kitchen, dustbins, and room maintenance. Add, change due date, or reassign duties anytime.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddChoreModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add / Change Duty</span>
            </button>
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
                        <span>Due Date: {chore.dueDate || chore.dueDay}</span>
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

                  <div className="flex items-center gap-2 self-end sm:self-center">
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

                    {onDeleteChore && (
                      <button
                        type="button"
                        onClick={() => onDeleteChore(chore.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Delete chore"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 8: FLAT INFO (NO WI-FI) ================= */}
      {activeTab === 'flatInfo' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Flat Info &amp; Essential Contacts
            </h2>
            <p className="text-xs text-slate-500">
              Holder-added contacts for flat maintenance, landlord, security, and roommates directory.
            </p>
          </div>

          {/* Essential House Contacts */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Maintenance &amp; Building Contacts
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-start justify-between gap-3"
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

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => copyPhone(contact.phone, contact.id)}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                      title="Copy phone number"
                    >
                      {copiedContactId === contact.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <a
                      href={`tel:${contact.phone}`}
                      className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 transition-colors"
                      title={`Call ${contact.name}`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Flatmates Phone Directory */}
          <div className="space-y-3 pt-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Flatmates Phone Directory
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {allMembers.map((mem) => (
                <div
                  key={mem.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ${
                        mem.avatarBg || 'bg-indigo-600'
                      }`}
                    >
                      {mem.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {mem.name}
                        </span>
                        {mem.isHolder && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                            Holder
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-slate-500">
                        {mem.phone}
                      </p>
                    </div>
                  </div>

                  <a
                    href={`tel:${mem.phone}`}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    title={`Call ${mem.name}`}
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 9: PAYMENTS TO ME ================= */}
      {activeTab === 'incoming' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Payments to Me (Incoming Claims)
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

      {/* ================= TAB 10: WISHLIST ================= */}
      {activeTab === 'wishlist' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Flat Wishlist</span>
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 rounded-full">
                  All Roommates
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Request any item for the flat (detergent, spices, broom, water dispenser). The Holder can approve and split to everyone or selected persons.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onOpenRequestItem()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition-all active:scale-95"
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
                const isMe = req.requestedById === currentMember.id;
                const isPurchased = req.status === 'PURCHASED';

                return (
                  <div
                    key={req.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 shadow-sm flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {isMe ? 'Requested by You' : `Requested by ${requester?.name || 'Flatmate'}`}
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

      {/* ================= MODAL: ADD / CHANGE CHORE ================= */}
      {showAddChoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Add House Duty / Task
                </h3>
                <p className="text-xs text-slate-500">
                  Assign room or flat maintenance duty to any mate
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddChoreModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateChore} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Task / Duty Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kitchen Cleaning & Trash, Water Can Refill, Bathroom Wash"
                  value={newChoreTitle}
                  onChange={(e) => setNewChoreTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Assign To
                </label>
                <select
                  value={newChoreAssignedId}
                  onChange={(e) => setNewChoreAssignedId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none"
                >
                  {allMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.id === currentMember.id ? '(You)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Frequency
                  </label>
                  <select
                    value={newChoreFrequency}
                    onChange={(e) => {
                      const freq = e.target.value as FlatChore['frequency'];
                      setNewChoreFrequency(freq);
                      if (freq !== 'Custom') {
                        setNewChoreDueDate(calculateChoreDueDate(freq));
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Daily">Daily</option>
                    <option value="A day after">A day after</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newChoreDueDate}
                    onChange={(e) => setNewChoreDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddChoreModal(false)}
                  className="py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm"
                >
                  Save Duty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: SET MY MONTHLY BUDGET ================= */}
      {showSetBudgetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <span>Set My Monthly Budget</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Configure your personal monthly spending target &amp; savings goal
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSetBudgetModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Quick Preset Buttons */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">
                Quick Choose Budget
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Nil (No Limit)', value: '0' },
                  { label: '₹1,000', value: '1000' },
                  { label: '₹2,000', value: '2000' },
                  { label: '₹5,000', value: '5000' },
                  { label: '₹8,000', value: '8000' },
                  { label: '₹12,000', value: '12000' },
                ].map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setBudgetInputValue(preset.value)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-colors ${
                      budgetInputValue === preset.value
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Or Enter Custom Amount (₹)
              </label>
              <input
                type="number"
                min="0"
                step="100"
                placeholder="e.g. 3500 (Enter 0 for Nil / No budget)"
                value={budgetInputValue}
                onChange={(e) => setBudgetInputValue(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Enter 0 or leave empty if you don&apos;t want any monthly budget cap.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSetBudgetModal(false)}
                className="py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const val = parseFloat(budgetInputValue) || 0;
                  if (onUpdateMember) {
                    onUpdateMember({
                      ...currentMember,
                      monthlyBudget: val > 0 ? val : undefined,
                    });
                  }
                  setShowSetBudgetModal(false);
                }}
                className="py-2.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-sm transition-colors"
              >
                Save Budget
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: RENT EXTENSION REQUEST ================= */}
      {requestingExtensionBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Request Time to Pay
                </h3>
                <p className="text-xs text-slate-500">
                  {requestingExtensionBill.title} &bull; Notify {holder.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRequestingExtensionBill(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs">
              Your share: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{formatINR(requestingExtensionBill.amount / (allMembers.length || 1))}</strong> due on the {requestingExtensionBill.dueDay}th.
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Select Extra Days Needed
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[3, 5, 7, 10].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setExtensionDays(d)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-colors ${
                      extensionDays === d
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    +{d} Days
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Reason / Note for Holder
              </label>
              <input
                type="text"
                value={extensionReason}
                onChange={(e) => setExtensionReason(e.target.value)}
                placeholder="e.g. Salary delayed by 3 days, bank server issue, etc."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRequestingExtensionBill(null)}
                className="py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const holderPhone = holder.phone.replace(/[^0-9]/g, '');
                  const cleanPhone = holderPhone.length === 10 ? '91' + holderPhone : holderPhone;
                  const myShare = Math.round(requestingExtensionBill.amount / (allMembers.length || 1));
                  if (onSendExtensionRequest) {
                    onSendExtensionRequest({
                      billId: requestingExtensionBill.id,
                      billTitle: requestingExtensionBill.title,
                      fromMemberId: currentMember.id,
                      days: extensionDays,
                      reason: extensionReason || 'Personal delay',
                      amount: myShare,
                    });
                  }
                  const msg = `Hi ${holder.name}, this is ${currentMember.name}.\nI would like to request an extension of ${extensionDays} days to pay my share of ₹${myShare} for "${requestingExtensionBill.title}".\nReason: ${extensionReason || 'Personal delay'}.\nThank you!`;
                  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
                  window.open(waUrl, '_blank');
                  setRequestingExtensionBill(null);
                  setExtensionSuccessMsg(true);
                  setTimeout(() => setExtensionSuccessMsg(false), 4000);
                }}
                className="py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Send via WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: SHOW HOLDER QR & UPI ================= */}
      {showHolderQrForRent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedQrBill ? selectedQrBill.bill.title : 'Holder Payment QR & UPI'}
                </h3>
                {selectedQrBill && (
                  <p className="text-[11px] text-slate-500">
                    Recipient: {holder.name} &bull; Exact Share: {formatINR(selectedQrBill.shareAmount)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowHolderQrForRent(false);
                  setSelectedQrBill(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            {selectedQrBill && selectedQrBill.breakdown.length > 1 && (
              <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-slate-800/80 border border-indigo-200/50 dark:border-indigo-900/40 text-xs">
                <div className="font-bold text-indigo-950 dark:text-indigo-200 text-center font-mono">
                  Formula: ({selectedQrBill.breakdown.map((i) => formatINR(i.amount)).join(' + ')})
                </div>
              </div>
            )}

            <div className="p-2 bg-white rounded-2xl border-2 border-slate-200 dark:border-slate-700 inline-block shadow-inner">
              <QRCodeDisplay
                name={holder.name}
                upiId={holder.upiId}
                customQrUrl={holder.qrCodeUrl}
                amount={selectedQrBill ? selectedQrBill.shareAmount : undefined}
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs space-y-1">
              <div className="text-slate-500">Holder UPI ID:</div>
              <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400 select-all">
                {holder.upiId || 'Not set by Holder yet'}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedQrBill && holder.upiId && (
                <a
                  href={`upi://pay?pa=${holder.upiId}&pn=${encodeURIComponent(holder.name)}&am=${Math.round(selectedQrBill.shareAmount)}&cu=INR&tn=${encodeURIComponent(selectedQrBill.bill.title)}`}
                  onClick={() => {
                    handleInitiateUpiPayment({
                      billId: selectedQrBill.bill.id,
                      billTitle: selectedQrBill.bill.title,
                      amount: selectedQrBill.shareAmount,
                      recipient: holder,
                      breakdownStr: selectedQrBill.breakdown.map((i) => `${i.title}: ${formatINR(i.amount)}`).join(' + '),
                    });
                  }}
                  className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-sm text-center"
                >
                  Pay via UPI
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  if (holder.upiId) {
                    navigator.clipboard.writeText(holder.upiId);
                    alert('Copied Holder UPI ID to clipboard!');
                  } else {
                    alert('Holder has not set a UPI ID yet.');
                  }
                }}
                className="flex-1 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Copy UPI ID
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowHolderQrForRent(false);
                  setSelectedQrBill(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: AUTOMATED UPI PAYMENT RETURN DETECTION ================= */}
      {showUpiReturnConfirmModal && pendingUpiSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border-2 border-emerald-500 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-2xl shadow-inner animate-bounce">
              ⚡
            </div>

            <div>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Automated UPI Return Detected
              </span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1.5">
                Did your payment succeed?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                We detected that you just completed your transaction in Google Pay, PhonePe, or Paytm.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-left">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Bill / Expense:</span>
                <span className="font-bold text-slate-900 dark:text-white">{pendingUpiSession.billTitle}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Recipient:</span>
                <span className="font-bold text-slate-900 dark:text-white">{pendingUpiSession.toMemberName}</span>
              </div>
              {pendingUpiSession.breakdownStr && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Breakdown:</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{pendingUpiSession.breakdownStr}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Total Paid:</span>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatINR(pendingUpiSession.amount)}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleConfirmUpiPaid}
                className="w-full py-3.5 px-4 text-sm font-black text-white bg-emerald-600 hover:bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-600/30 transition-transform active:scale-95 flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                <span>Yes, Payment Successful &bull; Confirm &amp; Send WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleDismissUpiReturn}
                className="w-full py-2.5 px-4 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                No / Payment Cancelled &bull; Try Again Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: 1-CLICK IN-APP DIRECT PAYMENT (FROM DEEP LINK) ================= */}
      {directPayModalBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border-2 border-indigo-500 space-y-4">
            {(() => {
              const shareData = calculateMemberBillShare(directPayModalBill, currentMember.id);
              const status = getRecurringBillStatus(directPayModalBill);
              const formulaStr =
                shareData.breakdown.length > 1
                  ? `(${shareData.breakdown.map((i) => formatINR(i.amount)).join(' + ')})`
                  : formatINR(shareData.total);

              return (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold text-sm">
                        ⚡ 1-Click Pay
                      </span>
                      <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white">
                          {directPayModalBill.title}
                        </h3>
                        <p className="text-xs text-slate-500">
                          Due Date: {status.formattedDueDate} ({status.daysRemaining === 0 ? 'Today!' : `in ${status.daysRemaining} days`})
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDirectPayModalBill(null)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Formula and Line-Item Breakdown */}
                  <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-slate-800/80 border border-indigo-200 dark:border-indigo-900/60 space-y-2 text-left">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                      <span className="text-[10px] uppercase text-slate-500">Formula:</span>
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 font-black">
                        {formulaStr}
                      </span>
                    </div>
                    <div className="pt-1.5 border-t border-indigo-200/50 dark:border-slate-700 space-y-1">
                      {shareData.breakdown.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 dark:text-slate-400">• {item.title}:</span>
                          <span className="font-bold text-slate-900 dark:text-white font-mono">{formatINR(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-indigo-200/60 dark:border-slate-700 flex items-center justify-between text-xs font-black">
                      <span className="text-slate-700 dark:text-slate-300">Total Calculated to Pay:</span>
                      <span className="text-indigo-600 dark:text-indigo-400 text-lg font-black font-mono">
                        {formatINR(shareData.total)}
                      </span>
                    </div>
                  </div>

                  {/* QR Code Canvas */}
                  <div className="flex justify-center p-2 bg-white rounded-2xl border border-slate-200 dark:border-slate-700">
                    <QRCodeDisplay
                      name={holder.name}
                      upiId={holder.upiId}
                      customQrUrl={holder.qrCodeUrl}
                      amount={shareData.total}
                    />
                  </div>

                  {/* Big Action Buttons */}
                  <div className="space-y-2 pt-1">
                    <a
                      href={
                        holder.upiId
                          ? `upi://pay?pa=${holder.upiId}&pn=${encodeURIComponent(holder.name)}&am=${Math.round(shareData.total)}&cu=INR&tn=${encodeURIComponent(directPayModalBill.title)}`
                          : undefined
                      }
                      onClick={(e) => {
                        if (!holder.upiId) {
                          e.preventDefault();
                          alert('Holder UPI ID is not configured. Please use QR code or transfer directly.');
                          return;
                        }
                        handleInitiateUpiPayment({
                          billId: directPayModalBill.id,
                          billTitle: directPayModalBill.title,
                          amount: shareData.total,
                          recipient: holder,
                          breakdownStr: formulaStr,
                        });
                      }}
                      className="w-full py-3 px-4 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-2xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 text-center"
                    >
                      <span>⚡ Open Google Pay / PhonePe / Paytm &bull; {formatINR(shareData.total)}</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        if (onSubmitPaymentClaim) {
                          onSubmitPaymentClaim({
                            fromMemberId: currentMember.id,
                            toMemberId: holder.id,
                            amount: shareData.total,
                            note: `Direct payment claim for ${directPayModalBill.title} (${formulaStr})`,
                          });
                        }
                        setDirectPayModalBill(null);
                        setPaymentClaimToast(`Payment claim for ${formatINR(shareData.total)} recorded!`);
                        setTimeout(() => setPaymentClaimToast(null), 4000);
                      }}
                      className="w-full py-2.5 px-4 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl"
                    >
                      I Already Paid &bull; Submit Claim Manually
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {paymentClaimToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xl border border-slate-700 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{paymentClaimToast}</span>
        </div>
      )}
    </div>
  );
}
