"use client";

import { useState } from "react";
import { ArrowLeft, CheckCircle, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface CreateSpaceNameProps {
  onBack: () => void;
  onConfirm: (spaceName: string) => void;
}

export default function CreateSpaceName({
  onBack,
  onConfirm,
}: CreateSpaceNameProps) {
  const [spaceName, setSpaceName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (spaceName.trim()) {
      onConfirm(spaceName.trim());
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className="w-full max-w-lg"
    >
      <div className="text-center mb-8">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-[22px] border border-[rgba(239,188,130,0.2)] bg-[rgba(215,163,102,0.12)] text-[var(--accent-strong)] shadow-[0_10px_30px_rgba(215,163,102,0.16)]">
          <Sparkles className="h-7 w-7" />
        </div>
        <p className="surface-label mb-3">Create Space</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] mb-2">
          Name Your Space
        </h1>
        <p className="text-[var(--text-muted)]">
          Choose a unique name for your team's virtual space
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6">
          <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
            Space Name
          </label>
          <input
            type="text"
            value={spaceName}
            onChange={(e) => setSpaceName(e.target.value)}
            placeholder="e.g., Team Headquarters, Innovation Hub"
            className="input-field text-base"
            required
          />
          <p className="mt-2 text-xs text-[var(--text-soft)]">
            This name will appear in your space URL
          </p>
        </div>

        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={onBack}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            type="submit"
            disabled={!spaceName.trim()}
            className="btn-success text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Create space</span>
          </button>
        </div>
      </form>
    </motion.div>
  );
}
