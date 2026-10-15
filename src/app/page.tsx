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
} from '@/types';
import {
  AppState,
  loadAppState,
  saveAppState,
  resetAppState,
  exportBackupJSON,
  importBackupJSON,
} from '@/lib/storage';
import { subscribeToFirebaseSync, pushStateToFirebase } from '@/lib/firebaseSync';
import { calculateExactSplit } from '@/lib/calculations';

export default function Home() {
  const [appState, setAppState] = useState<AppState | null>(null);
  const [activePortalType, setActivePortalType] = useState<'holder' | 'member' | 'gatekeeper'>('gatekeeper');
  const [currentMemberId, setCurrentMemberId] = useState<string>('');

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

  // Load state on mount & connect to real-time Firebase sync
  useEffect(() => {
    const loaded = loadAppState();
    setAppState(loaded);
    const holder = loaded.members.find((m) => m.isHolder) || loaded.members[0];
    setCurrentMemberId(holder.id);

    // Live sync with Firebase Firestore if credentials are provided
    const unsubscribeFirebase = subscribeToFirebaseSync('flat_304', (remoteState) => {
      setAppState(remoteState);
    });

    // Cross-tab synchronization
    const handleStorageUpdate = () => {
      setAppState(loadAppState());
    };
    window.addEventListener('flatmate-storage-update', handleStorageUpdate);
    return () => {
      unsubscribeFirebase();
      window.removeEventListener('flatmate-storage-update', handleStorageUpdate);
    };
  }, []);

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

  // --- ACTIONS ---

  // Select profile
  const handleSelectMemberPortal = (member: Member) => {
    setCurrentMemberId(member.id);
    setActivePortalType('member');
  };

  const handleSelectHolderPortal = (h: Member) => {
    setCurrentMemberId(h.id);
    setActivePortalType('holder');
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
    };

    // Calculate exact splits with paise remainder balancing
    const exactSplits = calculateExactSplit(
      data.totalAmount,
      data.splitMemberIds
    );

    const newShares: ExpenseShare[] = data.splitMemberIds.map((mId) => {
      const isPayer = mId === data.paidById;
      return {
        id: `share_${Date.now()}_${mId}`,
        expenseId: expenseId,
        expenseTitle: data.title,
        category: data.category,
        debtorId: mId,
        creditorId: data.paidById,
        amount: exactSplits[mId] || 0,
        status: isPayer ? ('COMPLETED' as const) : ('ARREAR' as const),
        createdAt: new Date().toISOString(),
        settledAt: isPayer ? new Date().toISOString() : undefined,
      };
    });

    // Create notification
    const newNotification: HolderNotification = {
      id: `notif_${Date.now()}`,
      title: 'New House Expense Recorded',
      message: `"${data.title}" of ₹${data.totalAmount} was recorded by ${
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

  // Settle Arrear (One-click)
  const handleSettleShare = (shareId: string) => {
    updateState((prev) => ({
      ...prev,
      shares: prev.shares.map((s) =>
        s.id === shareId
          ? {
              ...s,
              status: 'COMPLETED' as const,
              settledAt: new Date().toISOString(),
            }
          : s
      ),
    }));
  };

  // Revert settled share back to Arrears
  const handleRevertShare = (shareId: string) => {
    updateState((prev) => ({
      ...prev,
      shares: prev.shares.map((s) =>
        s.id === shareId
          ? {
              ...s,
              status: 'ARREAR' as const,
              settledAt: undefined,
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
      title: 'Payment Verification Requested',
      message: `${sender?.name} reported paying ₹${data.amount} to ${recipient?.name}. Awaiting verification.`,
      type: 'PAYMENT_CLAIM',
      timestamp: new Date().toISOString(),
      read: false,
      claimId,
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
    let remainingAmountToSettle = claim.amount;

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

      // 2. Settle matching arrears
      const updatedShares = prev.shares.map((s) => {
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
        message: `Your payment of ₹${claim.amount} has been verified and received by ${recipient?.name}. Shares updated to Completed!`,
        type: 'PAYMENT_CONFIRMED',
        timestamp: new Date().toISOString(),
        read: false,
      };

      return {
        ...prev,
        paymentClaims: updatedClaims,
        shares: updatedShares,
        notifications: [confirmNotification, ...prev.notifications],
      };
    });
  };

  // Recipient rejects payment claim
  const handleRejectPaymentClaim = (claimId: string) => {
    const claim = paymentClaims.find((c) => c.id === claimId);
    if (!claim) return;

    const recipient = members.find((m) => m.id === claim.toMemberId);

    const rejectNotification: HolderNotification = {
      id: `notif_${Date.now()}`,
      title: 'Payment Not Received ✕',
      message: `Your reported payment of ₹${claim.amount} was marked as Not Received by ${recipient?.name}. Please check transaction details.`,
      type: 'INFO',
      timestamp: new Date().toISOString(),
      read: false,
    };

    updateState((prev) => ({
      ...prev,
      paymentClaims: prev.paymentClaims.map((c) =>
        c.id === claimId ? { ...c, status: 'REJECTED' as const } : c
      ),
      shares: prev.shares.map((s) =>
        claim.shareIds?.includes(s.id) ? { ...s, status: 'ARREAR' as const } : s
      ),
      notifications: [rejectNotification, ...prev.notifications],
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
      targetMemberId: data.requestedById,
    };

    updateState((prev) => ({
      ...prev,
      purchaseRequests: [newReq, ...prev.purchaseRequests],
      notifications: [newNotification, ...prev.notifications],
    }));
  };

  // Convert Purchase Request to Split Expense
  const handleConvertRequestToExpense = (req: PurchaseRequest) => {
    handleSaveExpense({
      title: req.title,
      totalAmount: req.estimatedCost,
      category: 'Utilities',
      paidById: holder.id,
      mode: 'split',
      splitMemberIds: members.map((m) => m.id),
      notes: `Purchased based on flat request by ${
        members.find((m) => m.id === req.requestedById)?.name
      }`,
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

  // Edit existing expense with automatic share recalculation
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
  }) => {
    const exactSplits = calculateExactSplit(
      updated.totalAmount,
      updated.splitMemberIds
    );

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
  const handleGenerateExpenseFromBill = (bill: RecurringBill) => {
    handleSaveExpense({
      title: `${bill.title} (${new Date().toLocaleString('default', {
        month: 'short',
      })})`,
      totalAmount: bill.amount,
      category: bill.category,
      paidById: bill.payerId,
      mode: 'split',
      splitMemberIds: bill.splitMemberIds,
      notes: `Generated from recurring bill schedule (due on ${bill.dueDay}th)`,
    });
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

  // Mark notification read
  const handleMarkNotificationRead = (notifId: string) => {
    updateState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === notifId ? { ...n, read: true } : n
      ),
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased">
      {/* Top Header */}
      <Header
        currentMember={currentMember}
        allMembers={members}
        onSelectMember={handleSelectMemberPortal}
        onOpenHolderPortal={() => {
          setCurrentMemberId(holder.id);
          setActivePortalType('holder');
        }}
        onExitPortal={() => setActivePortalType('gatekeeper')}
        activePortalType={activePortalType}
        notifications={notifications}
        onMarkNotificationRead={handleMarkNotificationRead}
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
              onSelectHolderPortal={handleSelectHolderPortal}
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
            onOpenRecordExpense={() => setShowRecordExpense(true)}
            onOpenRentManager={() => setShowRentManager(true)}
            onOpenCheckModal={(mem) => setCheckingMember(mem)}
            onOpenEditMember={(mem) => setEditingMember(mem)}
            onOpenAddMember={() => setShowAddMember(true)}
            onSettleShare={handleSettleShare}
            onRevertShare={handleRevertShare}
            onConfirmPaymentClaim={handleConfirmPaymentClaim}
            onRejectPaymentClaim={handleRejectPaymentClaim}
            onConvertRequestToExpense={handleConvertRequestToExpense}
            onOpenEditExpense={(exp) => setEditingExpense(exp)}
            onDeleteExpense={handleDeleteExpense}
            onDeletePurchaseRequest={handleDeletePurchaseRequest}
          />
        )}

        {/* 3. Roommate / Member Portal */}
        {activePortalType === 'member' && (
          <MemberPortal
            currentMember={currentMember}
            allMembers={members}
            expenses={expenses}
            shares={shares}
            purchaseRequests={purchaseRequests}
            paymentClaims={paymentClaims}
            personalExpenses={personalExpenses}
            pantryItems={pantryItems}
            chores={chores}
            contacts={contacts}
            notices={notices}
            onOpenPayToMates={() => setShowPayToMates(true)}
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
            onOpenHolderPortal={() => {
              setCurrentMemberId(holder.id);
              setActivePortalType('holder');
            }}
          />
        )}
      </main>

      {/* ================= ALL INTERACTIVE POPUP MODALS ================= */}

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

      {/* 4. Record Expense Modal (Holder Only) */}
      <RecordExpenseModal
        isOpen={showRecordExpense}
        onClose={() => setShowRecordExpense(false)}
        members={members}
        holder={holder}
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
