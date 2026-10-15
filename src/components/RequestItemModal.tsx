'use client';

import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, Plus } from 'lucide-react';
import { Member } from '@/types';

interface RequestItemModalProps {
  currentMember: Member;
  isOpen: boolean;
  onClose: () => void;
  initialTitle?: string;
  initialCost?: number;
  onSubmitRequest: (request: {
    title: string;
    estimatedCost: number;
    requestedById: string;
    notes?: string;
  }) => void;
}

export default function RequestItemModal({
  currentMember,
  isOpen,
  onClose,
  initialTitle = '',
  initialCost,
  onSubmitRequest,
}: RequestItemModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [cost, setCost] = useState(initialCost ? initialCost.toString() : '');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialTitle) setTitle(initialTitle);
      if (initialCost) setCost(initialCost.toString());
    }
  }, [isOpen, initialTitle, initialCost]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numCost = parseFloat(cost);
    if (!title.trim() || !numCost || numCost <= 0) return;

    onSubmitRequest({
      title: title.trim(),
      estimatedCost: numCost,
      requestedById: currentMember.id,
      notes: notes.trim() || undefined,
    });

    setTitle('');
    setCost('');
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Request Item to Buy for Flat
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Visible to all flatmates • Holder can approve &amp; convert into a split expense
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
              Item Name / Description *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mop & Bucket, Garbage Bags, Cooking Oil"
              className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
              Estimated Cost (₹ INR) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-semibold text-slate-400">
                ₹
              </span>
              <input
                type="number"
                step="1"
                min="1"
                required
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="e.g. 350"
                className="w-full pl-8 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
              Why do we need this? (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Previous mop handle broke yesterday"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !cost || parseFloat(cost) <= 0}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm transition-all transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Post Request to House</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
