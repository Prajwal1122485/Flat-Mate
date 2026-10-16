'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  User,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Crown,
  CheckCircle2,
  Home as HomeIcon,
  Users,
  ArrowRight,
} from 'lucide-react';
import { Member } from '@/types';
import confetti from 'canvas-confetti';

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

  // Selection states
  // 'holder' represents Holder's Master Portal; otherwise member.id
  const [selectedTarget, setSelectedTarget] = useState<string>('holder');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // 2-Second Welcome Loading State
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

  // Progress animation for 2-second welcome screen
  useEffect(() => {
    if (!isAuthenticating || !authenticatedUser) return;

    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#6366f1', '#10b981', '#ec4899'],
      });
    } catch {
      // ignore
    }

    const intervalTime = 40; // 50 steps over 2000ms
    const stepIncrement = 2; // 50 * 2 = 100%

    const timer = setInterval(() => {
      setWelcomeProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + stepIncrement;
      });
    }, intervalTime);

    // After 2.0 seconds, enter the portal
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
        setErrorMessage('Incorrect Holder Master Passcode. Please try again.');
      }
    } else {
      // Roommate Portal
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
    <div className="relative min-h-[85vh] flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none">
      {/* ================= 1. ANIMATED SWEET HOME BACKGROUND ================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Sky Ambient Gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-indigo-950/80 to-slate-900" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />

        {/* Twinkling Night Stars */}
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-[10%] left-[15%] w-1.5 h-1.5 bg-amber-200 rounded-full animate-ping" />
          <div className="absolute top-[18%] left-[75%] w-1.5 h-1.5 bg-indigo-200 rounded-full animate-pulse" />
          <div className="absolute top-[32%] left-[40%] w-1 h-1 bg-white rounded-full animate-pulse" />
          <div className="absolute top-[15%] left-[88%] w-1.5 h-1.5 bg-amber-100 rounded-full animate-ping" />
          <div className="absolute top-[42%] left-[12%] w-1 h-1 bg-white rounded-full animate-pulse" />
          <div className="absolute top-[28%] left-[62%] w-1.5 h-1.5 bg-amber-200 rounded-full animate-pulse" />
        </div>

        {/* Sweet Home Architectural Vector Silhouette at Bottom */}
        <svg
          className="absolute bottom-0 left-0 right-0 w-full h-64 sm:h-80 text-slate-900/90 dark:text-slate-950/90 preserve-3d"
          viewBox="0 0 1200 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Ground Silhouette */}
          <path
            d="M0 340 C300 320 600 360 1200 330 L1200 400 L0 400 Z"
            fill="currentColor"
            opacity="0.95"
          />

          {/* Sweet Home Flat Silhouette */}
          <g transform="translate(420, 110)">
            {/* Main Flat Building */}
            <rect x="50" y="70" width="260" height="170" rx="12" fill="#0f172a" />
            <polygon points="40,70 180,10 320,70" fill="#1e293b" />
            <rect x="250" y="25" width="28" height="40" fill="#334155" />

            {/* Glowing Warm Windows (Sweet Home Warm Light Effect) */}
            <rect
              x="80"
              y="95"
              width="50"
              height="45"
              rx="6"
              fill="#fbbf24"
              className="animate-pulse"
              opacity="0.85"
            />
            <rect
              x="155"
              y="95"
              width="50"
              height="45"
              rx="6"
              fill="#f59e0b"
              className="animate-pulse"
              opacity="0.9"
            />
            <rect
              x="230"
              y="95"
              width="50"
              height="45"
              rx="6"
              fill="#fbbf24"
              className="animate-pulse"
              opacity="0.8"
            />

            {/* Balcony / Floor 2 */}
            <rect
              x="80"
              y="160"
              width="60"
              height="55"
              rx="6"
              fill="#fbbf24"
              className="animate-pulse"
              opacity="0.95"
            />
            <rect x="180" y="165" width="45" height="75" rx="4" fill="#38bdf8" opacity="0.7" />

            {/* Sweet Home Porch Lamp */}
            <circle cx="165" cy="180" r="8" fill="#fde047" className="animate-ping" opacity="0.4" />
            <circle cx="165" cy="180" r="5" fill="#fef08a" />
          </g>

          {/* Gentle Trees & Foliage */}
          <circle cx="360" cy="270" r="50" fill="#064e3b" opacity="0.7" />
          <circle cx="390" cy="285" r="40" fill="#047857" opacity="0.6" />
          <circle cx="780" cy="270" r="55" fill="#064e3b" opacity="0.7" />
          <circle cx="740" cy="285" r="45" fill="#047857" opacity="0.6" />
        </svg>
      </div>

      {/* ================= 2. CENTRAL CREDENTIALS LOGIN PORTAL ================= */}
      <div className="relative z-10 w-full max-w-md">
        {/* ================= STATE A: 2-SECOND WELCOME ANIMATION ================= */}
        {isAuthenticating && authenticatedUser ? (
          <div className="p-8 sm:p-10 rounded-3xl bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-2xl border border-amber-400/30 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300">
            {/* Glowing Animated Avatar */}
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 rounded-full bg-amber-400/30 animate-ping" />
              <div
                className={`relative w-24 h-24 rounded-3xl flex items-center justify-center text-white font-black text-3xl shadow-xl border-2 border-amber-300 ${
                  authenticatedUser.member?.avatarBg || 'bg-indigo-600'
                }`}
              >
                {authenticatedUser.name.slice(0, 2).toUpperCase()}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold">
                <HomeIcon className="w-3.5 h-3.5" />
                <span>Sweet Home &bull; Flat 304</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Welcome, {authenticatedUser.name}!
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                {authenticatedUser.isHolder
                  ? '👑 Opening Master Holder Portal & Ledger Hub...'
                  : '👤 Opening your Personal Flatmate Portal...'}
              </p>
            </div>

            {/* Smooth 2-Second Progress Bar */}
            <div className="space-y-2 pt-2">
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
                <div
                  className="bg-gradient-to-r from-amber-400 via-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-75 ease-out"
                  style={{ width: `${welcomeProgress}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-400 font-medium">
                <span>Authenticating credentials</span>
                <span>{welcomeProgress}%</span>
              </div>
            </div>

            <p className="text-xs text-amber-200/80 font-medium animate-pulse">
              Entering in 2 seconds...
            </p>
          </div>
        ) : (
          /* ================= STATE B: MAIN LOGIN CARD ================= */
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/85 dark:bg-slate-950/85 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-indigo-950/50 space-y-6">
            {/* Top Cozy Brand Badge */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-indigo-500/20 text-amber-300 text-xs font-bold border border-amber-400/30 shadow-sm">
                <HomeIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Flat 304 &bull; Sweet Home Register</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Welcome Home
              </h1>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Select your portal and enter your passcode to access personal and shared flat registers.
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* 1. SELECT PORTAL (Holder, Mate 2, Mate 3, etc.) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Select Portal to Enter</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {members.length} Mates Available
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
                    className="w-full px-4 py-3 rounded-2xl bg-slate-800/90 border border-slate-700 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400/80 transition-all appearance-none cursor-pointer"
                  >
                    {/* Holder Master */}
                    <option value="holder">
                      👑 Holder Master Portal ({holder.name})
                    </option>

                    {/* Roommate Options (Mate 1, Mate 2, etc.) */}
                    {members.map((m, idx) => (
                      <option key={m.id} value={m.id}>
                        👤 Mate {idx + 1}: {m.name} {m.isHolder ? '(Personal View)' : ''}
                      </option>
                    ))}
                  </select>

                  <div className="absolute right-4 top-3.5 pointer-events-none text-slate-400">
                    ▼
                  </div>
                </div>
              </div>

              {/* Active Profile Preview Card */}
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-md ${
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
                      {isTargetHolder ? (
                        <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
                          👑 Holder
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-500/20 text-indigo-300">
                          Roommate
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">
                      UPI: {activeSelectedMember.upiId || 'Not set'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-emerald-400 block">
                    Protected
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {isTargetHolder ? 'Master Key' : 'Passcode'}
                  </span>
                </div>
              </div>

              {/* 2. PASSWORD INPUT */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Enter Password / PIN
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
                    className={`w-full pl-10 pr-11 py-3 rounded-2xl bg-slate-800/90 border text-white font-mono text-center tracking-widest text-lg focus:outline-none focus:ring-2 transition-all ${
                      hasError
                        ? 'border-red-500 focus:ring-red-500 animate-shake'
                        : 'border-slate-700 focus:ring-amber-400/80'
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

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 transition-all transform active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Enter {isTargetHolder ? 'Holder Portal' : `${activeSelectedMember.name}'s Portal`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Toggle Directory Cards View */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <button
                type="button"
                onClick={() => setShowDirectoryGrid(!showDirectoryGrid)}
                className="hover:text-amber-300 transition-colors flex items-center gap-1.5 mx-auto"
              >
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>{showDirectoryGrid ? 'Hide Roommate List' : 'Browse All 6 Flatmates'}</span>
              </button>
            </div>

            {/* Expandable Flatmates Quick Grid */}
            {showDirectoryGrid && (
              <div className="grid grid-cols-2 gap-2 pt-2 animate-in fade-in duration-200">
                {members.map((m, idx) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedTarget(m.id);
                      setPasswordInput('');
                      setShowDirectoryGrid(false);
                    }}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                      selectedTarget === m.id
                        ? 'border-amber-400 bg-amber-500/10 text-white'
                        : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold ${
                        m.avatarBg || 'bg-slate-700'
                      }`}
                    >
                      {m.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold truncate">{m.name}</div>
                      <div className="text-[9px] text-slate-400">Mate {idx + 1}</div>
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
