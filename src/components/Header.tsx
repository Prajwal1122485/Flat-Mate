'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Bell,
  Download,
  Upload,
  RefreshCw,
  MoreVertical,
} from 'lucide-react';
import { Member, HolderNotification } from '@/types';

interface HeaderProps {
  currentMember: Member;
  allMembers: Member[];
  onSelectMember?: (member: Member) => void;
  onOpenHolderPortal: () => void;
  onExitPortal: () => void;
  activePortalType?: 'holder' | 'member' | 'gatekeeper';
  notifications: HolderNotification[];
  onMarkNotificationRead: (id: string) => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onResetData: () => void;
  firebaseStatus?: 'connected' | 'connecting' | 'error' | 'unconfigured';
  onResetToCompletelyBlank?: () => void;
}

export default function Header({
  currentMember,
  allMembers,
  onOpenHolderPortal,
  onExitPortal,
  activePortalType = 'gatekeeper',
  notifications,
  onMarkNotificationRead,
  onExportBackup,
  onImportBackup,
  onResetData,
  firebaseStatus = 'connected',
  onResetToCompletelyBlank,
}: HeaderProps) {
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const holder = allMembers.find((m) => m.isHolder) || allMembers[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportBackup(file);
    }
    setShowMoreMenu(false);
  };

  const isHolderActive = activePortalType === 'holder';
  const isMemberActive = activePortalType === 'member';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-black text-lg shadow-md shadow-indigo-500/20">
            ₹
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 dark:text-white tracking-tight text-base sm:text-lg">
                Flat-Mate
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Register &amp; Splitter
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Rent on 11th &bull; Appliances on 15th &bull; Flat 304
            </p>
          </div>
        </div>

        {/* Action Controls & Top Holder Portal Access */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Firebase Database Connection Indicator */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
              firebaseStatus === 'connected'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                : firebaseStatus === 'connecting'
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-700'
            }`}
            title={
              firebaseStatus === 'connected'
                ? 'Firebase Firestore connected & syncing in real time (flatmate-register)'
                : firebaseStatus === 'connecting'
                ? 'Connecting to Firebase Firestore...'
                : 'Firebase is currently offline or unconfigured. Local storage active.'
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                firebaseStatus === 'connected'
                  ? 'bg-emerald-500 animate-pulse'
                  : firebaseStatus === 'connecting'
                  ? 'bg-amber-500 animate-ping'
                  : 'bg-rose-500'
              }`}
            />
            <span className="hidden xs:inline">
              {firebaseStatus === 'connected'
                ? 'Firebase Live'
                : firebaseStatus === 'connecting'
                ? 'Connecting DB...'
                : 'Offline DB'}
            </span>
          </div>

          {/* Top Prominent Holder Access Button */}
          <button
            type="button"
            onClick={onOpenHolderPortal}
            className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm transform active:scale-95 ${
              isHolderActive
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 ring-2 ring-indigo-500/40 ring-offset-1'
                : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800'
            }`}
            title="Access the Holder Portal"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-500 dark:text-indigo-400 fill-current" />
            <span>Holder</span>
            {isHolderActive && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          {/* Active Profile Info & Strict Lock/Exit Portal Button (No portal hopping allowed) */}
          {activePortalType !== 'gatekeeper' && (
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 px-2 py-1">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-white text-[11px] font-bold ${
                    isHolderActive ? 'bg-indigo-600' : (currentMember.avatarBg || 'bg-slate-600')
                  }`}
                >
                  {isHolderActive ? '👑' : currentMember.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block leading-none">
                    {isHolderActive ? 'Holder' : currentMember.name}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {isHolderActive ? 'Ledger Controller' : 'Private Portal'}
                  </span>
                </div>
              </div>

              {/* Secure Exit / Lock Button */}
              <button
                type="button"
                onClick={onExitPortal}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                title="Lock portal and return to FlatMate Directory"
              >
                <span>Exit</span>
              </button>
            </div>
          )}


          {/* Notifications Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifDrawer(!showNotifDrawer)}
              className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Notifications & Activity"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center shadow-sm">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Drawer */}
            {showNotifDrawer && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 px-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    House Notifications ({unreadCount} unread)
                  </div>
                  <span className="text-[10px] text-slate-400">Live Activity</span>
                </div>

                <div className="mt-2 space-y-2 max-h-72 overflow-y-auto pr-1">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No notifications right now.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => onMarkNotificationRead(n.id)}
                        className={`p-2.5 rounded-xl text-xs cursor-pointer transition-colors border ${
                          n.read
                            ? 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200/50 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                            : 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900 font-semibold text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                            {n.title}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(n.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="mt-1 text-slate-600 dark:text-slate-300 font-normal">
                          {n.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Backup & Tools Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Database Backup & Utilities"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50">
                <button
                  type="button"
                  onClick={() => {
                    onExportBackup();
                    setShowMoreMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-left"
                >
                  <Download className="w-4 h-4 text-slate-500" />
                  <span>Download Backup (JSON)</span>
                </button>

                <label className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-left cursor-pointer">
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>Restore from Backup</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>

                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                <button
                  type="button"
                  onClick={() => {
                    if (
                      confirm(
                        'Wipe everything to a blank slate? This resets both your local state and the Firebase Cloud database.'
                      )
                    ) {
                      if (onResetToCompletelyBlank) {
                        onResetToCompletelyBlank();
                      } else {
                        onResetData();
                      }
                      setShowMoreMenu(false);
                    }
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg text-left font-bold"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Wipe to Completely Blank</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
