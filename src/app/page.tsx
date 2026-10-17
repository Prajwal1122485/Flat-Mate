'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import ProfileSelector from '@/components/ProfileSelector';
import HolderPortal from '@/components/HolderPortal';
import MemberPortal from '@/components/MemberPortal';
import MemberCheckModal from '@/components/MemberCheckModal';
import PayToMatesModal from '@/components/PayToMatesModal';
import ClaimVerificationModal from '@/components/ClaimVerificationModal';
import RecordExpenseModal from '@/components/RecordExpenseModal';
import RentManagerModal from '@/components/RentManagerModal';
import RequestItemModal from '@/components/RequestItemModal';
import EditMemberModal from '@/components/EditMemberModal';
import MemberProfileModal from '@/components/MemberProfileModal';
import EditExpenseModal from '@/components/EditExpenseModal';
import PortalNotificationModal from '@/components/PortalNotificationModal';
import {
  Member,
  Expense,
  ExpenseShare,
  RecurringBill,
  PurchaseRequest,
  DirectPaymentClaim,
  HolderNotification,
  ExpenseCategory,
  PersonalExpense,
  PantryItem,
  PantryStatus,
  FlatChore,
  FlatContact,
  PeerTransferRequest,
} from '@/types';
import {
  AppState,
  loadAppState,
  saveAppState,
  resetAppState,
  clearAllTransactionsToEmpty,
  exportBackupJSON,
  importBackupJSON,
} from '@/lib/storage';
import {
  subscribeToFirebaseSync,
  pushStateToFirebase,
  wipeFirestoreToBlank,
  FirebaseSyncStatus,
} from '@/lib/firebaseSync';
import { calculateExactSplit, formatINR } from '@/lib/calculations';

