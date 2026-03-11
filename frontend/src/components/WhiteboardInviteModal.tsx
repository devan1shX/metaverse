import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Check, X } from "lucide-react";

interface WhiteboardInviteModalProps {
  isOpen: boolean;
  hostName: string;
  onAccept: () => void;
  onDecline: () => void;
}

export function WhiteboardInviteModal({
  isOpen,
  hostName,
  onAccept,
  onDecline,
}: WhiteboardInviteModalProps) {
  // Auto-decline after 30 seconds
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => onDecline(), 30000);
    return () => clearTimeout(timer);
  }, [isOpen, onDecline]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="modal-shell fixed bottom-28 left-1/2 z-50 w-80 -translate-x-1/2 overflow-hidden"
      >
        <div className="h-1 bg-[var(--accent)]" />

        <div className="p-5">
          {/* Icon + title */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[rgba(239,188,130,0.2)] bg-[rgba(215,163,102,0.12)]">
              <Pencil className="h-5 w-5 text-[var(--accent-strong)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Whiteboard Invite</p>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                <span className="font-medium text-[var(--accent-strong)]">{hostName}</span> invited you to
                collaborate on the whiteboard
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={onDecline}
              className="btn-secondary flex-1 rounded-2xl text-sm"
            >
              <X className="w-4 h-4" />
              Decline
            </button>
            <button
              onClick={onAccept}
              className="btn-success flex-1 rounded-2xl text-sm"
            >
              <Check className="w-4 h-4" />
              Join Board
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
