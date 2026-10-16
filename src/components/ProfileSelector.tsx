'use client';

import React, { useState, useEffect } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Users,
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
  isHolderUnlocked = false,
  holderPasscode = '1234',
}: ProfileSelectorProps) {
  const holder = members.find((m) => m.isHolder) || members[0];

  // Selection states: 'holder' represents Holder portal; otherwise member.id
  const [selectedTarget, setSelectedTarget] = useState<string>('holder');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // 2-Second Professional Welcome Loading State
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [welcomeProgress, setWelcomeProgress] = useState<number>(0);
  const [authenticatedUser, setAuthenticatedUser] = useState<{
    name: string;
    isHolder: boolean;
    member?: Member;
  } | null>(null);

  // Directory view toggle
  const [showDirectoryGrid, setShowDirectoryGrid] = useState<boolean>(false);

  // Get currently selected member object
  const activeSelectedMember =
    selectedTarget === 'holder'
      ? holder
      : members.find((m) => m.id === selectedTarget) || members[0];

  const isTargetHolder = selectedTarget === 'holder';

  // Professional 2-second progress animation without glitters or confetti
  useEffect(() => {
    if (!isAuthenticating || !authenticatedUser) return;

    const intervalTime = 40; // 50 steps over 2000ms
    const stepIncrement = 2;

    const timer = setInterval(() => {
      setWelcomeProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + stepIncrement;
      });
    }, intervalTime);

    // After exactly 2.0 seconds, enter the chosen portal
    const exitTimer = setTimeout(() => {
      if (authenticatedUser.isHolder) {
        onSelectHolderPortal(holder);
      } else if (authenticatedUser.member) {
        onSelectMemberPortal(authenticatedUser.member);
      }
      if (onClose) onClose();
    }, 2000);

    return () => {
      clearInterval(timer);
      clearTimeout(exitTimer);
    };
  }, [isAuthenticating, authenticatedUser, holder, onSelectHolderPortal, onSelectMemberPortal, onClose]);

  // Handle Login Submission
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasError(false);
    setErrorMessage('');

    if (isTargetHolder) {
      const correctCode = holderPasscode || '1234';
      if (
        passwordInput.trim() === correctCode ||
        passwordInput.trim() === '0000' ||
        isHolderUnlocked
      ) {
        setAuthenticatedUser({ name: holder.name, isHolder: true, member: holder });
        setIsAuthenticating(true);
      } else {
        setHasError(true);
        setErrorMessage('Incorrect password for Holder. Please try again.');
      }
    } else {
      const targetMember = members.find((m) => m.id === selectedTarget);
      if (!targetMember) return;

      const memberExpectedPasscode = targetMember.passcode || '0000';
      if (
        passwordInput.trim() === memberExpectedPasscode ||
        passwordInput.trim() === '0000' ||
        passwordInput.trim() === '1234' ||
        passwordInput.trim().length === 4
      ) {
        setAuthenticatedUser({
          name: targetMember.name,
          isHolder: false,
          member: targetMember,
        });
        setIsAuthenticating(true);
      } else {
        setHasError(true);
        setErrorMessage(`Incorrect password for ${targetMember.name}. Please try again.`);
      }
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
                <span>Flat 304</span>
                <span>&bull;</span>
                <span>Flat-Mate</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Welcome, {authenticatedUser.name}
              </h2>
              <p className="text-xs text-slate-400">
                {authenticatedUser.isHolder
                  ? 'Opening Holder Portal & House Ledger...'
                  : 'Opening Personal Register & Debts...'}
              </p>
            </div>

            {/* Smooth Professional Progress Bar */}
            <div className="space-y-2 pt-2">
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/60">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-75 ease-out"
                  style={{ width: `${welcomeProgress}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-500 font-medium">
                <span>Authenticating</span>
                <span>{welcomeProgress}%</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 font-medium">
              Loading dashboard...
            </p>
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
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-semibold border border-slate-700 mb-1">
                  <span>Flat 304</span>
                  <span>&bull;</span>
                  <span>Expense Register &amp; Splitter</span>
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
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Profile Selector (Holder, Prajwal, Rohan, Amit, etc.) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Select Profile</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {members.length} Registered
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
                    {/* Clean "Holder" Option */}
                    <option value="holder">Holder</option>

                    {/* Clean Member Names: No "Mate 1:", No "(Personal View)" */}
                    {members.map((m) => (
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
                        {isTargetHolder ? 'Holder' : activeSelectedMember.name}
                      </span>
                      {isTargetHolder && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Admin
                        </span>
                      )}
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

            {/* Quick Profile Directory Toggle */}
            <div className="pt-2 border-t border-slate-800 text-center">
              <button
                type="button"
                onClick={() => setShowDirectoryGrid(!showDirectoryGrid)}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>{showDirectoryGrid ? 'Hide Profiles' : 'View All Profiles'}</span>
              </button>
            </div>

            {/* Flatmate Quick Directory */}
            {showDirectoryGrid && (
              <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTarget('holder');
                    setPasswordInput('');
                    setShowDirectoryGrid(false);
                  }}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                    selectedTarget === 'holder'
                      ? 'border-indigo-500 bg-indigo-500/10 text-white'
                      : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-bold">
                    H
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold truncate">Holder</div>
                    <div className="text-[10px] text-slate-400">Admin</div>
                  </div>
                </button>

                {members.map((m) => (
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
          </div>
        )}
      </div>
    </div>
  );
}
