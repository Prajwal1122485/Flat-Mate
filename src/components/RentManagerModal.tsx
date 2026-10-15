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
} from 'lucide-react';
import { RecurringBill, Member, ExpenseCategory } from '@/types';
import {
  getRecurringBillStatus,
  formatINR,
  generateWhatsAppLink,
  buildRentReminderText,
} from '@/lib/calculations';

interface RentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bills: RecurringBill[];
  members: Member[];
  holder: Member;
  onUpdateBill: (updatedBill: RecurringBill) => void;
  onAddNewBill: (newBill: RecurringBill) => void;
  onGenerateExpenseFromBill: (bill: RecurringBill) => void;
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

  // Add new bill state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDueDay, setNewDueDay] = useState('11');
  const [newCategory, setNewCategory] = useState<ExpenseCategory>('Rent');

  if (!isOpen) return null;

  const startEdit = (bill: RecurringBill) => {
    setEditingBillId(bill.id);
    setEditTitle(bill.title);
    setEditAmount(bill.amount.toString());
    setEditDueDay(bill.dueDay.toString());
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
    });

    setEditingBillId(null);
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
      splitMemberIds: members.map((m) => m.id),
      payerId: holder.id,
    });

    setShowAddForm(false);
    setNewTitle('');
    setNewAmount('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl max-h-[88vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Recurring Rents &amp; Bills Hub
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-full">
                  Holder Controlled
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                House Rent (11th), Appliances (15th) • Variable pricing &amp; 3-day WhatsApp notifications
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Notice: 3-day rule */}
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-3">
            <Bell className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <strong className="font-semibold">3-Day Prior WhatsApp Reminder Protocol:</strong>
              <p className="mt-0.5 text-amber-800 dark:text-amber-400">
                Before 3 days of the rent date (e.g. on 8th for House Rent, and on 12th for Washing Machine),
                WhatsApp reminders are primed with pre-filled message, Holder UPI ID, and QR instructions.
              </p>
            </div>
          </div>

          {/* Bills List */}
          <div className="space-y-4">
            {bills.map((bill) => {
              const status = getRecurringBillStatus(bill);
              const splitCount = bill.splitMemberIds?.length || members.length;
              const perPerson = bill.amount / splitCount;
              const isEditing = editingBillId === bill.id;

              return (
                <div
                  key={bill.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 shadow-sm hover:border-indigo-300 transition-colors space-y-4"
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
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            {bill.title}
                          </h3>
                        )}
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>Due every {bill.dueDay}th of month</span>
                          <span>•</span>
                          <span>Split among {splitCount} mates</span>
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
                              : `Due in ${status.daysRemaining} days (Reminder Ready)`}
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

                  {/* Pricing Details & Holder Edit */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 gap-3">
                    {isEditing ? (
                      <div className="flex items-center gap-3 flex-wrap">
                        <div>
                          <label className="text-[10px] font-semibold text-slate-400 uppercase">
                            New Total (₹)
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
                        <button
                          type="button"
                          onClick={() => saveEdit(bill)}
                          className="mt-3.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Save
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="text-xs text-slate-500">Variable Pricing (Holder Controlled):</div>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-xl font-black text-slate-900 dark:text-white">
                            {formatINR(bill.amount)}
                          </span>
                          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                            (₹{perPerson.toFixed(2)} / person)
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {!isEditing && (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(bill)}
                            className="px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center gap-1.5"
                            title="Only Holder can change the price & date"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Change Price / Date</span>
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

                      <button
                        type="button"
                        onClick={() => onGenerateExpenseFromBill(bill)}
                        className="px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-lg border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5"
                        title="Generate this month's split expense and create arrears"
                      >
                        <Split className="w-3.5 h-3.5" />
                        <span>Post into Arrears</span>
                      </button>
                    </div>
                  </div>

                  {/* WhatsApp Reminder Dispatch Tray */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>Dispatch WhatsApp Reminder (with Holder UPI &amp; QR):</span>
                      <span className="text-[11px] text-slate-400">
                        1-Click direct message to roommate
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {members
                        .filter((m) => bill.splitMemberIds.includes(m.id))
                        .map((m) => {
                          const waText = buildRentReminderText({
                            memberName: m.name,
                            holderName: holder.name,
                            holderUpiId: holder.upiId,
                            billTitle: bill.title,
                            dueDay: bill.dueDay,
                            formattedDueDate: status.formattedDueDate,
                            daysRemaining: status.daysRemaining,
                            perPersonShare: perPerson,
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
                              <span className="truncate">{m.name}</span>
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
              className="p-5 rounded-2xl border border-indigo-300 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-4"
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

              <div className="flex justify-end gap-2">
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
