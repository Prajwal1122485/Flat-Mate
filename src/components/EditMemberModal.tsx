'use client';

import React, { useState, useEffect } from 'react';
import { X, UserCog, Trash2, Plus, Phone, CreditCard, Shield, User } from 'lucide-react';
import { Member } from '@/types';

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  onUpdateMember: (updated: Member) => void;
  onDeleteMember?: (id: string) => void;
  isNew?: boolean;
  onAddNewMember?: (member: Member) => void;
}

const AVATAR_COLORS = [
  'bg-indigo-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-sky-600',
  'bg-purple-600',
  'bg-rose-600',
  'bg-teal-600',
  'bg-orange-600',
];

export default function EditMemberModal({
  isOpen,
  onClose,
  member,
  onUpdateMember,
  onDeleteMember,
  isNew = false,
  onAddNewMember,
}: EditMemberModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [upiId, setUpiId] = useState('');
  const [budget, setBudget] = useState('8000');
  const [avatarBg, setAvatarBg] = useState('bg-indigo-600');

  useEffect(() => {
    if (member) {
      setName(member.name);
      setPhone(member.phone || '');
      setUpiId(member.upiId || '');
      setBudget(member.monthlyBudget?.toString() || '8000');
      setAvatarBg(member.avatarBg || 'bg-indigo-600');
    } else {
      setName('');
      setPhone('');
      setUpiId('');
      setBudget('8000');
      setAvatarBg(AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]);
    }
  }, [member, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (isNew && onAddNewMember) {
      const newM: Member = {
        id: `mem_${Date.now()}`,
        name: name.trim(),
        phone: phone.trim(),
        upiId: upiId.trim() || `${name.toLowerCase().replace(/\s+/g, '')}@upi`,
        isHolder: false,
        avatarBg,
        monthlyBudget: parseFloat(budget) || 8000,
      };
      onAddNewMember(newM);
    } else if (member) {
      onUpdateMember({
        ...member,
        name: name.trim(),
        phone: phone.trim(),
        upiId: upiId.trim(),
        avatarBg,
        monthlyBudget: parseFloat(budget) || 8000,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <UserCog className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {isNew ? 'Add New Roommate' : `Edit ${member?.name}'s Profile`}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Holder permission: Update name, phone &amp; payment credentials
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
              Flatmate Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rohan Sharma"
              className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
              Mobile Phone (for WhatsApp Reminders)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit number e.g. 9845012345"
                className="w-full pl-9 pr-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
              Default UPI ID
            </label>
            <div className="relative">
              <CreditCard className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. rohan@okaxis"
                className="w-full pl-9 pr-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
              Monthly Budget (₹ INR)
            </label>
            <input
              type="number"
              step="500"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g. 8000"
              className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Avatar Color Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Avatar Badge Color
            </label>
            <div className="flex items-center gap-2">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAvatarBg(color)}
                  className={`w-7 h-7 rounded-full ${color} transition-transform ${
                    avatarBg === color ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
            {!isNew && member && !member.isHolder && onDeleteMember ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Are you sure you want to remove ${member.name}?`)) {
                    onDeleteMember(member.id);
                    onClose();
                  }
                }}
                className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm transition-all"
              >
                {isNew ? 'Add Roommate' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
