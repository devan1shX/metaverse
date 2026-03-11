import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Code2, Check, X } from "lucide-react";

interface CodeInviteModalProps {
  isOpen: boolean;
  hostName: string;
  onAccept: () => void;
  onDecline: () => void;
}

export function CodeInviteModal({
  isOpen,
  hostName,
  onAccept,
  onDecline,
}: CodeInviteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button className="overlay-backdrop" onClick={onDecline} aria-label="Decline invite" />
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          className="modal-shell relative z-10 flex w-full max-w-sm flex-col"
        >
          <div className="modal-header flex items-center gap-4 p-6 pb-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-[rgba(239,188,130,0.2)] bg-[rgba(215,163,102,0.12)] text-[var(--accent-strong)]">
              <Code2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display text-xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">Code Session Invite</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                <span className="font-semibold text-[var(--accent-strong)]">{hostName}</span> has invited you to collaborate on code.
              </p>
            </div>
          </div>

          <div className="modal-footer flex gap-3 p-6">
            <button
              onClick={onDecline}
              className="btn-secondary flex-1 rounded-2xl"
            >
              <X className="w-4 h-4" />
              Decline
            </button>
            <button
              onClick={onAccept}
              className="btn-success flex-1 rounded-2xl"
            >
              <Check className="w-4 h-4" />
              Accept
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
