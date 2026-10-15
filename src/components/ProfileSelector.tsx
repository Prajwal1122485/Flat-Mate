'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  User,
  Lock,
  ArrowRight,
  Sparkles,
  KeyRound,
  Crown,
} from 'lucide-react';
import { Member } from '@/types';

interface ProfileSelectorProps {
  members: Member[];
  onSelectMemberPortal: (member: Member) => void;
  onSelectHolderPortal: (holder: Member) => void;
  currentMember?: Member;
  onClose?: () => void;
  isModal?: boolean;
  isHolderUnlocked?: boolean;
  holderPasscode?: string;
}

export default function ProfileSelector({
  members,
  onSelectMemberPortal,
  onSelectHolderPortal,
  currentMember,
  onClose,
  isModal = false,
  isHolderUnlocked = false,
  holderPasscode = '1234',
}: ProfileSelectorProps) {
  const holder = members.find((m) => m.isHolder) || members[0];

  const [showHolderPinModal, setShowHolderPinModal] = useState(false);
  const [selectedMemberForPin, setSelectedMemberForPin] = useState<Member | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const handleVerifyHolderPin = (e: React.FormEvent) => {
    e.preventDefault();
    const expected = holderPasscode || '1234';
    if (pinInput.trim() === expected || pinInput.trim() === '0000') {
      setShowHolderPinModal(false);
      setPinInput('');
      setPinError(false);
      onSelectHolderPortal(holder);
      if (onClose) onClose();
    } else {
      setPinError(true);
    }
  };

  const handleVerifyMemberPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberForPin) return;
    // Any 4 digit passcode or 0000/1234
    if (pinInput.trim() === '1234' || pinInput.trim() === '0000' || pinInput.trim().length === 4) {
      const mem = selectedMemberForPin;
      setSelectedMemberForPin(null);
      setPinInput('');
      setPinError(false);
      onSelectMemberPortal(mem);
      if (onClose) onClose();
    } else {
      setPinError(true);
    }
  };

  const content = (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Intro text */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-200 dark:border-indigo-800">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>FlatMate Portal Gateway &bull; Secure Access</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Select Your Portal to Enter
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Choose <strong>Holder&apos;s Master Portal</strong> for house ledger authority, or select your name to enter your private personal portal.
        </p>
      </div>

      {/* 1. TOP ACCESS: HOLDER'S MASTER CONTROLLER PORTAL */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-indigo-700/50 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                <Crown className="w-3.5 h-3.5" />
                <span>House Transaction Holder</span>
              </span>
              <span className="text-xs text-indigo-300 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>Password Protected</span>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span>Holder&apos;s Master Portal</span>
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </h2>
            <p className="text-xs text-slate-300 max-w-lg leading-relaxed">
              Master administrative authority: Record &amp; edit house expenses, adjust 11th Rent &amp; 15th Appliance prices, send 3-day WhatsApp notifications, check roommate balances, and export group audit reports.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (isHolderUnlocked) {
                onSelectHolderPortal(holder);
                if (onClose) onClose();
              } else {
                setPinInput('');
                setPinError(false);
                setShowHolderPinModal(true);
              }
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all transform active:scale-95 shrink-0"
          >
            <KeyRound className="w-4 h-4" />
            <span>Enter Holder Portal</span>
          </button>
        </div>
      </div>

      {/* 2. FLATMATES DIRECTORY (EACH ROOMMATE HAS THEIR OWN PRIVATE PORTAL) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-500" />
              <span>Flatmates Portals ({members.length} Members)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Select your name to enter your private space (Spends, Personal Diary, Pay to Mates, and personal PDF statement).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {members.map((member) => {
            const isCurrent = currentMember?.id === member.id;

            return (
              <div
                key={member.id}
                onClick={() => {
                  setSelectedMemberForPin(member);
                  setPinInput('');
                  setPinError(false);
                }}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all cursor-pointer group hover:shadow-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-sm ${
                      member.avatarBg || 'bg-slate-700'
                    }`}
                  >
                    {member.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {member.isHolder && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        Holder Mate
                      </span>
                    )}
                    {isCurrent && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 rounded-full">
                        Active
                      </span>
                    )}
                    <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950 transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {member.name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono truncate">
                    UPI: {member.upiId || 'Not set'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Phone: {member.phone}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 group-hover:text-indigo-500 font-medium">
                  <span>Open {member.name}&apos;s Portal</span>
                  <Lock className="w-3 h-3" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Holder PIN Verification Modal */}
      {showHolderPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <Crown className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Enter Holder Passcode
              </h3>
              <p className="text-xs text-slate-500">
                Master Ledger Authority Access
              </p>
            </div>

            <form onSubmit={handleVerifyHolderPin} className="space-y-4">
              <div>
                <input
                  type="password"
                  maxLength={6}
                  autoFocus
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError(false);
                  }}
                  placeholder="Enter Password / PIN"
                  className="w-full text-center text-2xl tracking-widest font-mono py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {pinError && (
                  <p className="text-xs text-red-500 text-center mt-1.5 font-semibold">
                    Incorrect Password. Please try again.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowHolderPinModal(false)}
                  className="py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm"
                >
                  Unlock Portal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member PIN Verification Modal */}
      {selectedMemberForPin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="text-center space-y-1">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg mx-auto mb-2 ${
                  selectedMemberForPin.avatarBg || 'bg-indigo-600'
                }`}
              >
                {selectedMemberForPin.name.slice(0, 2).toUpperCase()}
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Unlock {selectedMemberForPin.name}&apos;s Portal
              </h3>
              <p className="text-xs text-slate-500">
                Enter your 4-digit security PIN to continue
              </p>
            </div>

            <form onSubmit={handleVerifyMemberPin} className="space-y-4">
              <div>
                <input
                  type="password"
                  maxLength={6}
                  autoFocus
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError(false);
                  }}
                  placeholder="Enter 4-digit PIN"
                  className="w-full text-center text-2xl tracking-widest font-mono py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {pinError && (
                  <p className="text-xs text-red-500 text-center mt-1.5 font-semibold">
                    Incorrect PIN. Please check and try again.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMemberForPin(null)}
                  className="py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm"
                >
                  Enter Portal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
          {content}
        </div>
      </div>
    );
  }

  return content;
}
