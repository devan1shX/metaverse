"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Play,
  Pause,
  Plus,
  StopCircle,
  Users,
  AlertTriangle,
  Camera,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  X,
  Shield,
  Eye,
  Timer,
  Loader2,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface WaitingCandidate {
  user_id: string;
  user_name: string;
  user_avatar_url: string;
}

interface TabSwitchEntry {
  candidate_id: string;
  candidate_name: string;
  switch_type: "tab_switch" | "blur";
  timestamp: number;
}

interface SnapshotEntry {
  candidate_id: string;
  candidate_name: string;
  image: string;
  timestamp: number;
}

interface InterviewerPanelProps {
  // Waiting room
  initialWaiting: WaitingCandidate[];
  onAdmit: (candidateId: string) => void;
  onReject: (candidateId: string) => void;
  onKick: (userId: string) => void;
  // Timer controls
  onTimerStart: (durationSeconds: number) => void;
  onTimerPause: () => void;
  onTimerExtend: (extraSeconds: number) => void;
  onSessionEnd: () => void;
  // External timer state (synced from WS events)
  timerActive: boolean;
  timerDuration: number;    // total seconds for timer
  timerElapsed: number;     // seconds elapsed since start
  timerStartedAt: number | null; // epoch ms
  // Events received from WS
  tabSwitchEvents: TabSwitchEntry[];
  snapshotEvents: SnapshotEntry[];
  // New events from WS (pushed in via callbacks)
  onNewTabSwitch?: (entry: TabSwitchEntry) => void;
  onNewSnapshot?: (entry: SnapshotEntry) => void;
  // Active candidates
  activeCandidates: { id: string; user_name: string }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatTime(seconds: number) {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function timeAgo(epochSeconds: number) {
  const diffMs = Date.now() - epochSeconds * 1000;
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return new Date(epochSeconds * 1000).toLocaleTimeString();
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Timer Panel
// ─────────────────────────────────────────────────────────────────────────────

function TimerPanel({
  timerActive,
  timerDuration,
  timerElapsed,
  timerStartedAt,
  onStart,
  onPause,
  onExtend,
  onEnd,
}: {
  timerActive: boolean;
  timerDuration: number;
  timerElapsed: number;
  timerStartedAt: number | null;
  onStart: (secs: number) => void;
  onPause: () => void;
  onExtend: (secs: number) => void;
  onEnd: () => void;
}) {
  const [customMinutes, setCustomMinutes] = useState(45);
  const [liveRemaining, setLiveRemaining] = useState(timerDuration - timerElapsed);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Live countdown tick
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (timerActive && timerStartedAt) {
      const tick = () => {
        const elapsed = (Date.now() / 1000) - timerStartedAt;
        const remaining = Math.max(0, timerDuration - elapsed);
        setLiveRemaining(remaining);
      };
      tick();
      tickRef.current = setInterval(tick, 500);
    } else {
      setLiveRemaining(timerDuration - timerElapsed);
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [timerActive, timerStartedAt, timerDuration, timerElapsed]);

  const totalSecs = timerDuration || 1;
  const pct = Math.max(0, Math.min(100, ((totalSecs - liveRemaining) / totalSecs) * 100));
  const isLow = liveRemaining < 300 && timerActive; // < 5 min

  return (
    <div className="space-y-3">
      {/* Circular progress */}
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <circle
              cx="40" cy="40" r="34" fill="none"
              stroke={isLow ? "var(--danger, #ef4444)" : "var(--accent, #d7a366)"}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - pct / 100)}`}
              style={{ transition: "stroke-dashoffset 0.5s linear, stroke 0.3s" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-sm font-mono font-bold ${isLow ? "text-red-400 animate-pulse" : "text-[var(--text-primary)]"}`}>
              {formatTime(liveRemaining)}
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-1.5">
          {!timerActive ? (
            <>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(Number(e.target.value))}
                  className="w-16 rounded-lg bg-white/[0.06] border border-white/10 px-2 py-1 text-sm text-[var(--text-primary)] text-center"
                />
                <span className="text-xs text-[var(--text-soft)]">min</span>
              </div>
              <button
                onClick={() => onStart(customMinutes * 60)}
                className="btn-success w-full text-sm py-1.5"
              >
                <Play className="w-3.5 h-3.5" /> Start Timer
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onPause}
                className="btn-ghost w-full text-sm py-1.5"
              >
                <Pause className="w-3.5 h-3.5" /> Pause
              </button>
              <div className="grid grid-cols-3 gap-1">
                {[5, 10, 15].map((m) => (
                  <button
                    key={m}
                    onClick={() => onExtend(m * 60)}
                    className="btn-ghost text-xs py-1 rounded-xl"
                  >
                    <Plus className="w-3 h-3" />+{m}m
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {(timerActive || liveRemaining === 0) && (
        <button
          onClick={onEnd}
          className="btn-secondary w-full text-sm border-red-500/30 hover:bg-red-500/10 text-red-400"
        >
          <StopCircle className="w-3.5 h-3.5" /> End Interview
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Waiting Room Panel
// ─────────────────────────────────────────────────────────────────────────────

function WaitingRoomPanel({
  candidates,
  onAdmit,
  onReject,
}: {
  candidates: WaitingCandidate[];
  onAdmit: (id: string) => void;
  onReject: (id: string) => void;
}) {
  if (candidates.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center text-[var(--text-soft)]">
        <Users className="w-7 h-7 opacity-30" />
        <p className="text-xs">No one waiting</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {candidates.map((c) => (
          <motion.div
            key={c.user_id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.22 }}
            className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.04] p-3"
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(215,163,102,0.14)] border border-[rgba(215,163,102,0.22)] text-xs font-bold text-[var(--accent-strong)]">
              {c.user_name.charAt(0).toUpperCase()}
            </div>
            <span className="flex-1 truncate text-sm font-medium text-[var(--text-primary)]">
              {c.user_name}
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => onAdmit(c.user_id)}
                title="Admit"
                className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onReject(c.user_id)}
                title="Reject"
                className="flex h-7 w-7 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
              >
                <UserX className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Anti-Cheat Log
// ─────────────────────────────────────────────────────────────────────────────

function AntiCheatLog({ events }: { events: TabSwitchEntry[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  // Count per candidate
  const countMap: Record<string, number> = {};
  events.forEach((e) => {
    countMap[e.candidate_id] = (countMap[e.candidate_id] || 0) + 1;
  });

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center text-[var(--text-soft)]">
        <Shield className="w-7 h-7 opacity-30" />
        <p className="text-xs">No suspicious activity detected</p>
      </div>
    );
  }

  return (
    <div className="max-h-40 overflow-y-auto space-y-1 pr-0.5">
      <AnimatePresence initial={false}>
        {events.slice().reverse().map((e, idx) => (
          <motion.div
            key={`${e.candidate_id}-${e.timestamp}-${idx}`}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-start gap-2 rounded-xl border border-amber-500/15 bg-amber-500/[0.07] p-2"
          >
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-amber-400 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                {e.candidate_name}
                <span className="ml-1.5 text-[10px] text-amber-400 font-semibold bg-amber-400/10 px-1 rounded">
                  ×{countMap[e.candidate_id]}
                </span>
              </p>
              <p className="text-[10px] text-[var(--text-soft)]">
                {e.switch_type === "tab_switch" ? "Tab switch" : "Window blur"} · {timeAgo(e.timestamp)}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <div ref={bottomRef} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Snapshot Gallery
// ─────────────────────────────────────────────────────────────────────────────

function SnapshotGallery({ snapshots }: { snapshots: SnapshotEntry[] }) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  if (snapshots.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center text-[var(--text-soft)]">
        <Camera className="w-7 h-7 opacity-30" />
        <p className="text-xs">Snapshots appear here</p>
        <p className="text-[10px] opacity-60">Taken every few minutes from candidate's webcam</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {snapshots.map((s, i) => (
          <button
            key={`${s.candidate_id}-${s.timestamp}`}
            onClick={() => setSelectedIdx(i)}
            className="flex-shrink-0 relative group"
          >
            <img
              src={s.image}
              alt={`${s.candidate_name} at ${timeAgo(s.timestamp)}`}
              className="h-16 w-24 rounded-xl object-cover border border-white/10 group-hover:border-[var(--accent)] transition-colors"
            />
            <div className="absolute inset-x-0 bottom-0 rounded-b-xl bg-black/60 px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-[9px] text-white truncate">{timeAgo(s.timestamp)}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedIdx !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setSelectedIdx(null)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="relative max-w-lg w-full glass-panel rounded-3xl p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {snapshots[selectedIdx]?.candidate_name}
                  </p>
                  <p className="text-xs text-[var(--text-soft)]">
                    {new Date(snapshots[selectedIdx]?.timestamp * 1000).toLocaleTimeString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedIdx((p) => Math.max(0, (p ?? 0) - 1))}
                    disabled={selectedIdx === 0}
                    className="modal-close disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedIdx((p) => Math.min(snapshots.length - 1, (p ?? 0) + 1))}
                    disabled={selectedIdx === snapshots.length - 1}
                    className="modal-close disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button onClick={() => setSelectedIdx(null)} className="modal-close">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <img
                src={snapshots[selectedIdx]?.image}
                alt="Snapshot"
                className="w-full rounded-2xl object-cover"
              />
              <p className="text-center text-xs text-[var(--text-soft)] mt-2.5">
                {selectedIdx + 1} / {snapshots.length}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Active Candidates (admitted, in session)
// ─────────────────────────────────────────────────────────────────────────────

function ActiveCandidates({
  candidates,
  onKick,
}: {
  candidates: { id: string; user_name: string }[];
  onKick: (id: string) => void;
}) {
  if (candidates.length === 0) {
    return (
      <p className="text-xs text-center py-2 text-[var(--text-soft)]">No candidates in room</p>
    );
  }
  return (
    <div className="space-y-1.5">
      {candidates.map((c) => (
        <div
          key={c.id}
          className="flex items-center gap-2 rounded-xl border border-white/6 bg-white/[0.03] px-2.5 py-1.5"
        >
          <div className="status-dot bg-emerald-400" />
          <span className="flex-1 text-sm text-[var(--text-secondary)] truncate">{c.user_name}</span>
          <button
            onClick={() => onKick(c.id)}
            title="Remove candidate"
            className="flex h-6 w-6 items-center justify-center rounded-lg text-[var(--text-soft)] hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main InterviewerPanel
// ─────────────────────────────────────────────────────────────────────────────

type Section = "queue" | "timer" | "anticheat" | "snapshots";

export function InterviewerPanel({
  initialWaiting,
  onAdmit,
  onReject,
  onKick,
  onTimerStart,
  onTimerPause,
  onTimerExtend,
  onSessionEnd,
  timerActive,
  timerDuration,
  timerElapsed,
  timerStartedAt,
  tabSwitchEvents,
  snapshotEvents,
  activeCandidates,
}: InterviewerPanelProps) {
  const [activeSection, setActiveSection] = useState<Section>("queue");
  const [waitingCandidates, setWaitingCandidates] = useState<WaitingCandidate[]>(initialWaiting);

  // External updates to waiting list (admitted via own actions are handled locally)
  useEffect(() => {
    setWaitingCandidates(initialWaiting);
  }, [initialWaiting]);

  const handleAdmit = (id: string) => {
    setWaitingCandidates((prev) => prev.filter((c) => c.user_id !== id));
    onAdmit(id);
  };

  const handleReject = (id: string) => {
    setWaitingCandidates((prev) => prev.filter((c) => c.user_id !== id));
    onReject(id);
  };

  const navItems: { id: Section; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "queue", label: "Queue", icon: <Users className="w-3.5 h-3.5" />, badge: waitingCandidates.length || undefined },
    { id: "timer", label: "Timer", icon: <Timer className="w-3.5 h-3.5" /> },
    { id: "anticheat", label: "Activity", icon: <Shield className="w-3.5 h-3.5" />, badge: tabSwitchEvents.length || undefined },
    { id: "snapshots", label: "Photos", icon: <Camera className="w-3.5 h-3.5" />, badge: snapshotEvents.length || undefined },
  ];

  return (
    <div className="glass-panel flex flex-col rounded-[28px] z-20 w-80 flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/8 p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(215,163,102,0.14)] border border-[rgba(215,163,102,0.22)]">
            <Eye className="w-4 h-4 text-[var(--accent-strong)]" />
          </div>
          <div>
            <p className="text-xs text-[var(--text-soft)] uppercase tracking-widest">Interviewer</p>
            <h3 className="font-display font-semibold text-sm leading-5 text-[var(--text-primary)]">Control Panel</h3>
          </div>
          {timerActive && (
            <div className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5">
              <Loader2 className="w-3 h-3 text-emerald-400 animate-spin" />
              <span className="text-[10px] font-medium text-emerald-400">Live</span>
            </div>
          )}
        </div>
      </div>

      {/* Nav Pills */}
      <div className="border-b border-white/8 px-3 pt-3 pb-0">
        <div className="flex gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`relative flex flex-1 items-center justify-center gap-1 rounded-t-xl px-2 py-2 text-[11px] font-medium transition-colors ${
                activeSection === item.id
                  ? "bg-white/[0.08] text-[var(--text-primary)] border-t border-x border-white/10"
                  : "text-[var(--text-soft)] hover:text-[var(--text-secondary)] hover:bg-white/[0.04]"
              }`}
            >
              {item.icon}
              {item.label}
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent)] text-[9px] font-bold text-black">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Section Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {activeSection === "queue" && (
              <div className="space-y-4">
                {/* Waiting */}
                <div>
                  <p className="surface-label mb-2">Waiting Room ({waitingCandidates.length})</p>
                  <WaitingRoomPanel
                    candidates={waitingCandidates}
                    onAdmit={handleAdmit}
                    onReject={handleReject}
                  />
                </div>
                {/* Active */}
                {activeCandidates.length > 0 && (
                  <div>
                    <p className="surface-label mb-2">In Session ({activeCandidates.length})</p>
                    <ActiveCandidates candidates={activeCandidates} onKick={onKick} />
                  </div>
                )}
              </div>
            )}

            {activeSection === "timer" && (
              <div>
                <p className="surface-label mb-3">Interview Timer</p>
                <TimerPanel
                  timerActive={timerActive}
                  timerDuration={timerDuration}
                  timerElapsed={timerElapsed}
                  timerStartedAt={timerStartedAt}
                  onStart={onTimerStart}
                  onPause={onTimerPause}
                  onExtend={onTimerExtend}
                  onEnd={onSessionEnd}
                />
              </div>
            )}

            {activeSection === "anticheat" && (
              <div>
                <p className="surface-label mb-2">Activity Log ({tabSwitchEvents.length})</p>
                <AntiCheatLog events={tabSwitchEvents} />
              </div>
            )}

            {activeSection === "snapshots" && (
              <div>
                <p className="surface-label mb-2">Webcam Snapshots ({snapshotEvents.length})</p>
                <SnapshotGallery snapshots={snapshotEvents} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