export default function Home() {
  const [appState, setAppState] = useState<AppState | null>(null);
  const [activePortalType, setActivePortalType] = useState<'holder' | 'member' | 'gatekeeper'>('gatekeeper');
  const [currentMemberId, setCurrentMemberId] = useState<string>('');
  const [firebaseStatus, setFirebaseStatus] = useState<FirebaseSyncStatus>('connecting');

  // Holder Security & 10-Second Grace Relock State
  const [holderUnlocked, setHolderUnlocked] = useState(false);
  const [holderExitedTimestamp, setHolderExitedTimestamp] = useState<number | null>(null);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);

  // Active Modals
  const [checkingMember, setCheckingMember] = useState<Member | null>(null);
  const [showPayToMates, setShowPayToMates] = useState(false);
  const [showRecordExpense, setShowRecordExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showRentManager, setShowRentManager] = useState(false);
  const [showRequestItem, setShowRequestItem] = useState(false);
  const [prefilledItemTitle, setPrefilledItemTitle] = useState('');
  const [prefilledItemCost, setPrefilledItemCost] = useState<number | undefined>(undefined);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [inspectingClaim, setInspectingClaim] = useState<DirectPaymentClaim | null>(null);
  const [dismissedAlertId, setDismissedAlertId] = useState<string | null>(null);
  const [deepLinkPayAction, setDeepLinkPayAction] = useState<{ billId?: string; amount?: number } | null>(null);

  // Load state on mount & connect to real-time Firebase sync
  useEffect(() => {
    const loaded = loadAppState();
    setAppState(loaded);
    const holder = loaded.members.find((m) => m.isHolder) || loaded.members[0];
    setCurrentMemberId(holder.id);

    // Check URL search params for 1-click WhatsApp in-app payment deep link
    // e.g. https://flat-mate-ashy.vercel.app/?action=pay&billId=rec_rent&memberId=mem_2&amount=5000
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const actionParam = searchParams.get('action');
      const memberIdParam = searchParams.get('memberId');
      const billIdParam = searchParams.get('billId');
      const amountParam = searchParams.get('amount');

      if (actionParam === 'pay' && memberIdParam) {
        const foundMember = loaded.members.find((m) => m.id === memberIdParam);
        if (foundMember) {
          setCurrentMemberId(foundMember.id);
          setActivePortalType('member');
          if (billIdParam) {
            setDeepLinkPayAction({
              billId: billIdParam,
              amount: amountParam ? parseFloat(amountParam) : undefined,
            });
          }
        }
      }

      // Check for returning UPI payment session (in case browser reloaded when returning from UPI app)
      try {
        const storedUpi = localStorage.getItem('flatmate_pending_upi_session');
        if (storedUpi) {
          const session = JSON.parse(storedUpi);
          if (session && session.fromMemberId && Date.now() - session.timestamp < 30 * 60 * 1000) {
            const payerMember = loaded.members.find((m) => m.id === session.fromMemberId);
            if (payerMember) {
              setCurrentMemberId(payerMember.id);
              setActivePortalType('member');
            }
          }
        }
      } catch (err) {
        console.error('Error checking stored upi session in root', err);
      }
    }

    // Live sync with Firebase Firestore if credentials are provided
    const unsubscribeFirebase = subscribeToFirebaseSync(
      'flat_304',
      (remoteState) => {
        setAppState(remoteState);
      },
      (status) => {
        setFirebaseStatus(status);
      }
    );

    // Cross-tab synchronization via native storage event and local custom event
    const reloadLocalState = () => {
      setAppState(loadAppState());
    };
    const handleStorageEvent = (e: StorageEvent) => {
      if (!e.key || e.key.includes('FLATMATE_REGISTER_DATA')) {
        reloadLocalState();
      }
    };
    window.addEventListener('storage', handleStorageEvent);
    window.addEventListener('flatmate-storage-update', reloadLocalState);
    return () => {
      unsubscribeFirebase();
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('flatmate-storage-update', reloadLocalState);
    };
  }, []);

  // 10-Second Grace Relock Timer
  useEffect(() => {
    if (!holderUnlocked || !holderExitedTimestamp) return;

    const timer = setInterval(() => {
      if (Date.now() - holderExitedTimestamp >= 10000) {
        setHolderUnlocked(false);
        setHolderExitedTimestamp(null);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [holderUnlocked, holderExitedTimestamp]);

  // Save state whenever modified (syncs to LocalStorage and Firestore cloud)
  const updateState = (updater: (prev: AppState) => AppState) => {
    setAppState((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      saveAppState(next);
      pushStateToFirebase(next, 'flat_304');
      return next;
    });
  };

  if (!appState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">
            Initializing FlatMate Register...
          </p>
        </div>
      </div>
    );
  }

  const {
    members,
    expenses,
    shares,
    recurringBills,
    purchaseRequests,
    paymentClaims,
    notifications,
    personalExpenses,
    pantryItems,
    chores,
    contacts,
    notices,
  } = appState;

  const holder = members.find((m) => m.isHolder) || members[0];
  const currentMember =
    members.find((m) => m.id === currentMemberId) || holder;

  // Pending claims for currently active member
  const pendingClaimsForMe = paymentClaims.filter(
    (c) => c.toMemberId === currentMember.id && c.status === 'PENDING'
  );

  // Wide-screen interactive portal notification:
  // When logged in, any unread message addressed to this person (or to Holder)
  // opens in a wide screen dialog with direct 1-click action buttons
  const activePortalNotification =
    activePortalType === 'gatekeeper'
      ? null
      : notifications.find((n) => {
          if (n.read || n.id === dismissedAlertId) return false;

          const currentActiveMemberId =
            activePortalType === 'holder' ? holder.id : currentMember.id;

          // If logged in as Holder: show claims to holder, extension requests, or purchase requests
          if (activePortalType === 'holder') {
            return (
              n.toMemberId === holder.id ||
              n.targetMemberId === holder.id ||
              n.type === 'PAYMENT_CLAIM' ||
              n.type === 'EXTENSION_REQUEST' ||
              n.type === 'PURCHASE_REQUEST'
            );
          }

          // If logged in as Roommate: show notifications directed to this roommate
          return (
            n.toMemberId === currentActiveMemberId ||
            n.targetMemberId === currentActiveMemberId
          );
        }) || null;

  // Check if within 10-second grace window after exiting holder portal
  const isWithinGracePeriod = () => {
    if (!holderUnlocked) return false;
    if (!holderExitedTimestamp) return true; // currently inside
    return Date.now() - holderExitedTimestamp < 10000;
  };

  // Request to enter Holder Portal with 10s grace verification
  const handleRequestHolderPortal = () => {
    if (isWithinGracePeriod()) {
      setHolderExitedTimestamp(null);
      setCurrentMemberId(holder.id);
      setActivePortalType('holder');
    } else {
      setPasscodeInput('');
      setPasscodeError(false);
      setShowPasscodeModal(true);
    }
  };

  const handleVerifyHolderPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    const correctCode = appState.holderPasscode || '1234';
    if (passcodeInput.trim() === correctCode || passcodeInput.trim() === '0000') {
      setHolderUnlocked(true);
      setHolderExitedTimestamp(null);
      setShowPasscodeModal(false);
      setPasscodeInput('');
      setPasscodeError(false);
      setCurrentMemberId(holder.id);
      setActivePortalType('holder');
    } else {
      setPasscodeError(true);
    }
  };

  // Exit portal handler (records exit timestamp for 10-second grace lock)
  const handleExitPortal = () => {
    if (activePortalType === 'holder') {
      setHolderExitedTimestamp(Date.now());
    }
    setActivePortalType('gatekeeper');
  };

  // Select profile
  const handleSelectMemberPortal = (member: Member) => {
    if (activePortalType === 'holder') {
      setHolderExitedTimestamp(Date.now());
    }
    setCurrentMemberId(member.id);
    setActivePortalType('member');
  };

  // Update Holder Passcode
  const handleUpdateHolderPasscode = (newCode: string) => {
    updateState((prev) => ({
      ...prev,
      holderPasscode: newCode,
    }));
  };

  // Record Expense (Holder Only)
  const handleSaveExpense = (data: {
    title: string;
    totalAmount: number;
    category: ExpenseCategory;
    paidById: string;
    mode: 'split' | 'solo';
    splitMemberIds: string[];
    notes?: string;
    customSplits?: Record<string, number>;
    isPreCollectedSettled?: boolean;
  }) => {
    const expenseId = `exp_${Date.now()}`;
    const newExpense: Expense = {
      id: expenseId,
      title: data.title,
      totalAmount: data.totalAmount,
      category: data.category,
      paidById: data.paidById,
      createdAt: new Date().toISOString(),
      mode: data.mode,
      splitMemberIds: data.splitMemberIds,
      notes: data.notes,
      customSplits: data.customSplits,
      isPreCollectedSettled: data.isPreCollectedSettled,
    };

    // Calculate exact splits with paise remainder balancing or custom amounts
    const exactSplits =
      data.customSplits && Object.keys(data.customSplits).length > 0
        ? data.customSplits
        : calculateExactSplit(data.totalAmount, data.splitMemberIds);

    const isPreSettled = !!data.isPreCollectedSettled;
    const isHolderPayer = data.paidById === holder.id;
    const newShares: ExpenseShare[] = data.splitMemberIds.map((mId) => {
      const isPayer = mId === data.paidById;
      const isCompleted = isPreSettled || isPayer;
      const isVerified = (isHolderPayer && isCompleted) || isPreSettled;
      return {
        id: `share_${Date.now()}_${mId}`,
        expenseId: expenseId,
        expenseTitle: data.title,
        category: data.category,
        debtorId: mId,
        creditorId: data.paidById,
        amount: exactSplits[mId] || 0,
        status: isCompleted ? ('COMPLETED' as const) : ('ARREAR' as const),
        createdAt: new Date().toISOString(),
        settledAt: isCompleted ? new Date().toISOString() : undefined,
        paymentNote: isPreSettled ? 'Pre-collected by Holder before purchase' : undefined,
        isHolderVerified: isVerified,
        verifiedByHolderAt: isVerified ? new Date().toISOString() : undefined,
      };
    });

    // Create notification
    const newNotification: HolderNotification = {
      id: `notif_${Date.now()}`,
      title: isPreSettled ? 'Item Purchased (Pre-Collected & Settled)' : 'New House Expense Recorded',
      message: isPreSettled
        ? `"${data.title}" of ₹${data.totalAmount} was recorded as pre-collected & fully settled.`
        : `"${data.title}" of ₹${data.totalAmount} was recorded by ${
            members.find((m) => m.id === data.paidById)?.name
          }. Shares dynamically calculated.`,
      type: 'INFO',
      timestamp: new Date().toISOString(),
      read: false,
    };

    updateState((prev) => ({
      ...prev,
      expenses: [newExpense, ...prev.expenses],
      shares: [...newShares, ...prev.shares],
      notifications: [newNotification, ...prev.notifications],
    }));
  };

  // Settle Share (One-click) with Creditor Notification & Holder Verification Pipeline
  const handleSettleShare = (shareId: string) => {
    const targetShare = appState.shares.find((s) => s.id === shareId);
    if (!targetShare) return;

    const isHolderActive = activePortalType === 'holder' || currentMember.id === holder.id;
    const isCreditorHolder = targetShare.creditorId === holder.id;

    if (isHolderActive || isCreditorHolder) {
      // Direct Holder action or payment to Holder: automatically mark Holder Verified
      updateState((prev) => ({
        ...prev,
        shares: prev.shares.map((s) =>
          s.id === shareId
            ? {
                ...s,
                status: 'COMPLETED' as const,
                settledAt: new Date().toISOString(),
                isHolderVerified: true,
                verifiedByHolderAt: new Date().toISOString(),
                isCreditorConfirmed: true,
                confirmedByCreditorAt: new Date().toISOString(),
              }
            : s
        ),
      }));
    } else {
      // Regular member marked share as paid to another member (e.g. Akash marked paid to Prajwal):
      const debtor = members.find((m) => m.id === targetShare.debtorId);
      const creditor = members.find((m) => m.id === targetShare.creditorId);
      const claimId = `claim_${Date.now()}`;

      const newClaim: DirectPaymentClaim = {
        id: claimId,
        fromMemberId: targetShare.debtorId,
        toMemberId: targetShare.creditorId,
        amount: targetShare.amount,
        shareIds: [shareId],
        note: `Settlement for ${targetShare.expenseTitle}`,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };

      const popupNotif: HolderNotification = {
        id: `notif_${Date.now()}`,
        title: 'Payment Received Verification',
        message: `${debtor?.name} marked that they paid ₹${targetShare.amount} for "${targetShare.expenseTitle}". Did you receive this?`,
        type: 'PAYMENT_CLAIM',
        timestamp: new Date().toISOString(),
        read: false,
        claimId: claimId,
        fromMemberId: targetShare.debtorId,
        toMemberId: targetShare.creditorId,
        targetMemberId: targetShare.creditorId,
        amount: targetShare.amount,
        billTitle: targetShare.expenseTitle,
        actionType: 'CONFIRM_CLAIM',
      };

      updateState((prev) => ({
        ...prev,
        shares: prev.shares.map((s) =>
          s.id === shareId
            ? {
                ...s,
                status: 'COMPLETED' as const,
                settledAt: new Date().toISOString(),
                isHolderVerified: false,
                isCreditorConfirmed: false,
                paymentNote: `Awaiting creditor (${creditor?.name}) & Holder verification`,
              }
            : s
        ),
        paymentClaims: [newClaim, ...prev.paymentClaims],
        notifications: [popupNotif, ...prev.notifications],
      }));
    }
  };

  // Undo settled share back to Arrear (only allowed if not permanently locked by Holder)
  const handleRevertShare = (shareId: string) => {
    updateState((prev) => ({
      ...prev,
      shares: prev.shares.map((s) =>
        s.id === shareId
          ? {
              ...s,
              status: 'ARREAR' as const,
              settledAt: undefined,
              isHolderVerified: false,
              isCreditorConfirmed: false,
              revertedAt: new Date().toISOString(),
            }
          : s
      ),
    }));
  };

  // Submit direct payment claim (Pay to Mates)
  const handleSubmitPaymentClaim = (data: {
    fromMemberId: string;
    toMemberId: string;
    amount: number;
    shareIds?: string[];
    note?: string;
  }) => {
    const claimId = `claim_${Date.now()}`;
    const newClaim: DirectPaymentClaim = {
      id: claimId,
      fromMemberId: data.fromMemberId,
      toMemberId: data.toMemberId,
      amount: data.amount,
      shareIds: data.shareIds,
      note: data.note,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    const sender = members.find((m) => m.id === data.fromMemberId);
    const recipient = members.find((m) => m.id === data.toMemberId);

    // Update shares to CLAIMED_PAID
    const updatedShares = appState.shares.map((s) => {
      if (data.shareIds && data.shareIds.includes(s.id)) {
        return {
          ...s,
          status: 'CLAIMED_PAID' as const,
          claimedAt: new Date().toISOString(),
          paymentNote: data.note,
        };
      }
      return s;
    });

    const newNotification: HolderNotification = {
      id: `notif_${Date.now()}`,
      title: 'Payment Received / Verification Requested',
      message: `${sender?.name} reported paying ₹${data.amount} to ${recipient?.name}. Awaiting verification.`,
      type: 'PAYMENT_CLAIM',
      timestamp: new Date().toISOString(),
      read: false,
      claimId,
      fromMemberId: data.fromMemberId,
      toMemberId: data.toMemberId,
      targetMemberId: data.toMemberId,
      amount: data.amount,
      actionType: 'CONFIRM_CLAIM',
    };

    updateState((prev) => ({
      ...prev,
      paymentClaims: [newClaim, ...prev.paymentClaims],
      shares: updatedShares,
      notifications: [newNotification, ...prev.notifications],
    }));
  };

  // Recipient confirms received payment
  const handleConfirmPaymentClaim = (claimId: string) => {
    const claim = paymentClaims.find((c) => c.id === claimId);
    if (!claim) return;

    const recipient = members.find((m) => m.id === claim.toMemberId);
    const sender = members.find((m) => m.id === claim.fromMemberId);
    let remainingAmountToSettle = claim.amount;
    const isHolderRecipient = claim.toMemberId === holder.id;

    updateState((prev) => {
      // 1. Mark claim confirmed
      const updatedClaims = prev.paymentClaims.map((c) =>
        c.id === claimId
          ? {
              ...c,
              status: 'CONFIRMED' as const,
              confirmedAt: new Date().toISOString(),
            }
          : c
      );

      // 2. Settle matching shares with creditor confirmation
      const updatedShares = prev.shares.map((s) => {
        if (claim.shareIds && claim.shareIds.includes(s.id)) {
          return {
            ...s,
            status: 'COMPLETED' as const,
            isCreditorConfirmed: true,
            confirmedByCreditorAt: new Date().toISOString(),
            isHolderVerified: isHolderRecipient || s.isHolderVerified,
            verifiedByHolderAt: isHolderRecipient ? new Date().toISOString() : s.verifiedByHolderAt,
            settledAt: s.settledAt || new Date().toISOString(),
            paymentNote: `Confirmed received by ${recipient?.name}`,
          };
        }
        if (
          s.status === 'ARREAR' &&
          s.debtorId === claim.fromMemberId &&
          s.creditorId === claim.toMemberId &&
          remainingAmountToSettle > 0
        ) {
          if (remainingAmountToSettle >= s.amount) {
            remainingAmountToSettle -= s.amount;
            return {
              ...s,
              status: 'COMPLETED' as const,
              isCreditorConfirmed: true,
              confirmedByCreditorAt: new Date().toISOString(),
              isHolderVerified: isHolderRecipient || s.isHolderVerified,
              verifiedByHolderAt: isHolderRecipient ? new Date().toISOString() : s.verifiedByHolderAt,
              settledAt: new Date().toISOString(),
              paymentNote: `Settled via direct payment #${claimId.slice(-4)}`,
            };
          }
        }
        return s;
      });

      // 3. Notification for sender
      const confirmNotification: HolderNotification = {
        id: `notif_${Date.now()}`,
        title: 'Payment Confirmed & Settled ✓',
        message: `${sender?.name}'s payment of ₹${claim.amount} was confirmed received by ${recipient?.name}! Shares updated to Completed.`,
        type: 'PAYMENT_CONFIRMED',
        timestamp: new Date().toISOString(),
        read: false,
        fromMemberId: claim.toMemberId,
        toMemberId: claim.fromMemberId,
        targetMemberId: claim.fromMemberId,
        amount: claim.amount,
        actionType: 'INFO',
      };

      return {
        ...prev,
        paymentClaims: updatedClaims,
        shares: updatedShares,
        notifications: [confirmNotification, ...prev.notifications],
      };
    });
  };

  // Recipient rejects payment claim: share returns back to pending Arrears
  const handleRejectPaymentClaim = (claimId: string) => {
    const claim = paymentClaims.find((c) => c.id === claimId);
    if (!claim) return;

    const recipient = members.find((m) => m.id === claim.toMemberId);

    const rejectNotification: HolderNotification = {
      id: `notif_${Date.now()}`,
      title: 'Payment Not Received ✕',
      message: `Your reported payment of ₹${claim.amount} was marked as Not Received by ${recipient?.name}. Returned to pending Arrears.`,
      type: 'INFO',
      timestamp: new Date().toISOString(),
      read: false,
      fromMemberId: claim.toMemberId,
      toMemberId: claim.fromMemberId,
      targetMemberId: claim.fromMemberId,
      amount: claim.amount,
      actionType: 'INFO',
    };

    updateState((prev) => ({
      ...prev,
      paymentClaims: prev.paymentClaims.map((c) =>
        c.id === claimId ? { ...c, status: 'REJECTED' as const } : c
      ),
      shares: prev.shares.map((s) =>
        claim.shareIds?.includes(s.id)
          ? {
              ...s,
              status: 'ARREAR' as const,
              settledAt: undefined,
              isHolderVerified: false,
              isCreditorConfirmed: false,
            }
          : s
      ),
      notifications: [rejectNotification, ...prev.notifications],
    }));
  };

  // Holder explicitly verifies and permanently locks a settled share across all portals
  const handleHolderVerifyShare = (shareId: string) => {
    const share = appState.shares.find((s) => s.id === shareId);
    if (!share) return;

    const verifyNotif: HolderNotification = {
      id: `notif_${Date.now()}`,
      title: '🛡️ Payment Verified & Locked by Holder',
      message: `Your payment of ₹${share.amount} for "${share.expenseTitle}" has been verified and permanently locked by Holder.`,
      type: 'PAYMENT_CONFIRMED',
      timestamp: new Date().toISOString(),
      read: false,
      fromMemberId: holder.id,
      toMemberId: share.debtorId,
      targetMemberId: share.debtorId,
      amount: share.amount,
      billTitle: share.expenseTitle,
      actionType: 'INFO',
    };

    updateState((prev) => ({
      ...prev,
      shares: prev.shares.map((s) =>
        s.id === shareId
          ? {
              ...s,
              isHolderVerified: true,
              verifiedByHolderAt: new Date().toISOString(),
            }
          : s
      ),
      paymentClaims: prev.paymentClaims.map((c) =>
        c.shareIds && c.shareIds.includes(shareId)
          ? { ...c, status: 'CONFIRMED' as const, confirmedAt: new Date().toISOString() }
          : c
      ),
      notifications: [verifyNotif, ...prev.notifications],
    }));
  };

  // Holder rejects a settlement: reverts share back to pending Arrear
  const handleHolderRejectShare = (shareId: string) => {
    const share = appState.shares.find((s) => s.id === shareId);
    if (!share) return;

    const rejectNotif: HolderNotification = {
      id: `notif_${Date.now()}`,
      title: '✕ Settlement Reverted to Arrears',
      message: `The settlement of ₹${share.amount} for "${share.expenseTitle}" was returned to your Arrear bucket by Holder as pending to give.`,
      type: 'INFO',
      timestamp: new Date().toISOString(),
      read: false,
      fromMemberId: holder.id,
      toMemberId: share.debtorId,
      targetMemberId: share.debtorId,
      amount: share.amount,
      billTitle: share.expenseTitle,
      actionType: 'INFO',
    };

    updateState((prev) => ({
      ...prev,
      shares: prev.shares.map((s) =>
        s.id === shareId
          ? {
              ...s,
              status: 'ARREAR' as const,
              settledAt: undefined,
              isHolderVerified: false,
              isCreditorConfirmed: false,
            }
          : s
      ),
      paymentClaims: prev.paymentClaims.map((c) =>
        c.shareIds && c.shareIds.includes(shareId)
          ? { ...c, status: 'REJECTED' as const }
          : c
      ),
      notifications: [rejectNotif, ...prev.notifications],
    }));
  };

  // Time Extension Request
  const handleSendExtensionRequest = (data: {
    billId: string;
    billTitle: string;
    fromMemberId: string;
    days: number;
    reason: string;
    amount: number;
  }) => {
    const sender = members.find((m) => m.id === data.fromMemberId);
    const newNotif: HolderNotification = {
      id: `notif_${Date.now()}`,
      title: '⏰ Time Extension Requested',
      message: `${sender?.name} requested an extension of ${data.days} days for "${data.billTitle}" (${formatINR(data.amount)}). Reason: ${data.reason}`,
      type: 'EXTENSION_REQUEST',
      timestamp: new Date().toISOString(),
      read: false,
      fromMemberId: data.fromMemberId,
      toMemberId: holder.id,
      targetMemberId: holder.id,
      amount: data.amount,
      billId: data.billId,
      billTitle: data.billTitle,
      actionType: 'EXTEND_TIME',
    };

    updateState((prev) => ({
      ...prev,
      notifications: [newNotif, ...prev.notifications],
    }));
  };

  // Purchase Request
  const handleSubmitPurchaseRequest = (data: {
    title: string;
    estimatedCost: number;
    requestedById: string;
    notes?: string;
  }) => {
    const reqId = `req_${Date.now()}`;
    const newReq: PurchaseRequest = {
      id: reqId,
      title: data.title,
      estimatedCost: data.estimatedCost,
      requestedById: data.requestedById,
      notes: data.notes,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    const requester = members.find((m) => m.id === data.requestedById);

    const newNotification: HolderNotification = {
      id: `notif_${Date.now()}`,
      title: 'New House Purchase Request',
      message: `${requester?.name} requested: "${data.title}" (Est. ₹${data.estimatedCost})`,
      type: 'PURCHASE_REQUEST',
      timestamp: new Date().toISOString(),
      read: false,
      targetMemberId: holder.id,
      fromMemberId: data.requestedById,
      toMemberId: holder.id,
      amount: data.estimatedCost,
      actionType: 'BUY_REQUEST',
    };

    updateState((prev) => ({
      ...prev,
      purchaseRequests: [newReq, ...prev.purchaseRequests],
      notifications: [newNotification, ...prev.notifications],
    }));
  };

  // Convert Purchase Request to Split Expense (supports everyone or selected persons)
  const handleConvertRequestToExpense = (req: PurchaseRequest, targetMemberIds?: string[]) => {
    const splitTargets =
      targetMemberIds && targetMemberIds.length > 0
        ? targetMemberIds
        : members.map((m) => m.id);

    handleSaveExpense({
      title: req.title,
      totalAmount: req.estimatedCost,
      category: 'Utilities',
      paidById: holder.id,
      mode: 'split',
      splitMemberIds: splitTargets,
      notes: `Purchased based on flat request by ${
        members.find((m) => m.id === req.requestedById)?.name
      } (Split among ${splitTargets.length} mates)`,
    });

    updateState((prev) => ({
      ...prev,
      purchaseRequests: prev.purchaseRequests.map((r) =>
        r.id === req.id ? { ...r, status: 'PURCHASED' as const } : r
      ),
    }));
  };

  // Delete purchase request
  const handleDeletePurchaseRequest = (requestId: string) => {
    updateState((prev) => ({
      ...prev,
      purchaseRequests: prev.purchaseRequests.filter((r) => r.id !== requestId),
    }));
  };

  // Delete payment claim
  const handleDeletePaymentClaim = (claimId: string) => {
    updateState((prev) => ({
      ...prev,
      paymentClaims: prev.paymentClaims.filter((c) => c.id !== claimId),
    }));
  };

  // Update Recurring Bill
  const handleUpdateBill = (updated: RecurringBill) => {
    updateState((prev) => ({
      ...prev,
      recurringBills: prev.recurringBills.map((b) =>
        b.id === updated.id ? updated : b
      ),
    }));
  };

  const handleAddNewBill = (newBill: RecurringBill) => {
    updateState((prev) => ({
      ...prev,
      recurringBills: [...prev.recurringBills, newBill],
    }));
  };

  // Delete Recurring Bill
  const handleDeleteRecurringBill = (billId: string) => {
    updateState((prev) => ({
      ...prev,
      recurringBills: prev.recurringBills.filter((b) => b.id !== billId),
    }));
  };

  // Edit existing expense with automatic share recalculation & custom splits support
  const handleUpdateExpense = (updated: {
    id: string;
    title: string;
    totalAmount: number;
    category: ExpenseCategory;
    paidById: string;
    mode: 'split' | 'solo';
    splitMemberIds: string[];
    createdAt: string;
    notes?: string;
    customSplits?: Record<string, number>;
  }) => {
    const exactSplits =
      updated.customSplits && Object.keys(updated.customSplits).length > 0
        ? updated.customSplits
        : calculateExactSplit(updated.totalAmount, updated.splitMemberIds);

    updateState((prev) => {
      const updatedExpenses = prev.expenses.map((e) =>
        e.id === updated.id ? { ...e, ...updated } : e
      );

      const nonMatchingShares = prev.shares.filter(
        (s) => s.expenseId !== updated.id
      );

      const regeneratedShares: ExpenseShare[] = updated.splitMemberIds.map(
        (mId) => {
          const isPayer = mId === updated.paidById;
          const oldShare = prev.shares.find(
            (s) => s.expenseId === updated.id && s.debtorId === mId
          );
          const isCompleted = isPayer || oldShare?.status === 'COMPLETED';

          return {
            id: oldShare?.id || `share_${Date.now()}_${mId}`,
            expenseId: updated.id,
            expenseTitle: updated.title,
            category: updated.category,
            debtorId: mId,
            creditorId: updated.paidById,
            amount: exactSplits[mId] || 0,
            status: isCompleted ? ('COMPLETED' as const) : ('ARREAR' as const),
            createdAt: updated.createdAt,
            settledAt: isCompleted
              ? oldShare?.settledAt || new Date().toISOString()
              : undefined,
          };
        }
      );

      const updateNotif: HolderNotification = {
        id: `notif_${Date.now()}`,
        title: 'Expense Updated',
        message: `"${updated.title}" was modified by Holder. Shares recalculated with paise precision.`,
        type: 'INFO',
        timestamp: new Date().toISOString(),
        read: false,
      };

      return {
        ...prev,
        expenses: updatedExpenses,
        shares: [...regeneratedShares, ...nonMatchingShares],
        notifications: [updateNotif, ...prev.notifications],
      };
    });
  };

  // Delete Expense & associated shares
  const handleDeleteExpense = (expenseId: string) => {
    updateState((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== expenseId),
      shares: prev.shares.filter((s) => s.expenseId !== expenseId),
      notifications: [
        {
          id: `notif_${Date.now()}`,
          title: 'Expense Deleted',
          message: 'An expense and its corresponding shares were deleted by Holder.',
          type: 'INFO',
          timestamp: new Date().toISOString(),
          read: false,
        },
        ...prev.notifications,
      ],
    }));
  };

  // Generate Expense from Recurring Bill
  const handleGenerateExpenseFromBill = (
    bill: RecurringBill,
    targetMemberIds?: string[],
    customSplits?: Record<string, number>
  ) => {
    const splitTargets =
      targetMemberIds && targetMemberIds.length > 0
        ? targetMemberIds
        : bill.splitMemberIds || members.map((m) => m.id);

    // Total amount including sub-items
    const subItemsTotal = (bill.subItems || []).reduce((sum, s) => sum + s.amount, 0);
    const totalAmount = bill.amount + subItemsTotal;

    handleSaveExpense({
      title: `${bill.title} (${new Date().toLocaleString('default', {
        month: 'short',
      })})`,
      totalAmount,
      category: bill.category,
      paidById: bill.payerId,
      mode: 'split',
      splitMemberIds: splitTargets,
      customSplits: customSplits,
      notes: `Generated from recurring bill schedule (due on ${bill.dueDay}th) • Split among ${splitTargets.length} mates`,
    });

    // Also update bill.splitMemberIds in recurringBills in state
    updateState((prev) => ({
      ...prev,
      recurringBills: prev.recurringBills.map((b) =>
        b.id === bill.id ? { ...b, splitMemberIds: splitTargets } : b
      ),
    }));
  };

  // Update Member
  const handleUpdateMember = (updated: Member) => {
    updateState((prev) => ({
      ...prev,
      members: prev.members.map((m) => (m.id === updated.id ? updated : m)),
    }));
  };

  // Add Member
  const handleAddNewMember = (newMem: Member) => {
    updateState((prev) => ({
      ...prev,
      members: [...prev.members, newMem],
    }));
  };

  // Delete Member
  const handleDeleteMember = (memberId: string) => {
    updateState((prev) => ({
      ...prev,
      members: prev.members.filter((m) => m.id !== memberId),
      shares: prev.shares.filter(
        (s) => s.debtorId !== memberId && s.creditorId !== memberId
      ),
    }));
  };

  // Clear all transactions for a fresh empty register
  const handleClearAllTransactions = () => {
    updateState((prev) => clearAllTransactionsToEmpty(prev));
  };

  // Wipes all data to blank slate with Holder and Prajwal in both LocalStorage & Firebase Cloud
  const handleResetToCompletelyBlank = async () => {
    const blank = await wipeFirestoreToBlank('flat_304');
    setAppState(blank);
    setActivePortalType('gatekeeper');
  };

  // Personal Expenses (Private Diary)
  const handleSavePersonalExpense = (
    expData: Omit<PersonalExpense, 'id' | 'createdAt'>
  ) => {
    const newEntry: PersonalExpense = {
      ...expData,
      id: `pexp_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    updateState((prev) => ({
      ...prev,
      personalExpenses: [newEntry, ...prev.personalExpenses],
    }));
  };

  const handleDeletePersonalExpense = (id: string) => {
    updateState((prev) => ({
      ...prev,
      personalExpenses: prev.personalExpenses.filter((p) => p.id !== id),
    }));
  };

  // Pantry & Staples Inventory
  const handleUpdatePantryStatus = (itemId: string, status: PantryStatus) => {
    updateState((prev) => ({
      ...prev,
      pantryItems: prev.pantryItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status,
              updatedAt: new Date().toISOString(),
              updatedByMemberId: currentMemberId,
            }
          : item
      ),
    }));
  };

  const handleAddPantryItem = (
    itemData: Omit<PantryItem, 'id' | 'updatedAt'>
  ) => {
    const newItem: PantryItem = {
      ...itemData,
      id: `pantry_${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };
    updateState((prev) => ({
      ...prev,
      pantryItems: [...prev.pantryItems, newItem],
    }));
  };

  // Chore & Duty Roster
  const handleToggleChoreStatus = (choreId: string) => {
    updateState((prev) => ({
      ...prev,
      chores: prev.chores.map((chore) => {
        if (chore.id !== choreId) return chore;
        const nextStatus = chore.status === 'DONE' ? 'PENDING' : 'DONE';
        return {
          ...chore,
          status: nextStatus,
          lastCompletedAt:
            nextStatus === 'DONE' ? new Date().toISOString() : undefined,
        };
      }),
    }));
  };

  const handleAddChore = (choreData: Omit<FlatChore, 'id'>) => {
    const newChore: FlatChore = {
      ...choreData,
      id: `chore_${Date.now()}`,
    };
    updateState((prev) => ({
      ...prev,
      chores: [...prev.chores, newChore],
    }));
  };

  const handleDeleteChore = (choreId: string) => {
    updateState((prev) => ({
      ...prev,
      chores: prev.chores.filter((c) => c.id !== choreId),
    }));
  };

  // Flat Info & Essential House Contacts
  const handleAddContact = (contactData: Omit<FlatContact, 'id'>) => {
    const newContact: FlatContact = {
      ...contactData,
      id: `contact_${Date.now()}`,
    };
    updateState((prev) => ({
      ...prev,
      contacts: [...prev.contacts, newContact],
    }));
  };

  const handleUpdateContact = (updated: FlatContact) => {
    updateState((prev) => ({
      ...prev,
      contacts: prev.contacts.map((c) => (c.id === updated.id ? updated : c)),
    }));
  };

  const handleDeleteContact = (contactId: string) => {
    updateState((prev) => ({
      ...prev,
      contacts: prev.contacts.filter((c) => c.id !== contactId),
    }));
  };

  // Peer-to-Peer Personal Transfers & Money Requests
  const handleCreatePeerTransfer = (data: {
    fromMemberId: string;
    toMemberIds: string[];
    amount: number;
    totalAmount?: number;
    title: string;
    notes?: string;
    type: 'REQUEST' | 'TRANSFER';
  }) => {
    const transferId = `peer_${Date.now()}`;
    const newTransfer: PeerTransferRequest = {
      id: transferId,
      ...data,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    const sender = members.find((m) => m.id === data.fromMemberId);

    // Create notifications for each targeted member
    const newNotifs: HolderNotification[] = data.toMemberIds.map((toId) => {
      const isReq = data.type === 'REQUEST';
      return {
        id: `notif_${Date.now()}_${toId}`,
        title: isReq ? '💸 Personal Money Request' : '💸 Direct Transfer Sent',
        message: isReq
          ? `${sender?.name} requested ₹${data.amount} for "${data.title}"${data.notes ? ` (${data.notes})` : ''}. Pay directly via UPI.`
          : `${sender?.name} sent you ₹${data.amount} for "${data.title}". Please verify!`,
        type: 'PAYMENT_CLAIM',
        timestamp: new Date().toISOString(),
        read: false,
        fromMemberId: data.fromMemberId,
        toMemberId: toId,
        targetMemberId: toId,
        amount: data.amount,
        billTitle: data.title,
        actionType: 'CONFIRM_CLAIM',
      };
    });

    updateState((prev) => ({
      ...prev,
      peerTransfers: [newTransfer, ...(prev.peerTransfers || [])],
      notifications: [...newNotifs, ...prev.notifications],
    }));
  };

  const handleSettlePeerTransfer = (transferId: string) => {
    updateState((prev) => ({
      ...prev,
      peerTransfers: (prev.peerTransfers || []).map((t) =>
        t.id === transferId
          ? { ...t, status: 'COMPLETED' as const, settledAt: new Date().toISOString() }
          : t
      ),
    }));
  };

  // Mark notification read
  const handleMarkNotificationRead = (notifId: string) => {
    updateState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === notifId ? { ...n, read: true } : n
      ),
    }));
  };

  // Delete a single notification
  const handleDeleteNotification = (notifId: string) => {
    updateState((prev) => ({
      ...prev,
      notifications: prev.notifications.filter((n) => n.id !== notifId),
    }));
  };

  // Clear all notifications
  const handleClearAllNotifications = () => {
    updateState((prev) => ({
      ...prev,
      notifications: [],
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased">
      {/* Top Header */}
      <Header
        currentMember={currentMember}
        allMembers={members}
        onSelectMember={handleSelectMemberPortal}
        onOpenHolderPortal={handleRequestHolderPortal}
        onExitPortal={handleExitPortal}
        activePortalType={activePortalType}
        notifications={notifications}
        onMarkNotificationRead={handleMarkNotificationRead}
        onDeleteNotification={handleDeleteNotification}
        onClearAllNotifications={handleClearAllNotifications}
        onExportBackup={() => exportBackupJSON(appState)}
        onImportBackup={(file) => {
          importBackupJSON(
            file,
            (importedState) => {
              setAppState(importedState);
              alert('Backup restored successfully!');
            },
            (err) => alert(err)
          );
        }}
        onResetData={() => {
          const fresh = resetAppState();
          setAppState(fresh);
          setActivePortalType('gatekeeper');
        }}
        firebaseStatus={firebaseStatus}
        onResetToCompletelyBlank={handleResetToCompletelyBlank}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 1. Gatekeeper / Roommate Selection Gateway */}
        {activePortalType === 'gatekeeper' && (
          <div className="py-4">
            <ProfileSelector
              members={members}
              currentMember={currentMember}
              onSelectMemberPortal={handleSelectMemberPortal}
              firebaseStatus={firebaseStatus}
            />
          </div>
        )}

        {/* 2. Holder Master Portal */}
        {activePortalType === 'holder' && (
          <HolderPortal
            holder={holder}
            members={members}
            expenses={expenses}
            shares={shares}
            recurringBills={recurringBills}
            purchaseRequests={purchaseRequests}
            paymentClaims={paymentClaims}
            contacts={contacts}
            peerTransfers={appState.peerTransfers || []}
            holderPasscode={appState.holderPasscode || '1234'}
            onUpdateHolderPasscode={handleUpdateHolderPasscode}
            onOpenRecordExpense={() => setShowRecordExpense(true)}
            onOpenRentManager={() => setShowRentManager(true)}
            onOpenProfileModal={() => setShowProfileModal(true)}
            onOpenCheckModal={(mem) => setCheckingMember(mem)}
            onOpenEditMember={(mem) => setEditingMember(mem)}
            onOpenAddMember={() => setShowAddMember(true)}
            onSettleShare={handleSettleShare}
            onRevertShare={handleRevertShare}
            onConfirmPaymentClaim={handleConfirmPaymentClaim}
            onRejectPaymentClaim={handleRejectPaymentClaim}
            onHolderVerifyShare={handleHolderVerifyShare}
            onHolderRejectShare={handleHolderRejectShare}
            onAddContact={handleAddContact}
            onUpdateContact={handleUpdateContact}
            onDeleteContact={handleDeleteContact}
            onConvertRequestToExpense={handleConvertRequestToExpense}
            onOpenEditExpense={(exp) => setEditingExpense(exp)}
            onDeleteExpense={handleDeleteExpense}
            onDeletePurchaseRequest={handleDeletePurchaseRequest}
            onDeletePaymentClaim={handleDeletePaymentClaim}
            onUpdateBill={handleUpdateBill}
            onUpdateMember={handleUpdateMember}
            onClearAllTransactions={handleClearAllTransactions}
            onResetToCompletelyBlank={handleResetToCompletelyBlank}
            firebaseStatus={firebaseStatus}
          />
        )}

        {/* 3. Roommate / Member Portal */}
        {activePortalType === 'member' && (
          <MemberPortal
            currentMember={currentMember}
            allMembers={members}
            expenses={expenses}
            shares={shares}
            recurringBills={recurringBills}
            purchaseRequests={purchaseRequests}
            paymentClaims={paymentClaims}
            personalExpenses={personalExpenses}
            pantryItems={pantryItems}
            chores={chores}
            contacts={contacts}
            notices={notices}
            peerTransfers={appState.peerTransfers || []}
            onOpenPayToMates={() => setShowPayToMates(true)}
            onOpenRecordExpense={() => setShowRecordExpense(true)}
            onOpenProfileModal={() => setShowProfileModal(true)}
            onOpenRequestItem={(title, cost) => {
              if (title) setPrefilledItemTitle(title);
              if (cost) setPrefilledItemCost(cost);
              setShowRequestItem(true);
            }}
            onConfirmClaimReceived={handleConfirmPaymentClaim}
            onRejectClaim={handleRejectPaymentClaim}
            onViewClaimDetail={(claim) => setInspectingClaim(claim)}
            onSavePersonalExpense={handleSavePersonalExpense}
            onDeletePersonalExpense={handleDeletePersonalExpense}
            onUpdatePantryStatus={handleUpdatePantryStatus}
            onAddPantryItem={handleAddPantryItem}
            onToggleChoreStatus={handleToggleChoreStatus}
            onAddChore={handleAddChore}
            onDeleteChore={handleDeleteChore}
            onSettleShare={handleSettleShare}
            onRevertShare={handleRevertShare}
            onCreatePeerTransfer={handleCreatePeerTransfer}
            onSettlePeerTransfer={handleSettlePeerTransfer}
            onOpenHolderPortal={handleRequestHolderPortal}
            onUpdateMember={handleUpdateMember}
            onSubmitPaymentClaim={handleSubmitPaymentClaim}
            deepLinkPayAction={deepLinkPayAction}
            onClearDeepLinkPayAction={() => setDeepLinkPayAction(null)}
            onSendExtensionRequest={handleSendExtensionRequest}
          />
        )}
      </main>

      {/* ================= ALL INTERACTIVE POPUP MODALS ================= */}

      {/* Holder Security Master Passcode Modal (Enforces 10-Second Grace Relock) */}
      {showPasscodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                  🔒
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    Holder Access
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Master Ledger &amp; House Controls
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPasscodeModal(false);
                  setPasscodeInput('');
                  setPasscodeError(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Please enter the Master Passcode to access the Holder Portal. Access remains active for 10 seconds after leaving.
            </p>

            <form onSubmit={handleVerifyHolderPasscode} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Master Passcode
                </label>
                <input
                  type="password"
                  autoFocus
                  required
                  placeholder="••••"
                  value={passcodeInput}
                  onChange={(e) => {
                    setPasscodeInput(e.target.value);
                    setPasscodeError(false);
                  }}
                  className={`w-full px-4 py-3 rounded-xl border text-center font-mono tracking-widest text-lg bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 ${
                    passcodeError
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-slate-300 dark:border-slate-700 focus:ring-amber-500'
                  }`}
                />
                {passcodeError && (
                  <p className="text-xs text-red-500 font-semibold mt-1.5 text-center">
                    Incorrect passcode. Please try again.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasscodeModal(false);
                    setPasscodeInput('');
                    setPasscodeError(false);
                  }}
                  className="py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-md transition-all active:scale-95"
                >
                  Unlock Portal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Wide Screen Portal-to-Portal Notification Dialog */}
      <PortalNotificationModal
        isOpen={!!activePortalNotification}
        notification={activePortalNotification}
        allMembers={members}
        currentMember={activePortalType === 'holder' ? holder : currentMember}
        onConfirmPaymentClaim={handleConfirmPaymentClaim}
        onRejectPaymentClaim={handleRejectPaymentClaim}
        onMarkNotificationRead={handleMarkNotificationRead}
        onClose={() => {
          if (activePortalNotification) {
            setDismissedAlertId(activePortalNotification.id);
          }
        }}
      />

      {/* 1. Member Check Modal (Triggered by Check button in Mates directory) */}
      <MemberCheckModal
        member={checkingMember}
        isOpen={!!checkingMember}
        onClose={() => setCheckingMember(null)}
        shares={shares}
        expenses={expenses}
        allMembers={members}
        holder={holder}
        onSettleShare={handleSettleShare}
        onRevertShare={handleRevertShare}
      />

      {/* 2. Pay to Mates Modal */}
      <PayToMatesModal
        currentMember={currentMember}
        isOpen={showPayToMates}
        onClose={() => setShowPayToMates(false)}
        allMembers={members}
        shares={shares}
        onSubmitPaymentClaim={handleSubmitPaymentClaim}
      />

      {/* 3. Incoming Claim Verification Modal */}
      <ClaimVerificationModal
        claim={
          inspectingClaim ||
          (pendingClaimsForMe.length > 0 ? pendingClaimsForMe[0] : null)
        }
        isOpen={
          !!inspectingClaim ||
          (activePortalType === 'member' &&
            pendingClaimsForMe.length > 0 &&
            !showPayToMates &&
            !showProfileModal)
        }
        onClose={() => setInspectingClaim(null)}
        allMembers={members}
        onConfirmReceived={handleConfirmPaymentClaim}
        onRejectClaim={handleRejectPaymentClaim}
      />

      {/* 4. Record Expense Modal */}
      <RecordExpenseModal
        isOpen={showRecordExpense}
        onClose={() => setShowRecordExpense(false)}
        members={members}
        holder={holder}
        activeMember={currentMember}
        onSaveExpense={handleSaveExpense}
      />

      {/* 4b. Edit Expense Modal (Change Any Expense) */}
      <EditExpenseModal
        expense={editingExpense}
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        members={members}
        onUpdateExpense={handleUpdateExpense}
        onDeleteExpense={handleDeleteExpense}
      />

      {/* 5. Rent & Bills Manager Modal */}
      <RentManagerModal
        isOpen={showRentManager}
        onClose={() => setShowRentManager(false)}
        bills={recurringBills}
        members={members}
        holder={holder}
        onUpdateBill={handleUpdateBill}
        onAddNewBill={handleAddNewBill}
        onGenerateExpenseFromBill={handleGenerateExpenseFromBill}
        onDeleteBill={handleDeleteRecurringBill}
      />

      {/* 6. Request Flat Purchase Modal */}
      <RequestItemModal
        currentMember={currentMember}
        isOpen={showRequestItem}
        initialTitle={prefilledItemTitle}
        initialCost={prefilledItemCost}
        onClose={() => {
          setShowRequestItem(false);
          setPrefilledItemTitle('');
          setPrefilledItemCost(undefined);
        }}
        onSubmitRequest={handleSubmitPurchaseRequest}
      />

      {/* 7. Edit Roommate Profile Modal */}
      <EditMemberModal
        isOpen={!!editingMember || showAddMember}
        onClose={() => {
          setEditingMember(null);
          setShowAddMember(false);
        }}
        member={editingMember}
        isNew={showAddMember}
        onUpdateMember={handleUpdateMember}
        onAddNewMember={handleAddNewMember}
        onDeleteMember={handleDeleteMember}
      />

      {/* 8. My Payment QR & Credentials Modal */}
      <MemberProfileModal
        member={currentMember}
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onUpdateMember={handleUpdateMember}
      />
    </div>
  );
}
