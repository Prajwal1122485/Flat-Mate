'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  PlusCircle,
  Users,
  User,
  CheckSquare,
  Square,
  Calculator,
  AlertCircle,
  Receipt,
  Sparkles,
  ArrowRight,
  Check,
} from 'lucide-react';
import { Member, ExpenseCategory } from '@/types';
import { calculateExactSplit, formatINR } from '@/lib/calculations';

interface RecordExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  holder: Member;
  activeMember?: Member;
  onSaveExpense: (expenseData: {
    title: string;
    totalAmount: number;
    category: ExpenseCategory;
    paidById: string;
    mode: 'split' | 'solo';
    splitMemberIds: string[];
    customSplits?: Record<string, number>;
    notes?: string;
    isPreCollectedSettled?: boolean;
  }) => void;
}

const CATEGORIES: ExpenseCategory[] = [
  'Groceries',
  'Utilities',
  'Rent',
  'Appliance Rental',
  'Maintenance',
  'Food & Dining',
  'Personal',
  'Other',
];

export default function RecordExpenseModal({
  isOpen,
  onClose,
  members,
  holder,
  activeMember,
  onSaveExpense,
}: RecordExpenseModalProps) {
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Groceries');
  const [paidById, setPaidById] = useState<string>(activeMember?.id || holder.id);
  const [mode, setMode] = useState<'split' | 'solo'>('split');

  // Split Target: 'all' (1-to-All), 'oneToOne' (1-to-1), or 'selected' (1-to-Selected)
  const [splitTarget, setSplitTarget] = useState<'all' | 'oneToOne' | 'selected'>('all');
  const [oneToOneMateId, setOneToOneMateId] = useState<string>('');
  const [oneToOneRule, setOneToOneRule] = useState<'split50' | 'fullDebt'>('split50');

  // Multi-member selection
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    members.map((m) => m.id)
  );
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [soloMemberId, setSoloMemberId] = useState<string>(activeMember?.id || holder.id);
  const [notes, setNotes] = useState('');
  const [isPreCollectedSettled, setIsPreCollectedSettled] = useState<boolean>(false);

  // Sync default payer when modal opens
  useEffect(() => {
    if (isOpen) {
      const defaultPayer = activeMember?.id || holder.id;
      setPaidById(defaultPayer);
      setSoloMemberId(defaultPayer);
      const otherMates = members.filter((m) => m.id !== defaultPayer);
      if (otherMates.length > 0) {
        setOneToOneMateId(otherMates[0].id);
      }
      setSelectedMemberIds(members.map((m) => m.id));
    }
  }, [isOpen, activeMember?.id, holder.id, members]);

  const totalAmount = parseFloat(amountStr) || 0;

  // Active list of split members depending on splitTarget
  const effectiveMemberIds = useMemo(() => {
    if (splitTarget === 'all') {
      return members.map((m) => m.id);
    }
    if (splitTarget === 'oneToOne') {
      return [paidById, oneToOneMateId].filter(Boolean);
    }
    return selectedMemberIds;
  }, [splitTarget, members, paidById, oneToOneMateId, selectedMemberIds]);

  const equalSplits = useMemo(() => {
    return calculateExactSplit(totalAmount, effectiveMemberIds);
  }, [totalAmount, effectiveMemberIds]);

  const handleSwitchToCustom = () => {
    setSplitType('custom');
    const newCustoms: Record<string, string> = { ...customAmounts };
    selectedMemberIds.forEach((mId) => {
      if (!newCustoms[mId] || newCustoms[mId] === '0') {
        newCustoms[mId] = (equalSplits[mId] || 0).toFixed(2);
      }
    });
    setCustomAmounts(newCustoms);
  };

  const dynamicSplits = useMemo(() => {
    if (mode === 'solo') {
      return { [soloMemberId]: totalAmount };
    }
    if (splitTarget === 'oneToOne') {
      if (oneToOneRule === 'fullDebt') {
        return {
          [paidById]: 0,
          [oneToOneMateId]: totalAmount,
        };
      }
      const half = Math.round((totalAmount / 2) * 100) / 100;
      const otherHalf = Math.round((totalAmount - half) * 100) / 100;
      return {
        [paidById]: half,
        [oneToOneMateId]: otherHalf,
      };
    }
    if (splitTarget === 'selected' && splitType === 'custom') {
      const result: Record<string, number> = {};
      selectedMemberIds.forEach((mId) => {
        result[mId] = parseFloat(customAmounts[mId]) || 0;
      });
      return result;
    }
    return equalSplits;
  }, [
    mode,
    soloMemberId,
    totalAmount,
    splitTarget,
    oneToOneRule,
    paidById,
    oneToOneMateId,
    splitType,
    selectedMemberIds,
    customAmounts,
    equalSplits,
  ]);

  const allocatedTotal = useMemo(() => {
    if (mode === 'solo') return totalAmount;
    if (splitTarget !== 'selected' || splitType === 'equal') return totalAmount;
    return selectedMemberIds.reduce(
      (sum, mId) => sum + (parseFloat(customAmounts[mId]) || 0),
      0
    );
  }, [mode, totalAmount, splitTarget, splitType, selectedMemberIds, customAmounts]);

  const remainingToAllocate = useMemo(() => {
    return Math.round((totalAmount - allocatedTotal) * 100) / 100;
  }, [totalAmount, allocatedTotal]);

  const handleDistributeRemainingEvenly = () => {
    if (remainingToAllocate === 0 || selectedMemberIds.length === 0) return;
    const shareEach = Math.round((remainingToAllocate / selectedMemberIds.length) * 100) / 100;
    const updated: Record<string, string> = { ...customAmounts };
    selectedMemberIds.forEach((mId) => {
      const current = parseFloat(updated[mId]) || 0;
      updated[mId] = Math.max(0, current + shareEach).toFixed(2);
    });
    setCustomAmounts(updated);
  };

  if (!isOpen) return null;

  const handleSelectAll = () => {
    setSelectedMemberIds(members.map((m) => m.id));
  };

  const handleClearAll = () => {
    setSelectedMemberIds([]);
  };

  const handleToggleMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || totalAmount <= 0) return;

    let finalSplitMembers: string[] = [];
    let finalCustomSplits: Record<string, number> | undefined = undefined;

    if (mode === 'solo') {
      finalSplitMembers = [soloMemberId];
    } else if (splitTarget === 'all') {
      finalSplitMembers = members.map((m) => m.id);
    } else if (splitTarget === 'oneToOne') {
      if (!oneToOneMateId) return;
      finalSplitMembers = [paidById, oneToOneMateId];
      if (oneToOneRule === 'fullDebt') {
        finalCustomSplits = {
          [paidById]: 0,
          [oneToOneMateId]: totalAmount,
        };
      }
    } else {
      if (selectedMemberIds.length === 0) return;
      finalSplitMembers = selectedMemberIds;
      if (splitType === 'custom') {
        finalCustomSplits = {};
        selectedMemberIds.forEach((mId) => {
          finalCustomSplits![mId] = parseFloat(customAmounts[mId]) || 0;
        });
      }
    }

    onSaveExpense({
      title: title.trim(),
      totalAmount,
      category,
      paidById,
      mode,
      splitMemberIds: finalSplitMembers,
      customSplits: finalCustomSplits,
      notes: notes.trim() || undefined,
      isPreCollectedSettled,
    });

    // Reset and close
    setTitle('');
    setAmountStr('');
    setNotes('');
    setSplitType('equal');
    setCustomAmounts({});
    setIsPreCollectedSettled(false);
    onClose();
  };

  const otherMembers = members.filter((m) => m.id !== paidById);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Record New Expense
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-full">
                  1-to-1 • 1-to-All • Selected
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Register bill &amp; split dynamic shares with your roommates
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 max-h-[82vh] overflow-y-auto space-y-5">
          {/* Title & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Title / Description *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Blinkit Groceries / Dinner / Cab"
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Total Bill (₹ INR) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-semibold text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>
            </div>
          </div>

          {/* Category & Paid By */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Who Paid for This?
              </label>
              <select
                value={paidById}
                onChange={(e) => setPaidById(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-indigo-600 dark:text-indigo-400"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.isHolder ? '(Holder)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mode Toggle: Split vs Solo */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Expense Mode
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setMode('split')}
                className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'split'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Split Expense (Shared Arrears)</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('solo')}
                className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'solo'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Solo Record (No Debt)</span>
              </button>
            </div>
          </div>

          {/* SPLIT AUDIENCE: 1 to All, 1 to 1, or 1 to Selected */}
          {mode === 'split' ? (
            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                  How would you like to split?
                </label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  {/* 1 to All */}
                  <button
                    type="button"
                    onClick={() => setSplitTarget('all')}
                    className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-bold rounded-lg transition-all ${
                      splitTarget === 'all'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-indigo-500/20'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>1 to All (Everyone)</span>
                  </button>

                  {/* 1 to 1 */}
                  <button
                    type="button"
                    onClick={() => {
                      setSplitTarget('oneToOne');
                      if (otherMembers.length > 0 && !oneToOneMateId) {
                        setOneToOneMateId(otherMembers[0].id);
                      }
                    }}
                    className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-bold rounded-lg transition-all ${
                      splitTarget === 'oneToOne'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-indigo-500/20'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>1 to 1 (Direct)</span>
                  </button>

                  {/* 1 to Selected */}
                  <button
                    type="button"
                    onClick={() => setSplitTarget('selected')}
                    className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-bold rounded-lg transition-all ${
                      splitTarget === 'selected'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-indigo-500/20'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <CheckSquare className="w-4 h-4" />
                    <span>1 to Selected</span>
                  </button>
                </div>
              </div>

              {/* 1 TO ALL (EVERYONE) VIEW */}
              {splitTarget === 'all' && (
                <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 text-sm">
                      <Users className="w-4 h-4 text-indigo-600" />
                      Splitting Equally Among All {members.length} Flatmates
                    </span>
                    {totalAmount > 0 && (
                      <span className="font-extrabold text-sm font-mono text-indigo-700 dark:text-indigo-300">
                        ₹{(totalAmount / members.length).toFixed(2)} / person
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {members.map((m) => (
                      <span
                        key={m.id}
                        className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 font-semibold text-[11px]"
                      >
                        {m.name} {m.id === paidById ? '(Payer)' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 1 TO 1 (DIRECT SPLIT) VIEW */}
              {splitTarget === 'oneToOne' && (
                <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Select Roommate to Split 1-to-1 with:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {otherMembers.map((m) => {
                        const isSelected = oneToOneMateId === m.id;
                        return (
                          <div
                            key={m.id}
                            onClick={() => setOneToOneMateId(m.id)}
                            className={`p-2.5 rounded-xl border cursor-pointer select-none transition-all flex items-center justify-between ${
                              isSelected
                                ? 'bg-white dark:bg-slate-800 border-indigo-600 ring-2 ring-indigo-500/40 font-bold text-indigo-700 dark:text-indigo-300 shadow-sm'
                                : 'bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                            }`}
                          >
                            <span className="text-xs truncate">{m.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 1-to-1 Share Rule: 50/50 vs 100% Owed */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      1-to-1 Share Proportion:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setOneToOneRule('split50')}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          oneToOneRule === 'split50'
                            ? 'bg-white dark:bg-slate-800 border-indigo-600 text-slate-900 dark:text-white shadow-sm ring-1 ring-indigo-500/30'
                            : 'border-slate-200 dark:border-slate-700 text-slate-500'
                        }`}
                      >
                        <div className="text-xs font-bold">50 / 50 Equal Split</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {totalAmount > 0
                            ? `Each pays ₹${(totalAmount / 2).toFixed(2)}`
                            : 'Both split equally'}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setOneToOneRule('fullDebt')}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          oneToOneRule === 'fullDebt'
                            ? 'bg-white dark:bg-slate-800 border-indigo-600 text-slate-900 dark:text-white shadow-sm ring-1 ring-indigo-500/30'
                            : 'border-slate-200 dark:border-slate-700 text-slate-500'
                        }`}
                      >
                        <div className="text-xs font-bold">They Owe 100% (Full)</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {totalAmount > 0
                            ? `They owe full ₹${totalAmount.toFixed(2)}`
                            : 'You paid on their behalf'}
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 1 TO SELECTED (CHECKBOXES / CUSTOM) VIEW */}
              {splitTarget === 'selected' && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Select Roommates Included ({selectedMemberIds.length} of {members.length})
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="text-xs font-medium text-slate-500 hover:underline"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {/* Sub-toggle: Equal Split vs Custom Split */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Distribution:
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSplitType('equal')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          splitType === 'equal'
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        Equal Split
                      </button>
                      <button
                        type="button"
                        onClick={handleSwitchToCustom}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          splitType === 'custom'
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        Custom Amount (Per Person)
                      </button>
                    </div>
                  </div>

                  {splitType === 'equal' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {members.map((m) => {
                        const isChecked = selectedMemberIds.includes(m.id);
                        const shareAmount = dynamicSplits[m.id] || 0;

                        return (
                          <div
                            key={m.id}
                            onClick={() => handleToggleMember(m.id)}
                            className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                              isChecked
                                ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-950 dark:text-white shadow-sm'
                                : 'border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <div
                                className={`w-4 h-4 rounded flex items-center justify-center ${
                                  isChecked
                                    ? 'text-indigo-600 dark:text-indigo-400'
                                    : 'text-slate-400'
                                }`}
                              >
                                {isChecked ? (
                                  <CheckSquare className="w-4 h-4" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </div>
                              <span className="text-xs font-semibold truncate">
                                {m.name}
                              </span>
                            </div>
                            {isChecked && totalAmount > 0 && (
                              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                                ₹{shareAmount.toFixed(2)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                      <div className="text-xs text-slate-500 flex items-center justify-between">
                        <span>Enter custom amount for each roommate:</span>
                        {remainingToAllocate !== 0 && (
                          <button
                            type="button"
                            onClick={handleDistributeRemainingEvenly}
                            className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                          >
                            Distribute remaining (₹{remainingToAllocate.toFixed(2)}) evenly
                          </button>
                        )}
                      </div>

                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {members.map((m) => {
                          const isChecked = selectedMemberIds.includes(m.id);
                          return (
                            <div
                              key={m.id}
                              className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                                isChecked
                                  ? 'border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800'
                                  : 'border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 opacity-60'
                              }`}
                            >
                              <div
                                onClick={() => handleToggleMember(m.id)}
                                className="flex items-center gap-2 cursor-pointer select-none truncate"
                              >
                                <div
                                  className={`w-4 h-4 rounded flex items-center justify-center ${
                                    isChecked
                                      ? 'text-indigo-600 dark:text-indigo-400'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {isChecked ? (
                                    <CheckSquare className="w-4 h-4" />
                                  ) : (
                                    <Square className="w-4 h-4" />
                                  )}
                                </div>
                                <span className="text-xs font-semibold truncate">
                                  {m.name}
                                </span>
                              </div>

                              {isChecked && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-slate-400">₹</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={customAmounts[m.id] || ''}
                                    onChange={(e) => {
                                      setCustomAmounts((prev) => ({
                                        ...prev,
                                        [m.id]: e.target.value,
                                      }));
                                    }}
                                    className="w-24 px-2 py-1 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="0.00"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                        <span>Total Allocated: ₹{allocatedTotal.toFixed(2)}</span>
                        <span
                          className={
                            remainingToAllocate === 0
                              ? 'text-emerald-600 font-bold'
                              : remainingToAllocate > 0
                              ? 'text-amber-600 font-bold'
                              : 'text-red-600 font-bold'
                          }
                        >
                          {remainingToAllocate === 0
                            ? 'Balanced ✓'
                            : remainingToAllocate > 0
                            ? `Remaining: ₹${remainingToAllocate.toFixed(2)}`
                            : `Exceeds total by ₹${Math.abs(remainingToAllocate).toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Record Entirely For Member
              </label>
              <select
                value={soloMemberId}
                onChange={(e) => setSoloMemberId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} (100% individual expense)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Dynamic Live Calculation Card */}
          {totalAmount > 0 && (
            <div className="p-4 rounded-xl bg-slate-900 text-white dark:bg-slate-800/90 border border-slate-700/80 shadow-inner">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
                  <Calculator className="w-4 h-4" />
                  <span>LIVE SPLIT CALCULATION</span>
                </div>
                <span className="text-xs font-mono text-emerald-400">
                  Total: ₹{totalAmount.toFixed(2)}
                </span>
              </div>

              {mode === 'split' ? (
                effectiveMemberIds.length === 0 ? (
                  <p className="text-xs text-amber-300 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Please select at least 1 roommate to split this expense.
                  </p>
                ) : (
                  <div className="space-y-1">
                    <div className="text-xs text-slate-300">
                      Payer: <strong className="text-white">{members.find((m) => m.id === paidById)?.name}</strong>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs pt-1">
                      {effectiveMemberIds.map((mId) => {
                        const m = members.find((x) => x.id === mId);
                        const share = dynamicSplits[mId] || 0;
                        const isPayer = mId === paidById;
                        return (
                          <span
                            key={mId}
                            className={`px-2.5 py-1 rounded-lg font-mono border ${
                              isPayer
                                ? 'bg-indigo-950/80 border-indigo-700 text-indigo-200'
                                : 'bg-slate-800 dark:bg-slate-700 border-slate-700 text-white'
                            }`}
                          >
                            {m?.name}:{' '}
                            <strong className={isPayer ? 'text-indigo-300' : 'text-emerald-400'}>
                              ₹{share.toFixed(2)}
                            </strong>
                            {isPayer && ' (Paid)'}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )
              ) : (
                <div className="text-xs text-slate-300">
                  Solo record against{' '}
                  <strong className="text-white">
                    {members.find((m) => m.id === soloMemberId)?.name}
                  </strong>
                  . No debts generated for others.
                </div>
              )}
            </div>
          )}

          {/* Settlement / Collection Mode */}
          {mode === 'split' && (
            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Payment &amp; Settlement Flow
                </span>
                <span className="text-[10px] text-slate-400">
                  Were funds collected before buying?
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsPreCollectedSettled(false)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    !isPreCollectedSettled
                      ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-slate-900 dark:text-white shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-500'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span>Split in Arrears (Default)</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Payer pays upfront. Others owe their share as pending debts in their Arrear folders.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPreCollectedSettled(true)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isPreCollectedSettled
                      ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/50 text-slate-900 dark:text-white ring-1 ring-emerald-500/40 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-500'
                  }`}
                >
                  <div className="font-bold text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <span>✓ Pre-Collected &amp; Settled</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Payer collected everyone&apos;s share first and then bought. All shares marked Completed right away!
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
              Additional Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Swiggy Instamart, Cash collected on spot"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Action buttons */}
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
              disabled={
                !title.trim() ||
                totalAmount <= 0 ||
                (mode === 'split' && effectiveMemberIds.length === 0)
              }
              className={`inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition-all transform active:scale-95 ${
                isPreCollectedSettled
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>
                {isPreCollectedSettled
                  ? 'Save as Pre-Collected & Settled ✓'
                  : 'Record & Create Split'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
