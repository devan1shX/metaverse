"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Loader2 } from "lucide-react";

interface GlobalInterviewTimerProps {
  active: boolean;
  durationSeconds: number;
  startedAt: number | null; // epoch seconds
  elapsedAtStart: number;   // pre-elapsed seconds when timer was started/synced
}

function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function GlobalInterviewTimer({
  active,
  durationSeconds,
  startedAt,
  elapsedAtStart,
}: GlobalInterviewTimerProps) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (active && startedAt) {
      const tick = () => {
        const nowSecs = Date.now() / 1000;
        const elapsed = nowSecs - startedAt + elapsedAtStart;
        const rem = Math.max(0, durationSeconds - elapsed);
        setRemaining(rem);
      };
      tick();
      tickRef.current = setInterval(tick, 500);
    } else {
      setRemaining(durationSeconds);
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [active, durationSeconds, startedAt, elapsedAtStart]);

  if (!active && durationSeconds === 0) return null;

  const pct = Math.max(0, Math.min(100, ((durationSeconds - remaining) / Math.max(durationSeconds, 1)) * 100));
  const isLow = remaining < 300 && active;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full border border-white/10 bg-black/60 backdrop-blur-xl px-4 py-2 shadow-xl"
    >
      {active ? (
        <Loader2 className={`w-3.5 h-3.5 animate-spin ${isLow ? "text-red-400" : "text-[var(--accent)]"}`} />
      ) : (
        <Clock className="w-3.5 h-3.5 text-[var(--text-soft)]" />
      )}
      <span className={`font-mono text-sm font-bold tabular-nums min-w-[52px] text-center ${isLow ? "text-red-400 animate-pulse" : "text-[var(--text-primary)]"}`}>
        {formatTime(remaining)}
      </span>
      {/* Progress bar */}
      <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isLow ? "bg-red-400" : "bg-[var(--accent)]"}`}
          style={{ width: `${100 - pct}%` }}
        />
      </div>
      {!active && durationSeconds > 0 && (
        <span className="text-[10px] text-[var(--text-soft)]">Paused</span>
      )}
    </motion.div>
  );
}
