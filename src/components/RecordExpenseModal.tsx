'use client';

import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { Member, ExpenseCategory, Expense } from '@/types';
import { calculateExactSplit, formatINR } from '@/lib/calculations';

interface RecordExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  holder: Member;
  onSaveExpense: (expenseData: {
    title: string;
    totalAmount: number;
    category: ExpenseCategory;
    paidById: string;
    mode: 'split' | 'solo';
    splitMemberIds: string[];
    notes?: string;
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
  onSaveExpense,
}: RecordExpenseModalProps) {
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Groceries');
  const [paidById, setPaidById] = useState<string>(holder.id);
  const [mode, setMode] = useState<'split' | 'solo'>('split');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    members.map((m) => m.id)
  );
  const [soloMemberId, setSoloMemberId] = useState<string>(holder.id);
  const [notes, setNotes] = useState('');

  // Dynamic live calculation of splits
  const totalAmount = parseFloat(amountStr) || 0;

  const dynamicSplits = useMemo(() => {
    if (mode === 'solo') {
      return { [soloMemberId]: totalAmount };
    }
    return calculateExactSplit(totalAmount, selectedMemberIds);
  }, [mode, soloMemberId, totalAmount, selectedMemberIds]);

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
    if (mode === 'split' && selectedMemberIds.length === 0) return;

    onSaveExpense({
      title: title.trim(),
      totalAmount,
      category,
      paidById,
      mode,
      splitMemberIds: mode === 'split' ? selectedMemberIds : [soloMemberId],
      notes: notes.trim() || undefined,
    });

    // Reset and close
    setTitle('');
    setAmountStr('');
    setNotes('');
    onClose();
  };

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
                  Record House Expense
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-full">
                  Holder Only
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Register bill &amp; dynamically split shares across selected roommates
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
                placeholder="e.g. Blinkit Groceries / Water Cans"
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
                Paid By
              </label>
              <select
                value={paidById}
                onChange={(e) => setPaidById(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.isHolder ? '(Holder)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mode Toggle */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Split Mode
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
                <span>Split Expense (Dynamic Share)</span>
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
                <span>Solo Register (No Debt)</span>
              </button>
            </div>
          </div>

          {/* Mode Content: Checkbox Grid or Solo Member */}
          {mode === 'split' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
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

              {/* Members Grid */}
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
                  <span>LIVE SPLIT CALCULATION (PAISE BALANCED)</span>
                </div>
                <span className="text-xs font-mono text-emerald-400">
                  Total: ₹{totalAmount.toFixed(2)}
                </span>
              </div>

              {mode === 'split' ? (
                selectedMemberIds.length === 0 ? (
                  <p className="text-xs text-amber-300 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Please select at least 1 roommate to split this expense.
                  </p>
                ) : (
                  <div className="space-y-1">
                    <div className="text-sm font-medium">
                      Split among {selectedMemberIds.length} mates:
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs pt-1">
                      {selectedMemberIds.map((mId) => {
                        const m = members.find((x) => x.id === mId);
                        const share = dynamicSplits[mId] || 0;
                        return (
                          <span
                            key={mId}
                            className="px-2.5 py-1 bg-slate-800 dark:bg-slate-700 rounded-lg font-mono border border-slate-700"
                          >
                            {m?.name}:{' '}
                            <strong className="text-indigo-300">
                              ₹{share.toFixed(2)}
                            </strong>
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

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
              Additional Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Swiggy Instamart Order #84729"
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
                (mode === 'split' && selectedMemberIds.length === 0)
              }
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition-all transform active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Record &amp; Create Arrears</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
