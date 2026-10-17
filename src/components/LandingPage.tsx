'use client';

import React from 'react';
import { Lock, ArrowRight, ShieldCheck } from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
  onOpenHolderLogin?: () => void;
}

export default function LandingPage({ onLogin }: LandingPageProps) {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 sm:px-6 overflow-hidden select-none bg-slate-950 text-white">
      {/* Subtle luxury ambient lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/[0.07] rounded-full blur-[140px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-sky-500/[0.04] rounded-full blur-[100px]" />
      </div>

      {/* Central Luxury Emblem & Hero Card */}
      <div className="relative z-10 w-full max-w-lg mx-auto text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
        {/* Animated House Visual */}
        <div className="relative mx-auto w-32 h-32 sm:w-36 sm:h-36">
          <div className="absolute inset-0 rounded-3xl bg-indigo-500/10 blur-xl animate-pulse" />
          <div className="relative w-full h-full rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-2xl p-4 flex items-center justify-center backdrop-blur-xl">
            <img
              src="/images/house-illustration.jpg"
              alt="Flat-Mate House"
              className="w-full h-full object-contain animate-smooth-float select-none pointer-events-none drop-shadow-md"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://img.magnific.com/free-vector/house-home-building-cartoon-vector-icon-illustration-building-landmark-icon-isolated-flat_138676-15023.jpg?semt=ais_hybrid&w=740&q=80';
              }}
            />
          </div>
        </div>

        {/* Minimal Luxury Typography */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-slate-400 text-xs font-semibold backdrop-blur-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Private Flat Register</span>
            <span>&bull;</span>
            <span className="text-slate-300">Flat 304</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Flat-Mate
          </h1>

          <p className="text-sm text-slate-400 max-w-sm mx-auto font-normal leading-relaxed">
            Personal ledger, shared expenses, and flat duty schedule.
          </p>
        </div>

        {/* Clean Luxury Login Action */}
        <div className="pt-2 max-w-xs mx-auto">
          <button
            type="button"
            onClick={onLogin}
            className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/25 transition-all transform active:scale-95 flex items-center justify-center gap-2.5 group"
          >
            <Lock className="w-4 h-4 text-indigo-200" />
            <span>Enter Portal</span>
            <ArrowRight className="w-4 h-4 text-indigo-300 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <p className="text-[11px] text-slate-400 mt-3 font-medium">
            Protected by member passcode &bull; Holder Master Vault
          </p>
        </div>
      </div>
    </div>
  );
}
