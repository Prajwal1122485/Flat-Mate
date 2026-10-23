'use client';

import React, { useState, useEffect } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  Mail,
  User,
  Sparkles,
  CheckCircle2,
  AlertCircle,
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
  onSelectHolderPortal: (holder: Member) => void;
  onLinkMemberEmail: (memberId: string, email: string) => void;
  onAddNewMember?: (newMember: Member) => void;
  firebaseStatus?: 'connected' | 'connecting' | 'error' | 'unconfigured';
}

export default function ProfileSelector({
  members,
  onSelectMemberPortal,
  onSelectHolderPortal,
  onLinkMemberEmail,
  onAddNewMember,
  firebaseStatus = 'connected',
}: ProfileSelectorProps) {
  const holderMember = members.find((m) => m.isHolder) || members[0];

  // Auth Mode: 'signin' vs 'signup'
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  // Input states
  const [nameInput, setNameInput] = useState<string>('');
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [stayLoggedIn, setStayLoggedIn] = useState<boolean>(true);

  // Status & Feedback
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Successful login/signup splash screen
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authenticatedUser, setAuthenticatedUser] = useState<{
    name: string;
    isHolder: boolean;
    member: Member;
    email: string;
  } | null>(null);

  // Smooth 1-second transition into their personal portal once authenticated
  useEffect(() => {
    if (!isAuthenticating || !authenticatedUser) return;

    const timer = setTimeout(() => {
      if (authenticatedUser.isHolder) {
        onSelectHolderPortal(authenticatedUser.member);
      } else {
        onSelectMemberPortal(authenticatedUser.member);
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [isAuthenticating, authenticatedUser, onSelectMemberPortal, onSelectHolderPortal]);

  /**
   * Helper: Matches entered name against existing profiles or creates a new one.
   * If "holder" / "admin" is given -> assigns Holder portal.
   * If an existing roommate's name is given -> assigns that roommate's portal (preserving all data).
   * Otherwise -> creates a new roommate profile.
   */
  const resolveMemberByName = (
    rawName: string,
    email: string
  ): { targetMember: Member; isNew: boolean } => {
    const cleanName = rawName.trim();
    const lower = cleanName.toLowerCase();

    // 1. Check if name indicates Holder
    const isHolderIntent =
      lower === 'holder' ||
      lower.includes('holder') ||
      lower === 'admin' ||
      (holderMember && lower === holderMember.name.toLowerCase());

    if (isHolderIntent && holderMember) {
      return {
        targetMember: { ...holderMember, email },
        isNew: false,
      };
    }

    // 2. Check if name matches an existing roommate (case-insensitive fuzzy or exact match)
    const existingMates = members.filter((m) => !m.isHolder);
    const matchedMate = existingMates.find((m) => {
      const mateLower = m.name.toLowerCase().trim();
      return (
        mateLower === lower ||
        lower.includes(mateLower) ||
        mateLower.includes(lower)
      );
    });

    if (matchedMate) {
      return {
        targetMember: { ...matchedMate, email },
        isNew: false,
      };
    }

    // 3. New roommate registration
    const newMember: Member = {
      id: `mem_${Date.now()}`,
      name: cleanName,
      phone: '',
      upiId: `${lower.replace(/\s+/g, '')}@upi`,
      isHolder: false,
      avatarBg: 'bg-indigo-600',
      email,
    };

    return {
      targetMember: newMember,
      isNew: true,
    };
  };

  /**
   * Handle Form Submission (Sign In or Create Account)
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasError(false);
    setErrorMessage('');

    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanPass = passwordInput.trim();
    const cleanName = nameInput.trim();

    if (!cleanEmail || !cleanPass) {
      setHasError(true);
      setErrorMessage('Please provide both your Email Address and Password.');
      return;
    }

    if (cleanPass.length < 6) {
      setHasError(true);
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'signup') {
      if (!cleanName) {
        setHasError(true);
        setErrorMessage('Please enter your full name so we can assign your portal.');
        return;
      }
      if (cleanPass !== confirmPasswordInput.trim()) {
        setHasError(true);
        setErrorMessage('Passwords do not match. Please re-enter.');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        // 1. Firebase Auth Create Account
        try {
          await signupWithEmail(cleanEmail, cleanPass);
        } catch (authErr: any) {
          // If email is already in use, try logging in with the given password
          if (authErr?.code === 'auth/email-already-in-use') {
            await loginWithEmail(cleanEmail, cleanPass);
          } else {
            throw authErr;
          }
        }

        // 2. Resolve Profile by Name & Assign Portal
        const { targetMember, isNew } = resolveMemberByName(cleanName, cleanEmail);

        if (isNew && onAddNewMember) {
          onAddNewMember(targetMember);
        } else if (onLinkMemberEmail) {
          onLinkMemberEmail(targetMember.id, cleanEmail);
        }

        if (stayLoggedIn) {
          saveLocalSession(
            targetMember.id,
            cleanEmail,
            targetMember.name,
            targetMember.isHolder
          );
        }

        setAuthenticatedUser({
          name: targetMember.name,
          isHolder: targetMember.isHolder,
          member: targetMember,
          email: cleanEmail,
        });
        setIsAuthenticating(true);
      } else {
        // ================= SIGN IN FLOW =================
        await loginWithEmail(cleanEmail, cleanPass);

        // Find member by registered email
        let matched = members.find(
          (m) => m.email && m.email.toLowerCase() === cleanEmail
        );

        // If not found by email yet (first time login without explicit signup link):
        // Match against existing members by email prefix or assign holder if email matches holder
        if (!matched) {
          const emailPrefix = cleanEmail.split('@')[0].toLowerCase();
          if (emailPrefix.includes('holder') || emailPrefix.includes('admin')) {
            matched = holderMember;
          } else {
            matched = members.find(
              (m) =>
                !m.isHolder &&
                m.name.toLowerCase().replace(/\s+/g, '') === emailPrefix
            );
          }
        }

        // Fallback: If still unmatched, use the first non-holder roommate or holder
        const finalMember: Member = matched || members[0] || holderMember;

        if (onLinkMemberEmail && !finalMember.email) {
          onLinkMemberEmail(finalMember.id, cleanEmail);
        }

        if (stayLoggedIn) {
          saveLocalSession(
            finalMember.id,
            cleanEmail,
            finalMember.name,
            finalMember.isHolder
          );
        }

        setAuthenticatedUser({
          name: finalMember.name,
          isHolder: finalMember.isHolder,
          member: finalMember,
          email: cleanEmail,
        });
        setIsAuthenticating(true);
      }
    } catch (err: any) {
      console.error('Firebase Auth Error:', err);
      const friendly = getFriendlyAuthErrorMessage(err?.code || '');
      setHasError(true);
      setErrorMessage(friendly);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-[78vh] flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-[400px] h-[300px] bg-slate-800/20 rounded-full blur-2xl pointer-events-none" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* ================= STATE A: WELCOME DIRECT ENTRY SPLASH ================= */}
        {isAuthenticating && authenticatedUser ? (
          <div className="p-8 sm:p-10 rounded-3xl bg-slate-900/95 border border-slate-800 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200">
            <div className="mx-auto w-20 h-20">
              <div
                className={`w-20 h-20 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg border border-white/10 ${
                  authenticatedUser.isHolder
                    ? 'bg-amber-600'
                    : authenticatedUser.member?.avatarBg || 'bg-indigo-600'
                }`}
              >
                {authenticatedUser.isHolder
                  ? '👑'
                  : authenticatedUser.name.slice(0, 2).toUpperCase()}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Session Saved &bull; Stay Logged In</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Welcome, {authenticatedUser.name}
              </h2>
              <p className="text-xs text-slate-400">
                Opening {authenticatedUser.isHolder ? 'Holder Master Vault' : 'Personal Flatmate Portal'}...
              </p>
            </div>

            <div className="py-3 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
              <p className="text-xs font-semibold text-slate-400">
                Direct entry unlocked. You won&apos;t be asked for password again.
              </p>
            </div>
          </div>
        ) : (
          /* ================= STATE B: STRICT EMAIL AUTHENTICATION CARD ================= */
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 shadow-2xl space-y-5">
            {/* Header with App Logo & Cloud Live Status */}
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
                    <Sparkles className="w-3 h-3 text-indigo-400" />
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
                  {mode === 'signin'
                    ? 'Sign in once with Email. Saved permanently like Gmail & YouTube.'
                    : 'Create your Flat-Mate account. Enter your name to assign your portal.'}
                </p>
              </div>
            </div>

            {/* TAB TOGGLE: Sign In vs Create Account */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-800 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setHasError(false);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  mode === 'signin'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setHasError(false);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  mode === 'signup'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* AUTHENTICATION FORM (NO ROOMMATES LIST VISIBLE) */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* If Sign Up: Ask for Full Name to assign portal */}
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Your Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Holder or Prajwal"
                      value={nameInput}
                      onChange={(e) => {
                        setNameInput(e.target.value);
                        setHasError(false);
                      }}
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-800 border border-slate-700 text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Type <span className="font-bold text-amber-400">&quot;Holder&quot;</span> for Master Portal, or your roommate name.
                  </p>
                </div>
              )}

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Email Address *
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
                  {mode === 'signup' ? 'Create Password (min 6 chars) *' : 'Password *'}
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

              {/* Confirm Password (only on Sign Up) */}
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={confirmPasswordInput}
                      onChange={(e) => {
                        setConfirmPasswordInput(e.target.value);
                        setHasError(false);
                      }}
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-800 border border-slate-700 text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Stay Logged In Checkbox (Like Gmail / YouTube) */}
              <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={stayLoggedIn}
                  onChange={(e) => setStayLoggedIn(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs text-slate-300 font-medium">
                  Stay logged in permanently (Don&apos;t ask again on this device)
                </span>
              </label>

              {/* Error Message */}
              {hasError && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs text-center font-medium flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all transform active:scale-95 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying with Firebase...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {mode === 'signup'
                        ? 'Create Account & Enter Portal'
                        : 'Sign In & Enter Portal'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Bottom Toggle Note */}
            <div className="pt-2 text-center text-xs text-slate-400">
              {mode === 'signin' ? (
                <span>
                  First time here?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setHasError(false);
                    }}
                    className="text-indigo-400 font-bold hover:underline"
                  >
                    Create your account
                  </button>
                </span>
              ) : (
                <span>
                  Already created your account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setHasError(false);
                    }}
                    className="text-indigo-400 font-bold hover:underline"
                  >
                    Sign In
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
