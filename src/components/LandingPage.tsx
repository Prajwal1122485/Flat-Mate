'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Zap,
  Calendar,
  CheckCircle2,
  Lock,
  ArrowRight,
  CreditCard,
  PhoneCall,
  Sparkles,
  Sliders,
  ChevronRight,
  BellRing,
  Activity,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface LandingPageProps {
  onLogin: () => void;
  onOpenHolderLogin?: () => void;
}

export default function LandingPage({ onLogin }: LandingPageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Interactive Live Splitter Simulator State
  const [billAmount, setBillAmount] = useState<number>(2400);
  const [splitCount, setSplitCount] = useState<number>(4);
  const [isSimulatingSettlement, setIsSimulatingSettlement] = useState<boolean>(false);
  const [settledRoommates, setSettledRoommates] = useState<boolean[]>([false, false, false, false]);

  // Terminal telemetry log stream
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    '[INIT] FlatMate OS v2.4 initialized securely',
    '[CLOUD] Real-time Firebase Firestore connected to flat_304',
    '[AUDIT] Monthly rent cycle scheduled for 11th • Zero paise discrepancy',
    '[DUTY] Roster engine active: 6 rotating flat maintenance roles',
  ]);

  // Interactive Mouse Canvas Constellation Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Particle nodes
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      alpha: number;
    }

    const particleCount = Math.min(Math.floor(width / 22), 65);
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        radius: Math.random() * 2 + 1,
        alpha: Math.random() * 0.6 + 0.2,
      });
    }

    let mouseX = -1000;
    let mouseY = -1000;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouseX = -1000;
      mouseY = -1000;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw subtle background radial gradient
      const gradient = ctx.createRadialGradient(
        width / 2,
        height * 0.35,
        50,
        width / 2,
        height * 0.5,
        width * 0.8
      );
      gradient.addColorStop(0, 'rgba(30, 27, 75, 0.45)');
      gradient.addColorStop(0.5, 'rgba(15, 23, 42, 0.2)');
      gradient.addColorStop(1, 'rgba(2, 6, 23, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Update & draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Interaction with mouse
        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 140) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouseX, mouseY);
          ctx.strokeStyle = `rgba(129, 140, 248, ${(1 - dist / 140) * 0.35})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Connect nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist2 = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist2 < 110) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${(1 - dist2 / 110) * 0.18})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(165, 180, 252, ${p.alpha})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Live Simulated Telemetry Stream generator
  useEffect(() => {
    const liveEvents = [
      '[CHORE] Daily Duty Alert: Kitchen cleaning rotated to next roommate',
      '[SETTLE] Peer UPI Transfer ₹350 marked settled via verified QR claim',
      '[EXPENSE] Gas cylinder refill ₹980 split 4-ways automatically',
      '[VAULT] Holder Master Audit statement verified & encrypted',
      '[CLOUD] 100% offline cache synchronised to Firestore Cloud',
      '[SYNC] Water motor chore completion logged with timestamp',
      '[SECURITY] Holder Portal grace timer engaged (10s auto-relock)',
      '[UPI] Direct intent link generated: upi://pay?pa=flatmate@okhdfcbank',
    ];

    const interval = setInterval(() => {
      const nextLog = liveEvents[Math.floor(Math.random() * liveEvents.length)];
      setTerminalLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] ${nextLog}`,
        ...prev.slice(0, 4),
      ]);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  // Trigger interactive 1-Tap UPI Settlement Demo
  const handleTriggerInteractiveSettlement = () => {
    setIsSimulatingSettlement(true);
    setSettledRoommates([true, true, true, true]);

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.65 },
        colors: ['#6366f1', '#10b981', '#38bdf8', '#fbbf24'],
      });
    } catch {
      // safe fallback
    }

    setTimeout(() => {
      setIsSimulatingSettlement(false);
    }, 3000);
  };

  const perPersonShare = (billAmount / splitCount).toFixed(2);

  return (
    <div className="relative min-h-screen bg-[#070b19] text-white selection:bg-indigo-500 selection:text-white overflow-hidden font-sans">
      {/* ================= INTERACTIVE CANVAS BACKGROUND ================= */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* Ambient Cyber Glow Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-10 w-[450px] h-[450px] bg-violet-600/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-2/3 right-10 w-[500px] h-[400px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* ================= HERO SECTION ================= */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-14 pb-20">
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          {/* Futuristic Cyber Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-500/40 shadow-lg shadow-indigo-900/30 backdrop-blur-md animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] sm:text-xs font-black tracking-wider uppercase text-indigo-300">
              Next-Gen Shared Living Operating System
            </span>
            <span className="px-1.5 py-0.2 rounded bg-indigo-800 text-[10px] text-white font-bold">
              v2.4
            </span>
          </div>

          {/* Master Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400">
            Zero Flat Drama.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400">
              Automated Co-Living.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            The intelligent ledger, 1-tap UPI settlement engine, and rotating duties roster designed exclusively for modern roommates.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <button
              type="button"
              onClick={onLogin}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white font-black text-base shadow-xl shadow-indigo-600/40 hover:shadow-indigo-500/60 transition-all transform active:scale-95 flex items-center justify-center gap-3 group"
            >
              <span>Access Flat Portal</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <a
              href="#interactive-demo"
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-bold text-sm backdrop-blur-md transition-all flex items-center justify-center gap-2 hover:border-slate-500"
            >
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Try Live Simulator</span>
            </a>
          </div>

          {/* Security & System Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 max-w-3xl mx-auto">
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm text-center">
              <div className="text-emerald-400 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Live Cloud</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Firebase Synced</div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm text-center">
              <div className="text-sky-400 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>10s Vault Lock</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Master PIN Guarded</div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm text-center">
              <div className="text-indigo-400 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                <span>Zero Paise Error</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Exact UPI Splits</div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm text-center">
              <div className="text-amber-400 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
                <BellRing className="w-3.5 h-3.5" />
                <span>Turn Alert</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Daily Chore Engine</div>
            </div>
          </div>
        </div>

        {/* ================= INTERACTIVE LIVE SIMULATOR ("SOMETHING CRAZY") ================= */}
        <div id="interactive-demo" className="mt-16 sm:mt-24 max-w-5xl mx-auto">
          <div className="relative rounded-3xl p-1 bg-gradient-to-r from-indigo-500/40 via-sky-500/30 to-emerald-500/40 shadow-2xl">
            <div className="rounded-[23px] bg-slate-950/95 backdrop-blur-2xl p-6 sm:p-10 border border-slate-800 space-y-8">
              {/* Header inside Interactive Console */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-lg">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg sm:text-xl font-black text-white">
                        Interactive Split &amp; Settlement Sandbox
                      </h3>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Interactive Demo
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Test how FlatMate instantly reconciles bills with zero rounding discrepancies.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onLogin}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                  >
                    <span>Login to Flat</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Interactive Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Left: Input sliders & preset buttons */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between mb-2">
                      <span>Expense Bill Amount</span>
                      <span className="text-indigo-400 font-mono text-sm font-extrabold">
                        ₹{billAmount.toLocaleString('en-IN')}
                      </span>
                    </label>

                    {/* Presets */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {[1200, 2400, 4800, 16000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => {
                            setBillAmount(amt);
                            setSettledRoommates([false, false, false, false]);
                          }}
                          className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                            billAmount === amt
                              ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          ₹{amt.toLocaleString('en-IN')}
                        </button>
                      ))}
                    </div>

                    <input
                      type="range"
                      min="400"
                      max="35000"
                      step="200"
                      value={billAmount}
                      onChange={(e) => {
                        setBillAmount(Number(e.target.value));
                        setSettledRoommates([false, false, false, false]);
                      }}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Roommates slider */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between mb-2">
                      <span>Split Between</span>
                      <span className="text-sky-400 font-bold text-xs">
                        {splitCount} Roommates (Equal Share)
                      </span>
                    </label>
                    <div className="flex gap-2">
                      {[2, 3, 4, 5].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => {
                            setSplitCount(cnt);
                            setSettledRoommates([false, false, false, false]);
                          }}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                            splitCount === cnt
                              ? 'bg-sky-600 text-white border-sky-400 shadow-md'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {cnt} Mates
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleTriggerInteractiveSettlement}
                      className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 transform active:scale-95"
                    >
                      <Zap className="w-4 h-4 fill-current text-emerald-200" />
                      <span>
                        {isSimulatingSettlement
                          ? 'Settling via UPI...'
                          : 'Simulate 1-Tap UPI Settlement'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Right: Real-time Split Visualization Hologram */}
                <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Calculated Split Breakdown
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Auto-Balanced
                    </span>
                  </div>

                  {/* Big number */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                    <div className="text-[11px] text-slate-400 font-medium">Per Roommate Share</div>
                    <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-sky-200 to-white font-mono mt-0.5">
                      ₹{perPersonShare}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Exact share without loss • Instant UPI QR generation
                    </div>
                  </div>

                  {/* Simulated Roommate Check Cards */}
                  <div className="space-y-2">
                    {['Roommate A (Akash)', 'Roommate B (Rahul)', 'Roommate C (Nikhil)', 'Roommate D (Karan)']
                      .slice(0, splitCount)
                      .map((name, idx) => (
                        <div
                          key={name}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-300 font-bold text-[10px] flex items-center justify-center">
                              {name.slice(12, 14)}
                            </div>
                            <span className="font-semibold text-slate-200">{name}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-300">₹{perPersonShare}</span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                settledRoommates[idx]
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {settledRoommates[idx] ? '✓ Settled' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Live Cyber Telemetry Activity Stream ("Crazy Video-like console") */}
              <div className="pt-4 border-t border-slate-800/80">
                <div className="p-4 rounded-2xl bg-black/60 border border-slate-800 font-mono text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pb-1.5 border-b border-slate-900">
                    <span className="flex items-center gap-1.5 text-indigo-400 font-semibold">
                      <Activity className="w-3.5 h-3.5 animate-pulse" />
                      FlatMate Realtime House Engine Feed
                    </span>
                    <span className="text-[10px] text-emerald-400">● Live 60 FPS</span>
                  </div>
                  {terminalLogs.map((log, index) => (
                    <div
                      key={index}
                      className={`text-[11px] truncate ${
                        index === 0
                          ? 'text-sky-300 font-semibold'
                          : 'text-slate-400/80'
                      }`}
                    >
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= 4 CORE ARCHITECTURE PILLARS ================= */}
        <div className="mt-20 sm:mt-28 space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Engineered for Seamless Flat Living
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
              Everything required to manage a shared apartment with precision, privacy, and accountability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md hover:border-indigo-500/40 transition-all space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Holder Master Vault</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Protected by a master passcode with an automatic 10-second grace relock. Download tamper-proof PDF audit statements for rent and shared appliances.
              </p>
              <div className="text-xs text-indigo-400 font-bold flex items-center gap-1 pt-1">
                <span>Passcode Enforced</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md hover:border-emerald-500/40 transition-all space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Direct 1-Tap UPI</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dynamic QR codes generated with exact split amounts and roommate UPI IDs. Two-party verification protects against missed or fake settlement claims.
              </p>
              <div className="text-xs text-emerald-400 font-bold flex items-center gap-1 pt-1">
                <span>Zero Gateway Fees</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md hover:border-sky-500/40 transition-all space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-sky-600/20 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Rotating Duties Roster</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Configure roles with customizable frequencies (Daily, A day after, Weekly, Monthly). Automated wide-screen popups notify members on their due turn.
              </p>
              <div className="text-xs text-sky-400 font-bold flex items-center gap-1 pt-1">
                <span>Roster Audit PDF</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md hover:border-amber-500/40 transition-all space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-amber-600/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <PhoneCall className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Flat Directory &amp; Contacts</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Centralized emergency contact hub for Landlord, Cook, Plumber, Electrician, and Wifi technician with 1-tap WhatsApp and phone dialing.
              </p>
              <div className="text-xs text-amber-400 font-bold flex items-center gap-1 pt-1">
                <span>WhatsApp Integrated</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* ================= FINAL CALL TO ACTION ================= */}
        <div className="mt-20 sm:mt-28 max-w-4xl mx-auto">
          <div className="rounded-3xl p-8 sm:p-12 bg-gradient-to-tr from-indigo-950 via-slate-900 to-indigo-900/80 border border-indigo-500/30 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 to-sky-400 flex items-center justify-center text-white mx-auto shadow-xl shadow-indigo-600/40">
              <Shield className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Ready to Experience Stress-Free Co-Living?
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
                Select your roommate profile or access the Holder Master Vault with your secure passcode.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onLogin}
                className="px-10 py-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-black text-base shadow-xl transition-all transform active:scale-95 inline-flex items-center gap-2"
              >
                <span>Enter FlatMate Portal</span>
                <ArrowRight className="w-5 h-5 text-indigo-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-20 text-center text-xs text-slate-500 border-t border-slate-900 pt-8">
          <p>FlatMate Register &amp; Splitter &bull; Flat 304 OS &bull; Secure Realtime Firestore DB</p>
        </div>
      </div>
    </div>
  );
}
