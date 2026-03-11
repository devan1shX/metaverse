"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Video, Link2, Copy, Check, ChevronRight } from "lucide-react";
import { spaceAPI } from "@/lib/api";

interface CreateInterviewModalProps {
  onClose: () => void;
  onCreated?: (spaceId: string, shareableLink: string) => void;
}

export function CreateInterviewModal({ onClose, onCreated }: CreateInterviewModalProps) {
  const [step, setStep] = useState<"form" | "created">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [durationMin, setDurationMin] = useState(45);
  const [snapshotInterval, setSnapshotInterval] = useState(5);

  // Result
  const [spaceId, setSpaceId] = useState("");
  const [shareableLink, setShareableLink] = useState("");

  const handleCreate = async () => {
    if (!title.trim()) {
      setError("Please enter an interview title.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Extended with interview-specific fields (space_type, interview_config)
      const res = await spaceAPI.createSpace({
        name: title.trim(),
        description: "Interview space",
        isPublic: true,
        space_type: "interview",
        interview_config: {
          snapshot_interval_min: snapshotInterval,
          max_duration_min: durationMin,
        },
        mapId: "interview-room",
        mapImageUrl: "/maps/map3/interview-room.png",
      } as any);

      const data = res.data;
      if (!data?.success) throw new Error(data?.message || "Failed to create interview space");

      const sid = data.space.id;
      const link = `${window.location.origin}/game/${sid}`;
      setSpaceId(sid);
      setShareableLink(link);
      setStep("created");
      onCreated?.(sid, link);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareableLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="glass-panel w-full max-w-md rounded-[28px] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(215,163,102,0.14)] border border-[rgba(215,163,102,0.22)]">
              <Video className="w-5 h-5 text-[var(--accent-strong)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-soft)] uppercase tracking-widest">New</p>
              <h2 className="font-display font-semibold text-lg leading-5 text-[var(--text-primary)]">
                Interview Space
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="modal-close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {step === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              {/* Title */}
              <div>
                <label className="surface-label mb-2">Interview Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="e.g. Software Engineer Round 1"
                  className="w-full rounded-2xl bg-white/[0.06] border border-white/10 px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-soft)] focus:outline-none focus:border-[var(--accent)]/40 transition-colors"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="surface-label mb-2">Default Duration (minutes)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[30, 45, 60, 90].map((m) => (
                    <button
                      key={m}
                      onClick={() => setDurationMin(m)}
                      className={`rounded-2xl border py-2.5 text-sm font-medium transition-all ${
                        durationMin === m
                          ? "border-[var(--accent)]/50 bg-[rgba(215,163,102,0.12)] text-[var(--accent-strong)]"
                          : "border-white/10 bg-white/[0.04] text-[var(--text-soft)] hover:bg-white/[0.08]"
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Snapshot interval */}
              <div>
                <label className="surface-label mb-2">📸 Webcam Snapshot Interval</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Off", value: 0 },
                    { label: "5m", value: 5 },
                    { label: "10m", value: 10 },
                    { label: "15m", value: 15 },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSnapshotInterval(opt.value)}
                      className={`rounded-2xl border py-2.5 text-sm font-medium transition-all ${
                        snapshotInterval === opt.value
                          ? "border-[var(--accent)]/50 bg-[rgba(215,163,102,0.12)] text-[var(--accent-strong)]"
                          : "border-white/10 bg-white/[0.04] text-[var(--text-soft)] hover:bg-white/[0.08]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-[var(--text-soft)]">
                  Automatically captures candidate's webcam and sends to you
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-400 text-center">{error}</p>
              )}

              <button
                onClick={handleCreate}
                disabled={loading}
                className="btn-success w-full"
              >
                {loading ? (
                  <span className="flex items-center gap-2 justify-center">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </span>
                ) : (
                  <span className="flex items-center gap-2 justify-center">
                    Create Interview Space
                    <ChevronRight className="w-4 h-4" />
                  </span>
                )}
              </button>
            </motion.div>
          )}

          {step === "created" && (
            <motion.div
              key="created"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-5"
            >
              <div className="flex flex-col items-center gap-2 text-center py-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/25 mb-1">
                  <Check className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className="font-display text-xl font-semibold text-[var(--text-primary)]">
                  Space Created!
                </h3>
                <p className="text-sm text-[var(--text-soft)]">
                  Share this link with candidates. They must log in first, then will enter the waiting room.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Link2 className="w-3.5 h-3.5 text-[var(--text-soft)]" />
                  <span className="text-xs text-[var(--text-soft)] uppercase tracking-widest">Shareable Link</span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="flex-1 text-xs text-[var(--text-primary)] break-all font-mono leading-5">
                    {shareableLink}
                  </p>
                  <button
                    onClick={copyLink}
                    className={`flex-shrink-0 flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                      copied
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-white/10 bg-white/[0.06] text-[var(--text-secondary)] hover:bg-white/[0.12]"
                    }`}
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              <a
                href={`/game/${spaceId}`}
                className="btn-success w-full text-center block"
              >
                Enter Interview Room →
              </a>

              <button
                onClick={onClose}
                className="btn-ghost w-full text-sm"
              >
                Close
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
