'use client';

import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  MessageCircle,
  Edit2,
  Check,
  Plus,
  Home,
  Tv,
  Wifi,
  Bell,
  Split,
  Trash2,
  Tag,
  Layers,
} from 'lucide-react';
import { RecurringBill, Member, ExpenseCategory, BillSubItem } from '@/types';
import {
  getRecurringBillStatus,
  formatINR,
  generateWhatsAppLink,
  buildRentReminderText,
  calculateMemberBillShare,
} from '@/lib/calculations';

interface RentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bills: RecurringBill[];
  members: Member[];
  holder: Member;
  onUpdateBill: (updatedBill: RecurringBill) => void;
  onAddNewBill: (newBill: RecurringBill) => void;
  onGenerateExpenseFromBill: (
    bill: RecurringBill,
    targetMemberIds?: string[],
    customSplits?: Record<string, number>
  ) => void;
  onDeleteBill?: (billId: string) => void;
}

export default function RentManagerModal({
  isOpen,
  onClose,
  bills,
  members,
  holder,
  onUpdateBill,
  onAddNewBill,
  onGenerateExpenseFromBill,
  onDeleteBill,
}: RentManagerModalProps) {
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editDueDay, setEditDueDay] = useState<string>('');
  const [editTitle, setEditTitle] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editSplitMemberIds, setEditSplitMemberIds] = useState<string[]>([]);

  // Split popover / drawer when clicking "Split"
  const [splittingBillId, setSplittingBillId] = useState<string | null>(null);
  const [billSplitMode, setBillSplitMode] = useState<'all' | '1to1' | 'selected'>('all');
  const [billOneToOneMateId, setBillOneToOneMateId] = useState<string>('');
  const [billSelectedMates, setBillSelectedMates] = useState<string[]>([]);
  const [splitSuccessBillId, setSplitSuccessBillId] = useState<string | null>(null);

  // Sub-item (+) addition state (for adding table, chair, deposit, extra item to a bill)
  const [addingSubItemBillId, setAddingSubItemBillId] = useState<string | null>(null);
  const [newSubTitle, setNewSubTitle] = useState('');
  const [newSubAmount, setNewSubAmount] = useState('');
  const [newSubTarget, setNewSubTarget] = useState<'single' | 'selected' | 'all'>('single');
  const [newSubSingleMemberId, setNewSubSingleMemberId] = useState<string>('');
  const [newSubSelectedMemberIds, setNewSubSelectedMemberIds] = useState<string[]>([]);

  // Add new bill state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDueDay, setNewDueDay] = useState('11');
  const [newCategory, setNewCategory] = useState<ExpenseCategory>('Rent');
  const [newSplitMemberIds, setNewSplitMemberIds] = useState<string[]>(
    members.map((m) => m.id)
  );

  if (!isOpen) return null;

  const startEdit = (bill: RecurringBill) => {
    setEditingBillId(bill.id);
    setEditTitle(bill.title);
    setEditAmount(bill.amount.toString());
    setEditDueDay(bill.dueDay.toString());
    setEditNotes(bill.notes || '');
    setEditSplitMemberIds(bill.splitMemberIds || members.map((m) => m.id));
  };

  const saveEdit = (bill: RecurringBill) => {
    const numAmount = parseFloat(editAmount);
    const numDay = parseInt(editDueDay, 10);
    if (!numAmount || !numDay) return;

    onUpdateBill({
      ...bill,
      title: editTitle.trim() || bill.title,
      amount: numAmount,
      dueDay: Math.min(31, Math.max(1, numDay)),
      notes: editNotes.trim() || undefined,
      splitMemberIds:
        editSplitMemberIds.length > 0
          ? editSplitMemberIds
          : bill.splitMemberIds || members.map((m) => m.id),
    });

    setEditingBillId(null);
  };

  const startSplitBill = (bill: RecurringBill) => {
    setSplittingBillId(bill.id);
    setBillSplitMode('all');
    const defaultMates =
      bill.splitMemberIds && bill.splitMemberIds.length > 0
        ? bill.splitMemberIds
        : members.map((m) => m.id);
    setBillSelectedMates(defaultMates);
    const otherMates = members.filter((m) => m.id !== holder.id);
    if (otherMates.length > 0) {
      setBillOneToOneMateId(otherMates[0].id);
    }
  };

  const confirmSplitBill = (bill: RecurringBill) => {
    let finalTargets: string[] = [];
    if (billSplitMode === 'all') {
      finalTargets = members.map((m) => m.id);
    } else if (billSplitMode === '1to1') {
      finalTargets = [holder.id, billOneToOneMateId].filter(Boolean);
    } else {
      finalTargets =
        billSelectedMates.length > 0 ? billSelectedMates : members.map((m) => m.id);
    }

    const tempBill: RecurringBill = {
      ...bill,
      splitMemberIds: finalTargets,
    };

    const customSplits: Record<string, number> = {};
    finalTargets.forEach((mId) => {
      const shareData = calculateMemberBillShare(tempBill, mId);
      customSplits[mId] = shareData.total;
    });

    // Also include any other members who only have subItems assigned on this bill
    (bill.subItems || []).forEach((sub) => {
      (sub.memberIds || []).forEach((subMId) => {
        if (!finalTargets.includes(subMId)) {
          finalTargets.push(subMId);
          const shareData = calculateMemberBillShare(tempBill, subMId);
          customSplits[subMId] = shareData.total;
        }
      });
    });

    // Update the bill so splitMemberIds immediately reflects in the UI
    onUpdateBill({
      ...bill,
      splitMemberIds: finalTargets,
    });

    // Execute split
    onGenerateExpenseFromBill(
      { ...bill, splitMemberIds: finalTargets },
      finalTargets,
      customSplits
    );

    setSplittingBillId(null);
    setSplitSuccessBillId(bill.id);
    setTimeout(() => {
      setSplitSuccessBillId(null);
    }, 4000);
  };

  // Sub-item handlers
  const handleOpenAddSubItem = (billId: string) => {
    setAddingSubItemBillId(billId);
    setNewSubTitle('');
    setNewSubAmount('');
    setNewSubTarget('single');
    const firstOther = members.find((m) => m.id !== holder.id) || members[0];
    setNewSubSingleMemberId(firstOther ? firstOther.id : members[0]?.id || '');
    setNewSubSelectedMemberIds([firstOther ? firstOther.id : members[0]?.id || '']);
  };

  const handleSaveSubItem = (bill: RecurringBill) => {
    const amt = parseFloat(newSubAmount);
    if (!newSubTitle.trim() || isNaN(amt) || amt <= 0) return;

    let targetMems: string[] = [];
    if (newSubTarget === 'single') {
      targetMems = [newSubSingleMemberId];
    } else if (newSubTarget === 'all') {
      targetMems = members.map((m) => m.id);
    } else {
      targetMems =
        newSubSelectedMemberIds.length > 0
          ? newSubSelectedMemberIds
          : [members[0]?.id || ''];
    }

    const newSub: BillSubItem = {
      id: `sub_${Date.now()}`,
      title: newSubTitle.trim(),
      amount: amt,
      memberIds: targetMems,
    };

    const updatedSubItems = [...(bill.subItems || []), newSub];
    onUpdateBill({
      ...bill,
      subItems: updatedSubItems,
    });

    setAddingSubItemBillId(null);
    setNewSubTitle('');
    setNewSubAmount('');
  };

  const handleDeleteSubItem = (bill: RecurringBill, subId: string) => {
    const updatedSubItems = (bill.subItems || []).filter((s) => s.id !== subId);
    onUpdateBill({
      ...bill,
      subItems: updatedSubItems,
    });
  };

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newAmount);
    const day = parseInt(newDueDay, 10);
    if (!newTitle.trim() || !amt || !day) return;

    onAddNewBill({
      id: `rec_${Date.now()}`,
      title: newTitle.trim(),
      amount: amt,
      dueDay: Math.min(31, Math.max(1, day)),
      category: newCategory,
      reminderDaysBefore: 3,
      splitMemberIds:
        newSplitMemberIds.length > 0
          ? newSplitMemberIds
          : members.map((m) => m.id),
      payerId: holder.id,
      subItems: [],
    });

    setShowAddForm(false);
    setNewTitle('');
    setNewAmount('');
    setNewSplitMemberIds(members.map((m) => m.id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Recurring Rents &amp; Bills Hub
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-full">
                  Holder Controlled
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                Manage base rents, sub-items (table, chair, deposit), split controls &amp; WhatsApp reminders
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 mobile-scroll">
          {/* Top Notice */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-3">
            <Bell className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <strong className="font-semibold">Sub-Item Bundling &amp; 3-Day Reminders:</strong>
              <p className="mt-0.5 text-amber-800 dark:text-amber-400 leading-relaxed text-[11px] sm:text-xs">
                You can add sub-charges (+ table, chair, deposit) directly to any bill. The WhatsApp button calculates
                the combined total and includes a detailed itemized breakdown for each person.
              </p>
            </div>
          </div>

          {/* Bills List */}
          <div className="space-y-4">
            {bills.map((bill) => {
              const status = getRecurringBillStatus(bill);
              const splitCount = bill.splitMemberIds?.length || members.length;
              const subItemsTotal = (bill.subItems || []).reduce((sum, s) => sum + s.amount, 0);
              const grandBillTotal = bill.amount + subItemsTotal;
              const isEditing = editingBillId === bill.id;
              const isSplitting = splittingBillId === bill.id;
              const isAddingSub = addingSubItemBillId === bill.id;
              const isSuccess = splitSuccessBillId === bill.id;

              return (
                <div
                  key={bill.id}
                  className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 shadow-sm hover:border-indigo-300 transition-colors space-y-3.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        {bill.category === 'Rent' ? (
                          <Home className="w-5 h-5" />
                        ) : bill.category === 'Appliance Rental' ? (
                          <Tv className="w-5 h-5" />
                        ) : (
                          <Wifi className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="px-2 py-1 text-sm font-bold bg-white dark:bg-slate-900 border border-indigo-400 rounded-lg"
                          />
                        ) : (
                          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{bill.title}</span>
                            {isSuccess && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 animate-in fade-in">
                                ✓ Split Executed ({splitCount} mates)
                              </span>
                            )}
                          </h3>
                        )}
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                          <span>Due every {bill.dueDay}th</span>
                          <span>•</span>
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                            Split among {splitCount} mates
                          </span>
                          {(bill.subItems?.length || 0) > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                +{bill.subItems?.length} extra sub-items
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Timing Badge */}
                    <div className="flex items-center gap-2">
                      {status.isWithinReminderWindow ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-900/50 animate-pulse">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {status.daysRemaining === 0
                              ? 'DUE TODAY!'
                              : `Due in ${status.daysRemaining} days`}
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Next: {status.formattedDueDate}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pricing Details & Split Trigger Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 gap-3">
                    {isEditing ? (
                      <div className="flex items-center gap-3 flex-wrap w-full">
                        <div>
                          <label className="text-[10px] font-semibold text-slate-400 uppercase">
                            Base Total (₹)
                          </label>
                          <input
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-28 px-2 py-1 text-sm font-bold bg-white dark:bg-slate-900 border border-indigo-500 rounded"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-400 uppercase">
                            Due Day (1-31)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="31"
                            value={editDueDay}
                            onChange={(e) => setEditDueDay(e.target.value)}
                            className="w-20 px-2 py-1 text-sm font-bold bg-white dark:bg-slate-900 border border-indigo-500 rounded"
                          />
                        </div>
                        <div className="w-full">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase">
                            Deposit &amp; Rent Notes
                          </label>
                          <input
                            type="text"
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            placeholder="e.g. Deposit details, next month amount"
                            className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-indigo-500 rounded"
                          />
                        </div>

                        {/* Split members checkboxes in Edit */}
                        <div className="w-full pt-1">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
                            Included in Split ({editSplitMemberIds.length} of {members.length}):
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {members.map((m) => {
                              const isSel = editSplitMemberIds.includes(m.id);
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => {
                                    setEditSplitMemberIds((prev) =>
                                      prev.includes(m.id)
                                        ? prev.filter((id) => id !== m.id)
                                        : [...prev, m.id]
                                    );
                                  }}
                                  className={`px-2 py-1 text-xs rounded-lg border flex items-center gap-1 ${
                                    isSel
                                      ? 'bg-indigo-600 text-white border-indigo-600'
                                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                                  }`}
                                >
                                  {isSel && <Check className="w-3 h-3" />}
                                  <span>{m.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="w-full flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setEditingBillId(null)}
                            className="px-3 py-1.5 text-xs text-slate-500"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => saveEdit(bill)}
                            className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-xs text-slate-500">
                          {subItemsTotal > 0 ? 'Total Due (Base + Sub-Items):' : 'Amount Due:'}
                        </div>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-xl font-black text-slate-900 dark:text-white">
                            {formatINR(grandBillTotal)}
                          </span>
                          {subItemsTotal > 0 ? (
                            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                              (Base: {formatINR(bill.amount)} + Extra: {formatINR(subItemsTotal)})
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                              (₹{(bill.amount / splitCount).toFixed(2)} / person)
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      {!isEditing && (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(bill)}
                            className="px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center gap-1.5"
                            title="Change Price, Due Date, or Included Mates"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          {onDeleteBill && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Delete recurring bill "${bill.title}"?`)) {
                                  onDeleteBill(bill.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                              title="Delete recurring bill"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}

                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => startSplitBill(bill)}
                          className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
                          title="Execute split into flatmate Arrear folders"
                        >
                          <Split className="w-3.5 h-3.5" />
                          <span>Split</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* SUB-ITEMS / BUNDLED CHARGES SECTION (+ Table, Chair, Deposit) */}
                  <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <Layers className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Sub-Items &amp; Individual Rentals (Same Due Date)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenAddSubItem(bill.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 font-bold text-[11px] border border-indigo-200 dark:border-indigo-800 transition-colors"
                        title="Add table, chair, deposit, or individual item due on this date"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Item / Person / Deposit</span>
                      </button>
                    </div>

                    {/* Sub-items List */}
                    {bill.subItems && bill.subItems.length > 0 ? (
                      <div className="space-y-1.5 pt-1">
                        {bill.subItems.map((sub) => {
                          const subMems = members.filter((m) => sub.memberIds.includes(m.id));
                          const subPerPerson = sub.amount / (subMems.length || 1);

                          return (
                            <div
                              key={sub.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 text-xs"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Tag className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                  {sub.title}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  ({formatINR(sub.amount)} •{' '}
                                  {subMems.map((m) => m.name).join(', ')})
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400">
                                  {formatINR(subPerPerson)} / person
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSubItem(bill, sub.id)}
                                  className="text-slate-400 hover:text-red-500 p-1"
                                  title="Remove this sub-item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">
                        No sub-items added. You can add rented table, chair, or deposit shares above.
                      </p>
                    )}

                    {/* Add Sub-Item Inline Form */}
                    {isAddingSub && (
                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-indigo-400 dark:border-indigo-600 space-y-3 mt-2 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                            Add Sub-Item to {bill.title}
                          </h5>
                          <button
                            type="button"
                            onClick={() => setAddingSubItemBillId(null)}
                            className="text-xs text-slate-400 hover:text-slate-600"
                          >
                            Cancel
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                              Item Title *
                            </label>
                            <input
                              type="text"
                              required
                              value={newSubTitle}
                              onChange={(e) => setNewSubTitle(e.target.value)}
                              placeholder="e.g. Table Rental / Chair / Deposit Share"
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                              Amount (₹ INR) *
                            </label>
                            <input
                              type="number"
                              required
                              min="1"
                              step="1"
                              value={newSubAmount}
                              onChange={(e) => setNewSubAmount(e.target.value)}
                              placeholder="e.g. 200 or 3000"
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                            />
                          </div>
                        </div>

                        {/* Who rented / owes this sub-item? */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase block">
                            Who rented or pays for this item?
                          </label>
                          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
                            <button
                              type="button"
                              onClick={() => setNewSubTarget('single')}
                              className={`py-1 text-xs font-bold rounded ${
                                newSubTarget === 'single'
                                  ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm'
                                  : 'text-slate-500'
                              }`}
                            >
                              1 Person
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewSubTarget('selected')}
                              className={`py-1 text-xs font-bold rounded ${
                                newSubTarget === 'selected'
                                  ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm'
                                  : 'text-slate-500'
                              }`}
                            >
                              Selected Mates
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewSubTarget('all')}
                              className={`py-1 text-xs font-bold rounded ${
                                newSubTarget === 'all'
                                  ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm'
                                  : 'text-slate-500'
                              }`}
                            >
                              All Roommates
                            </button>
                          </div>

                          {newSubTarget === 'single' && (
                            <select
                              value={newSubSingleMemberId}
                              onChange={(e) => setNewSubSingleMemberId(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                            >
                              {members.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name} {m.isHolder ? '(Holder)' : ''}
                                </option>
                              ))}
                            </select>
                          )}

                          {newSubTarget === 'selected' && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {members.map((m) => {
                                const isSel = newSubSelectedMemberIds.includes(m.id);
                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => {
                                      setNewSubSelectedMemberIds((prev) =>
                                        prev.includes(m.id)
                                          ? prev.filter((id) => id !== m.id)
                                          : [...prev, m.id]
                                      );
                                    }}
                                    className={`px-2 py-1 text-xs rounded-lg border flex items-center gap-1 ${
                                      isSel
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                                    }`}
                                  >
                                    {isSel && <Check className="w-3 h-3" />}
                                    <span>{m.name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setAddingSubItemBillId(null)}
                            className="px-3 py-1 text-xs text-slate-500"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveSubItem(bill)}
                            className="px-3.5 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg"
                          >
                            Save Sub-Item
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* INLINE SPLIT CONFIGURATOR (Opened when clicking "Split") */}
                  {isSplitting && (
                    <div className="p-4 rounded-xl bg-indigo-50/90 dark:bg-indigo-950/60 border-2 border-indigo-500 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Split className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <h4 className="font-bold text-xs text-indigo-950 dark:text-indigo-200 uppercase tracking-wide">
                            Split &ldquo;{bill.title}&rdquo; into Arrears
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSplittingBillId(null)}
                          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold"
                        >
                          ✕ Close
                        </button>
                      </div>

                      {/* 3 Split Modes */}
                      <div className="grid grid-cols-3 gap-2 p-1 bg-white/70 dark:bg-slate-900/60 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setBillSplitMode('all')}
                          className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all ${
                            billSplitMode === 'all'
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          1 to All (Everyone)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBillSplitMode('1to1');
                            if (!billOneToOneMateId) {
                              const others = members.filter((m) => m.id !== holder.id);
                              if (others.length > 0) setBillOneToOneMateId(others[0].id);
                            }
                          }}
                          className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all ${
                            billSplitMode === '1to1'
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          1 to 1 (Direct)
                        </button>
                        <button
                          type="button"
                          onClick={() => setBillSplitMode('selected')}
                          className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all ${
                            billSplitMode === 'selected'
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          1 to Selected
                        </button>
                      </div>

                      {/* 1 to All View */}
                      {billSplitMode === 'all' && (
                        <div className="text-xs text-indigo-900 dark:text-indigo-200 flex items-center justify-between p-2.5 rounded-lg bg-white/60 dark:bg-slate-900/40">
                          <span>Splitting base amount equally among all <strong>{members.length}</strong> roommates:</span>
                          <strong className="text-sm font-mono text-indigo-700 dark:text-indigo-300">
                            ₹{(bill.amount / members.length).toFixed(2)} base / person
                          </strong>
                        </div>
                      )}

                      {/* 1 to 1 View */}
                      {billSplitMode === '1to1' && (
                        <div className="p-3 rounded-lg bg-white/60 dark:bg-slate-900/40 space-y-2">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                            Choose Roommate to Split 1-to-1 With:
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {members
                              .filter((m) => m.id !== holder.id)
                              .map((m) => (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => setBillOneToOneMateId(m.id)}
                                  className={`p-2 rounded-lg text-xs font-semibold border text-left flex items-center justify-between ${
                                    billOneToOneMateId === m.id
                                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-900 dark:text-white ring-1 ring-indigo-500'
                                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                                  }`}
                                >
                                  <span className="truncate">{m.name}</span>
                                  {billOneToOneMateId === m.id && (
                                    <Check className="w-3.5 h-3.5 text-indigo-600" />
                                  )}
                                </button>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* 1 to Selected View */}
                      {billSplitMode === 'selected' && (
                        <div className="p-3 rounded-lg bg-white/60 dark:bg-slate-900/40 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              Select Roommates Included ({billSelectedMates.length} of {members.length}):
                            </span>
                            <div className="flex gap-2 text-[11px]">
                              <button
                                type="button"
                                onClick={() => setBillSelectedMates(members.map((m) => m.id))}
                                className="text-indigo-600 hover:underline"
                              >
                                Select All
                              </button>
                              <button
                                type="button"
                                onClick={() => setBillSelectedMates([])}
                                className="text-slate-400 hover:underline"
                              >
                                Clear
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {members.map((m) => {
                              const isChecked = billSelectedMates.includes(m.id);
                              return (
                                <div
                                  key={m.id}
                                  onClick={() => {
                                    setBillSelectedMates((prev) =>
                                      prev.includes(m.id)
                                        ? prev.filter((id) => id !== m.id)
                                        : [...prev, m.id]
                                    );
                                  }}
                                  className={`p-2 rounded-lg text-xs font-semibold border cursor-pointer select-none flex items-center justify-between ${
                                    isChecked
                                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-900 dark:text-white'
                                      : 'border-slate-200 dark:border-slate-700 text-slate-400 opacity-70'
                                  }`}
                                >
                                  <span className="truncate">{m.name}</span>
                                  {isChecked && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Confirm Button */}
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setSplittingBillId(null)}
                          className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 rounded-lg hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmSplitBill(bill)}
                          className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Confirm &amp; Execute Split</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Deposit and Logistics Note Box */}
                  {bill.notes && !isEditing && (
                    <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/40 text-xs text-indigo-950 dark:text-indigo-200 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <span>ℹ️ Rent &amp; Deposit Notes:</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        {bill.notes}
                      </p>
                      {bill.depositAmount && (
                        <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                          Remaining Deposit: <strong>₹{bill.depositAmount.toLocaleString('en-IN')}</strong>
                        </div>
                      )}
                    </div>
                  )}

                  {/* WhatsApp Reminder Dispatch Tray with Exact Line-Item Details */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>Dispatch WhatsApp Reminder (Itemized Total &amp; Holder UPI):</span>
                      <span className="text-[11px] text-slate-400">
                        1-Click direct message
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {members
                        .filter((m) => {
                          const hasBase = bill.splitMemberIds?.includes(m.id);
                          const hasSub = (bill.subItems || []).some((s) => s.memberIds?.includes(m.id));
                          return hasBase || hasSub;
                        })
                        .map((m) => {
                          const memberShare = calculateMemberBillShare(bill, m.id);
                          const waText = buildRentReminderText({
                            memberName: m.name,
                            holderName: holder.name,
                            holderUpiId: holder.upiId,
                            billTitle: bill.title,
                            dueDay: bill.dueDay,
                            formattedDueDate: status.formattedDueDate,
                            daysRemaining: status.daysRemaining,
                            perPersonShare: memberShare.total,
                            breakdown: memberShare.breakdown,
                            billId: bill.id,
                            memberId: m.id,
                          });
                          const waUrl = generateWhatsAppLink(m.phone, waText);

                          return (
                            <a
                              key={m.id}
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all text-slate-800 dark:text-slate-200 group"
                            >
                              <div className="truncate">
                                <div className="truncate font-semibold">{m.name}</div>
                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                                  {formatINR(memberShare.total)}
                                </div>
                              </div>
                              <MessageCircle className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform shrink-0" />
                            </a>
                          );
                        })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add New Recurring Bill Button or Form */}
          {!showAddForm ? (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-2xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Recurring Bill (e.g. Cook, Maid, Gas)</span>
            </button>
          ) : (
            <form
              onSubmit={handleCreateNew}
              className="p-4 sm:p-5 rounded-2xl border border-indigo-300 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Add New Recurring Rent or Bill
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Bill Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Cook Salary / Gas Cylinder"
                    className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="3000"
                    className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Due Day (1-31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={newDueDay}
                    onChange={(e) => setNewDueDay(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              {/* Who splits this new bill */}
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Who splits this bill? ({newSplitMemberIds.length} of {members.length}):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {members.map((m) => {
                    const isSel = newSplitMemberIds.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setNewSplitMemberIds((prev) =>
                            prev.includes(m.id)
                              ? prev.filter((id) => id !== m.id)
                              : [...prev, m.id]
                          );
                        }}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg border flex items-center gap-1 ${
                          isSel
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {isSel && <Check className="w-3 h-3" />}
                        <span>{m.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  Add Bill
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
