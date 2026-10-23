'use client';

import React, { useState, useEffect } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  Mail,
  Sparkles,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';
import { Member } from '@/types';
import {
  loginWithEmail,
  signupWithEmail,
  saveLocalSession,
  getFriendlyAuthErrorMessage,
} from '@/lib/firebaseAuth';

interface ProfileSelectorProps {
  members: Member[];
  onSelectMemberPortal: (member: Member) => void;
  onSelectHolderPortal?: (holder: Member) => void;
  onOpenHolderPortal?: () => void;
  onLinkMemberEmail?: (memberId: string, email: string) => void;
  currentMember?: Member;
  onClose?: () => void;
  firebaseStatus?: 'connected' | 'connecting' | 'error' | 'unconfigured';
}

export default function ProfileSelector({
  members,
  onSelectMemberPortal,
  onSelectHolderPortal,
  onOpenHolderPortal,
  onLinkMemberEmail,
  onClose,
  firebaseStatus = 'connected',
}: ProfileSelectorProps) {
  // All flatmates plus Holder
  const holderMember = members.find((m) => m.isHolder) || members[0];
  const mates = members.filter((m) => !m.isHolder);

  // Auth Modes: 'email' (primary like Gmail/YouTube) vs 'pin' (fallback)
  const [authMethod, setAuthMethod] = useState<'email' | 'pin'>('email');
  const [isSignUpTab, setIsSignUpTab] = useState<boolean>(false);

  // Email Auth State
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    mates[0]?.id || holderMember?.id || ''
  );
  const [stayLoggedIn, setStayLoggedIn] = useState<boolean>(true);

  // PIN Fallback State
  const [pinTargetId, setPinTargetId] = useState<string>(mates[0]?.id || '');
  const [pinInput, setPinInput] = useState<string>('');

  // Status & Redirect State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authenticatedUser, setAuthenticatedUser] = useState<{
    name: string;
    isHolder: boolean;
    member?: Member;
    email?: string;
  } | null>(null);

  // Selected member object for Email linking
  const activeSelectedMember =
    members.find((m) => m.id === selectedMemberId) || mates[0] || holderMember;

  // Selected member for PIN fallback
  const activePinMember =
    mates.find((m) => m.id === pinTargetId) || mates[0];

  // 1-Second redirect animation once authenticated
  useEffect(() => {
    if (!isAuthenticating || !authenticatedUser) return;

    const exitTimer = setTimeout(() => {
      if (authenticatedUser.isHolder) {
        if (onSelectHolderPortal && authenticatedUser.member) {
          onSelectHolderPortal(authenticatedUser.member);
        } else if (onOpenHolderPortal) {
          onOpenHolderPortal();
        }
      } else if (authenticatedUser.member) {
        onSelectMemberPortal(authenticatedUser.member);
      }
      if (onClose) onClose();
    }, 1000);

    return () => {
      clearTimeout(exitTimer);
    };
  }, [isAuthenticating, authenticatedUser, onSelectMemberPortal, onSelectHolderPortal, onOpenHolderPortal, onClose]);

  // Handle Firebase Email Login / Sign Up
  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasError(false);
    setErrorMessage('');

    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    if (!cleanEmail || !cleanPass) {
      setHasError(true);
      setErrorMessage('Please provide both your email address and password.');
      return;
    }

    if (cleanPass.length < 6) {
      setHasError(true);
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUpTab) {
        // Create new Firebase account
        await signupWithEmail(cleanEmail, cleanPass);
      } else {
        // Sign in with existing Firebase account
        await loginWithEmail(cleanEmail, cleanPass);
      }

      // Link member profile to this email
      if (onLinkMemberEmail && activeSelectedMember) {
        onLinkMemberEmail(activeSelectedMember.id, cleanEmail);
      }

      // Save persistent session in LocalStorage (like Gmail / YouTube)
      if (stayLoggedIn && activeSelectedMember) {
        saveLocalSession(activeSelectedMember.id, cleanEmail);
      }

      setAuthenticatedUser({
        name: activeSelectedMember.name,
        isHolder: activeSelectedMember.isHolder,
        member: activeSelectedMember,
        email: cleanEmail,
      });
      setIsAuthenticating(true);
    } catch (err: any) {
      console.error('Firebase Auth Error:', err);
      const friendly = getFriendlyAuthErrorMessage(err?.code || '');
      setHasError(true);
      setErrorMessage(friendly);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle PIN fallback
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasError(false);
    setErrorMessage('');

    if (!activePinMember) return;

    const expected = (activePinMember.passcode || '1234').trim();
    if (pinInput.trim() === expected) {
      if (stayLoggedIn) {
        saveLocalSession(activePinMember.id, activePinMember.email || `${activePinMember.name.toLowerCase()}@flatmate.local`);
      }
      setAuthenticatedUser({
        name: activePinMember.name,
        isHolder: false,
        member: activePinMember,
      });
      setIsAuthenticating(true);
    } else {
      setHasError(true);
      setErrorMessage(`Incorrect PIN for ${activePinMember.name}. Please try again.`);
    }
  };

  return (
    <div className="relative min-h-[82vh] flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-[400px] h-[300px] bg-slate-800/20 rounded-full blur-2xl pointer-events-none" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* ================= STATE A: WELCOME ANIMATION SCREEN ================= */}
        {isAuthenticating && authenticatedUser ? (
          <div className="p-8 sm:p-10 rounded-3xl bg-slate-900/95 border border-slate-800 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200">
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
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Session Saved &bull; Stay Logged In</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Welcome, {authenticatedUser.name}
              </h2>
              <p className="text-xs text-slate-400">
                Opening {authenticatedUser.isHolder ? 'Holder Master Vault' : 'Personal Flatmate Portal'}...
              </p>
            </div>

            <div className="py-4 space-y-2 flex flex-col items-center justify-center">
              <div className="relative w-10 h-10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
              <p className="text-xs font-bold text-slate-400">
                You won&apos;t be asked for a password again on this device.
              </p>
            </div>
          </div>
        ) : (
          /* ================= STATE B: MAIN AUTHENTICATION CARD ================= */
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 shadow-2xl space-y-5">
            {/* Header with App Logo & Cloud Live Badge */}
            <div className="text-center space-y-2.5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-3xl overflow-hidden bg-slate-800/80 border border-slate-700/80 shadow-xl p-2 flex items-center justify-center">
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
                    <span>Firebase Auth</span>
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
                        : 'Offline Mode'}
                    </span>
                  </div>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Flat-Mate Portal
                </h1>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                  Sign in once with Email. Saved permanently like Gmail &amp; YouTube.
                </p>
              </div>
            </div>

            {/* TAB TOGGLE: Email Sign In vs PIN Fallback */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-800 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('email');
                  setHasError(false);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  authMethod === 'email'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email ID (Permanent)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('pin');
                  setHasError(false);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  authMethod === 'pin'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Roommate PIN</span>
              </button>
            </div>

            {/* ================= METHOD 1: FIREBASE EMAIL AUTH ================= */}
            {authMethod === 'email' && (
              <form onSubmit={handleEmailAuthSubmit} className="space-y-3.5">
                {/* Sign In vs Sign Up Toggle */}
                <div className="flex items-center justify-between text-xs font-bold px-1">
                  <span className="text-slate-300">
                    {isSignUpTab ? 'Create New Flatmate Account' : 'Sign In to Your Account'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUpTab(!isSignUpTab);
                      setHasError(false);
                    }}
                    className="text-indigo-400 hover:text-indigo-300 underline"
                  >
                    {isSignUpTab ? 'Already have account? Sign In' : 'New here? Create Account'}
                  </button>
                </div>

                {/* Flatmate Profile Linker */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>1. Which Flatmate Are You?</span>
                  </label>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.isHolder ? '(Holder / Admin)' : '(Roommate)'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    2. Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. prajwal@gmail.com"
                      value={emailInput}
                      onChange={(e) => {
                        setEmailInput(e.target.value);
                        setHasError(false);
                      }}
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-800 border border-slate-700 text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    3. Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={passwordInput}
                      onChange={(e) => {
                        setPasswordInput(e.target.value);
                        setHasError(false);
                      }}
                      className="w-full pl-10 pr-11 py-2.5 text-sm bg-slate-800 border border-slate-700 text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-2.5 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Stay Logged In Checkbox (Like Gmail / YouTube) */}
                <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={stayLoggedIn}
                    onChange={(e) => setStayLoggedIn(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-xs text-slate-300 font-medium">
                    Remember me on this phone/device (Don&apos;t ask again)
                  </span>
                </label>

                {hasError && (
                  <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs text-center font-medium">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all transform active:scale-95 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating with Firebase...</span>
                    </>
                  ) : (
                    <>
                      <span>{isSignUpTab ? 'Create Account & Stay Logged In' : 'Sign In & Enter Portal'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ================= METHOD 2: PIN FALLBACK ================= */}
            {authMethod === 'pin' && (
              <form onSubmit={handlePinSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Select Profile</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {mates.length} Roommates
                    </span>
                  </label>

                  <select
                    value={pinTargetId}
                    onChange={(e) => {
                      setPinTargetId(e.target.value);
                      setPinInput('');
                      setHasError(false);
                    }}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {mates.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Roommate 4-Digit PIN
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="password"
                      required
                      placeholder="••••"
                      value={pinInput}
                      onChange={(e) => {
                        setPinInput(e.target.value);
                        setHasError(false);
                      }}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-white font-mono text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {hasError && (
                  <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs text-center font-medium">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <span>Enter with PIN</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* Bottom: Holder Access */}
            {onOpenHolderPortal && (
              <div className="pt-3 border-t border-slate-800 text-center">
                <button
                  type="button"
                  onClick={onOpenHolderPortal}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all font-bold inline-flex items-center gap-1.5 text-xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Holder Master Portal</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
