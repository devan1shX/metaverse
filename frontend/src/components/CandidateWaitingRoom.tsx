"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Clock, Video, Mic, X } from "lucide-react";
import { Loader2 } from "lucide-react";

interface CandidateWaitingRoomProps {
  status: "waiting" | "admitted" | "rejected" | null;
  message?: string;
  onDismiss?: () => void; // for rejected status
}

export function CandidateWaitingRoom({ status, message, onDismiss }: CandidateWaitingRoomProps) {
  return (
    <AnimatePresence>
      {(status === "waiting" || status === "rejected") && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="glass-panel w-full max-w-sm rounded-[28px] p-8 text-center"
          >
            {status === "waiting" && (
              <>
                <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
                  {/* Pulsing ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-[var(--accent)]/30 animate-ping" />
                  <div className="absolute inset-2 rounded-full border border-[var(--accent)]/20" />
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(215,163,102,0.14)] border border-[rgba(215,163,102,0.25)]">
                    <Clock className="w-7 h-7 text-[var(--accent-strong)]" />
                  </div>
                </div>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)] mb-2">
                  Waiting Room
                </h2>
                <p className="text-sm text-[var(--text-soft)] leading-relaxed mb-6">
                  {message || "The interviewer will admit you shortly. Please make sure your camera and microphone are ready."}
                </p>

                {/* Tips */}
                <div className="flex justify-center gap-6 mb-6">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                      <Video className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-[10px] text-[var(--text-soft)]">Camera ready</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                      <Mic className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-[10px] text-[var(--text-soft)]">Mic ready</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-[var(--text-soft)]">
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
                  <span className="text-sm">Waiting for admission...</span>
                </div>
              </>
            )}

            {status === "rejected" && (
              <>
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
                  <X className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="font-display text-xl font-semibold text-[var(--text-primary)] mb-2">
                  Not Admitted
                </h2>
                <p className="text-sm text-[var(--text-soft)] mb-6">
                  {message || "The interviewer has not admitted you to this session."}
                </p>
                <button onClick={onDismiss} className="btn-secondary w-full">
                  Go Back
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
