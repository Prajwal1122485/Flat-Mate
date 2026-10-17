'use client';

import React, { useState, useEffect } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Users,
  Loader2,
} from 'lucide-react';
import { Member } from '@/types';

interface ProfileSelectorProps {
  members: Member[];
  onSelectMemberPortal: (member: Member) => void;
  onSelectHolderPortal?: (holder: Member) => void;
  onOpenHolderPortal?: () => void;
  currentMember?: Member;
  onClose?: () => void;
  isModal?: boolean;
  isHolderUnlocked?: boolean;
  holderPasscode?: string;
  firebaseStatus?: 'connected' | 'connecting' | 'error' | 'unconfigured';
}

export default function ProfileSelector({
  members,
  onSelectMemberPortal,
  onOpenHolderPortal,
  onClose,
  firebaseStatus = 'connected',
}: ProfileSelectorProps) {
  // Only flatmates (Holder is accessed exclusively via the top Holder icon in the Header)
  const mates = members.filter((m) => !m.isHolder);

  const [selectedTarget, setSelectedTarget] = useState<string>(mates[0]?.id || '');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Fast 1-Second Login State with Circular Loading
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authenticatedUser, setAuthenticatedUser] = useState<{
    name: string;
    isHolder: boolean;
    member?: Member;
  } | null>(null);

  // Directory view toggle
  const [showDirectoryGrid, setShowDirectoryGrid] = useState<boolean>(false);

  // Get currently selected roommate object
  const activeSelectedMember =
    mates.find((m) => m.id === selectedTarget) || mates[0];

  // Exactly 1.0-second redirect animation
  useEffect(() => {
    if (!isAuthenticating || !authenticatedUser) return;

    const exitTimer = setTimeout(() => {
      if (authenticatedUser.member) {
        onSelectMemberPortal(authenticatedUser.member);
      }
      if (onClose) onClose();
    }, 1000);

    return () => {
      clearTimeout(exitTimer);
    };
  }, [isAuthenticating, authenticatedUser, onSelectMemberPortal, onClose]);

  // Handle Login Submission
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasError(false);
    setErrorMessage('');

    if (!activeSelectedMember) return;

    const memberExpectedPasscode = (activeSelectedMember.passcode || '1234').trim();
    if (passwordInput.trim() === memberExpectedPasscode) {
      setAuthenticatedUser({
        name: activeSelectedMember.name,
        isHolder: false,
        member: activeSelectedMember,
      });
      setIsAuthenticating(true);
    } else {
      setHasError(true);
      setErrorMessage(`Incorrect password for ${activeSelectedMember.name}. Please try again.`);
    }
  };

  return (
    <div className="relative min-h-[82vh] flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none">
      {/* ================= CLEAN PROFESSIONAL BACKGROUND ================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-[400px] h-[300px] bg-slate-800/20 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* ================= CENTRAL CREDENTIALS CARD ================= */}
      <div className="relative z-10 w-full max-w-md">
        {/* ================= STATE A: 2-SECOND WELCOME SCREEN ================= */}
        {isAuthenticating && authenticatedUser ? (
          <div className="p-8 sm:p-10 rounded-3xl bg-slate-900/95 border border-slate-800 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200">
            {/* Clean Avatar */}
            <div className="mx-auto w-20 h-20">
              <div
                className={`w-20 h-20 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg border border-white/10 ${
                  authenticatedUser.member?.avatarBg || 'bg-indigo-600'
                }`}
              >
                {authenticatedUser.name.slice(0, 2).toUpperCase()}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold">
                <span>Flat-Mate</span>
                <span>&bull;</span>
                <span>Roommate Portal</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Welcome, {authenticatedUser.name}
              </h2>
              <p className="text-xs text-slate-400">
                Opening Personal Register &amp; Debts...
              </p>
            </div>

            {/* Circular Loading Animation & Redirecting */}
            <div className="py-5 space-y-3 flex flex-col items-center justify-center">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
              </div>
              <div className="space-y-1 text-center">
                <p className="text-base font-extrabold text-white tracking-wide animate-pulse">
                  Redirecting...
                </p>
                <p className="text-xs text-slate-400">
                  Opening Personal Register &amp; Ledger
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* ================= STATE B: MAIN LOGIN CARD ================= */
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 shadow-2xl space-y-6">
            {/* Top House Hero with Gentle Realistic Float Animation */}
            <div className="text-center space-y-3">
              <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-3xl overflow-hidden bg-slate-800/80 border border-slate-700/80 shadow-xl p-2 flex items-center justify-center">
                <img
                  src="/images/house-illustration.jpg"
                  alt="Flat-Mate House"
                  className="w-full h-full object-contain animate-smooth-float select-none pointer-events-none"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://img.magnific.com/free-vector/house-home-building-cartoon-vector-icon-illustration-building-landmark-icon-isolated-flat_138676-15023.jpg?semt=ais_hybrid&w=740&q=80';
                  }}
                />
              </div>

              <div>
                <div className="flex items-center justify-center gap-2 flex-wrap mb-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-semibold border border-slate-700">
                    <span>Flat-Mate</span>
                    <span>&bull;</span>
                    <span>Expense Register</span>
                  </div>
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-sm transition-all ${
                      firebaseStatus === 'connected'
                        ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                        : firebaseStatus === 'connecting'
                        ? 'bg-amber-950/70 border-amber-500/40 text-amber-300'
                        : 'bg-rose-950/70 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        firebaseStatus === 'connected'
                          ? 'bg-emerald-400 animate-pulse'
                          : firebaseStatus === 'connecting'
                          ? 'bg-amber-400 animate-ping'
                          : 'bg-rose-400'
                      }`}
                    />
                    <span>
                      {firebaseStatus === 'connected'
                        ? 'Firebase Live'
                        : firebaseStatus === 'connecting'
                        ? 'Connecting Cloud...'
                        : 'Offline DB'}
                    </span>
                  </div>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Flat-Mate
                </h1>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                  Select your profile and enter your password to continue.
                </p>
              </div>
            </div>

            {/* Login Form */}
            {mates.length === 0 ? (
              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 text-center space-y-3">
                <Users className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-white">No flatmates registered yet</p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Access the Holder Portal using the top &quot;Holder&quot; button in the header bar to add roommates and manage house expenses.
                </p>
              </div>
            ) : (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Profile Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Select Profile</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {mates.length} Roommate{mates.length > 1 ? 's' : ''}
                    </span>
                  </label>

                  <div className="relative">
                    <select
                      value={selectedTarget}
                      onChange={(e) => {
                        setSelectedTarget(e.target.value);
                        setPasswordInput('');
                        setHasError(false);
                      }}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
                    >
                      {mates.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>

                    <div className="absolute right-4 top-3.5 pointer-events-none text-slate-400 text-xs">
                      ▼
                    </div>
                  </div>
                </div>

                {/* Active Profile Info */}
                {activeSelectedMember && (
                  <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md ${
                          activeSelectedMember.avatarBg || 'bg-indigo-600'
                        }`}
                      >
                        {activeSelectedMember.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">
                            {activeSelectedMember.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">
                          UPI: {activeSelectedMember.upiId || 'Not set'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 block">
                        Security
                      </span>
                      <span className="text-[10px] text-emerald-400 font-semibold">
                        Protected
                      </span>
                    </div>
                  </div>
                )}

                {/* Password Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Password
                  </label>

                  <div className="relative">
                    <div className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoFocus
                      placeholder="••••"
                      value={passwordInput}
                      onChange={(e) => {
                        setPasswordInput(e.target.value);
                        setHasError(false);
                      }}
                      className={`w-full pl-10 pr-11 py-3 rounded-2xl bg-slate-800 border text-white font-mono text-center tracking-widest text-lg focus:outline-none focus:ring-2 transition-all ${
                        hasError
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-slate-700 focus:ring-indigo-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {hasError && (
                    <p className="text-xs text-red-400 text-center font-medium mt-1.5">
                      {errorMessage}
                    </p>
                  )}
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all transform active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>Enter Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* Quick Profile Directory Toggle */}
            {mates.length > 0 && (
              <>
                <div className="pt-2 border-t border-slate-800 text-center">
                  <button
                    type="button"
                    onClick={() => setShowDirectoryGrid(!showDirectoryGrid)}
                    className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1.5"
                  >
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{showDirectoryGrid ? 'Hide Profiles' : 'View All Roommate Profiles'}</span>
                  </button>
                </div>

                {/* Flatmate Quick Directory */}
                {showDirectoryGrid && (
                  <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in duration-150">
                    {mates.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedTarget(m.id);
                          setPasswordInput('');
                          setShowDirectoryGrid(false);
                        }}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                          selectedTarget === m.id
                            ? 'border-indigo-500 bg-indigo-500/10 text-white'
                            : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold ${
                            m.avatarBg || 'bg-slate-700'
                          }`}
                        >
                          {m.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-bold truncate">{m.name}</div>
                          <div className="text-[10px] text-slate-400">{m.phone}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Bottom Actions: Secure Holder Access */}
            {onOpenHolderPortal && (
              <div className="pt-3 border-t border-slate-800 text-center">
                <button
                  type="button"
                  onClick={onOpenHolderPortal}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all font-bold inline-flex items-center gap-1.5 text-xs"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Holder Master Vault</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
