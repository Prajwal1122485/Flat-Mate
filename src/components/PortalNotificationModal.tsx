'use client';

import React from 'react';
import {
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  MessageCircle,
  CreditCard,
  X,
} from 'lucide-react';
import { HolderNotification, Member } from '@/types';
import { formatINR, generateWhatsAppLink } from '@/lib/calculations';

interface PortalNotificationModalProps {
  notification: HolderNotification | null;
  isOpen: boolean;
  allMembers: Member[];
  currentMember: Member;
  onConfirmPaymentClaim?: (claimId: string) => void;
  onRejectPaymentClaim?: (claimId: string) => void;
  onCompleteChore?: (choreId: string) => void;
  onMarkNotificationRead: (notificationId: string) => void;
  onClose: () => void;
}

export default function PortalNotificationModal({
  notification,
  isOpen,
  allMembers,
  currentMember,
  onConfirmPaymentClaim,
  onRejectPaymentClaim,
  onCompleteChore,
  onMarkNotificationRead,
  onClose,
}: PortalNotificationModalProps) {
  if (!isOpen || !notification) return null;

  const holder = allMembers.find((m) => m.isHolder) || allMembers[0];
  const sender = allMembers.find((m) => m.id === notification.fromMemberId) || null;
  const receiver = allMembers.find((m) => m.id === notification.toMemberId) || currentMember;

  // Format time
  const timeFormatted = new Date(notification.timestamp).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleResolveConfirm = () => {
    if (notification.claimId && onConfirmPaymentClaim) {
      onConfirmPaymentClaim(notification.claimId);
    }
    onMarkNotificationRead(notification.id);
    onClose();
  };

  const handleResolveReject = () => {
    if (notification.claimId && onRejectPaymentClaim) {
      onRejectPaymentClaim(notification.claimId);
    }
    onMarkNotificationRead(notification.id);
    onClose();
  };

  const handleAcknowledge = () => {
    onMarkNotificationRead(notification.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border-2 border-indigo-500/60 dark:border-indigo-500/80 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top Header Glow Bar */}
        <div className="h-2 w-full bg-gradient-to-r from-indigo-500 via-amber-500 to-emerald-500" />

        <div className="p-6 sm:p-8 space-y-6">
          {/* Top Bar: Badges & Close Button */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-300/50">
                <Bell className="w-3.5 h-3.5" />
                <span>Portal-to-Portal Message</span>
              </span>

              {notification.type === 'PAYMENT_CLAIM' && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/50">
                  Payment Claim
                </span>
              )}
              {notification.type === 'EXTENSION_REQUEST' && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/50">
                  Time Extension Request
                </span>
              )}
              {notification.type === 'PAYMENT_CONFIRMED' && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/50">
                  Payment Verified
                </span>
              )}
              {notification.type === 'RENT_ALERT' && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300/50">
                  Rent Notice
                </span>
              )}
              {notification.type === 'CHORE_DUE' && (
                <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-white shadow-md shadow-amber-500/30 flex items-center gap-1.5 animate-bounce">
                  <span>🔔 Today is Your Turn!</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleAcknowledge}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Close popup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* SENDER TO RECEIVER VISUAL PIPELINE */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            {/* Sender */}
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-md shrink-0 ${
                  sender?.avatarBg || 'bg-indigo-600'
                }`}
              >
                {sender ? sender.name.slice(0, 2).toUpperCase() : 'APP'}
              </div>
              <div className="truncate">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Sent By
                </span>
                <span className="text-sm font-black text-slate-900 dark:text-white truncate block">
                  {sender?.name || 'FlatMate System'}
                </span>
                <span className="text-[10px] text-slate-500">
                  {sender?.isHolder ? 'Holder' : 'Roommate'}
                </span>
              </div>
            </div>

            {/* Connecting Arrow */}
            <div className="flex flex-col items-center shrink-0 px-2">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 flex items-center justify-center font-bold">
                <ArrowRight className="w-4 h-4" />
              </div>
              <span className="text-[9px] text-slate-400 mt-1 font-mono">Directed</span>
            </div>

            {/* Receiver */}
            <div className="flex items-center gap-3 min-w-0 text-right">
              <div className="truncate">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Received By
                </span>
                <span className="text-sm font-black text-slate-900 dark:text-white truncate block">
                  {receiver?.name || currentMember.name}
                </span>
                <span className="text-[10px] text-emerald-500 font-semibold">
                  (You)
                </span>
              </div>
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-md shrink-0 ${
                  receiver?.avatarBg || 'bg-emerald-600'
                }`}
              >
                {(receiver?.name || currentMember.name).slice(0, 2).toUpperCase()}
              </div>
            </div>
          </div>

          {/* MAIN NOTIFICATION CONTENT */}
          <div className="space-y-3">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
              {notification.title}
            </h3>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              {notification.message}
            </p>

            {/* Highlighted Amount Box if payment related */}
            {notification.amount && notification.amount > 0 && (
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Transaction Amount
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                    {formatINR(notification.amount)}
                  </span>
                </div>
                {notification.billTitle && (
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Related Item
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                      {notification.billTitle}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Received on {timeFormatted}</span>
            </div>
          </div>

          {/* DIRECT ACTION BUTTONS (NO NEED TO HUNT THROUGH TABS!) */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
            {/* Case 1: Payment Claim Awaiting Verification */}
            {notification.type === 'PAYMENT_CLAIM' && notification.claimId && (
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleResolveReject}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-red-300 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-bold text-xs sm:text-sm transition-all"
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <XCircle className="w-4 h-4" />
                    <span>Not Received / Reject</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleResolveConfirm}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition-all transform active:scale-95"
                >
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Received &amp; Mark Settled ✓</span>
                  </span>
                </button>
              </div>
            )}

            {/* Case 2: Time Extension Request sent to Holder */}
            {notification.type === 'EXTENSION_REQUEST' && (
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
                {sender?.phone && (
                  <a
                    href={generateWhatsAppLink(
                      sender.phone,
                      `Hi ${sender.name}! 👋 I received your time extension request for ${notification.billTitle || 'rent'}. That's totally fine, please clear it by the revised date. Thank you!\n\n🌐 Flat-Mate Portal: https://flat-mate-ashy.vercel.app/`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-4 py-3 rounded-2xl border border-emerald-300 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 font-bold text-xs sm:text-sm transition-all text-center flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Reply on WhatsApp</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={handleAcknowledge}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all transform active:scale-95"
                >
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Acknowledge &amp; Grant Extension ✓</span>
                  </span>
                </button>
              </div>
            )}

            {/* Case 3: Rent Alert / Reminder sent to Member */}
            {notification.type === 'RENT_ALERT' && (
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
                {holder.upiId && notification.amount && (
                  <a
                    href={`upi://pay?pa=${holder.upiId}&pn=${encodeURIComponent(
                      holder.name
                    )}&am=${Math.round(notification.amount)}&cu=INR&tn=${encodeURIComponent(
                      notification.billTitle || 'House Rent'
                    )}`}
                    className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs sm:text-sm shadow-lg transition-all text-center flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Pay via UPI App Now</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={handleAcknowledge}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm transition-all"
                >
                  <span>Got It / Review in Arrear</span>
                </button>
              </div>
            )}

            {/* Case 4: Chore / Flat Duty Turn Due Today */}
            {notification.type === 'CHORE_DUE' && (
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleAcknowledge}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm transition-all"
                >
                  <span>Remind Me Later / Close</span>
                </button>

                {notification.choreId && onCompleteChore && (
                  <button
                    type="button"
                    onClick={() => {
                      if (notification.choreId && onCompleteChore) {
                        onCompleteChore(notification.choreId);
                      }
                      onMarkNotificationRead(notification.id);
                      onClose();
                    }}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition-all transform active:scale-95 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Mark Duty Completed ✓</span>
                  </button>
                )}
              </div>
            )}

            {/* Default Case: Info / Confirmed */}
            {notification.type !== 'PAYMENT_CLAIM' &&
              notification.type !== 'EXTENSION_REQUEST' &&
              notification.type !== 'RENT_ALERT' &&
              notification.type !== 'CHORE_DUE' && (
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleAcknowledge}
                    className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95"
                  >
                    <span>Acknowledge &amp; Dismiss</span>
                  </button>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
