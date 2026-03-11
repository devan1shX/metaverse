"use client";

import React from "react";
import { useToast } from "@/contexts/ToastContext";
import { X } from "lucide-react";

export default function Toast() {
  const { toast, hideToast } = useToast();

  if (!toast.isVisible) return null;

  const palette =
    toast.type === "error"
      ? {
          border: "rgba(239, 124, 120, 0.22)",
          iconBg: "var(--danger-soft)",
          text: "var(--danger)",
        }
      : toast.type === "success"
        ? {
            border: "rgba(122, 194, 142, 0.22)",
            iconBg: "var(--success-soft)",
            text: "var(--success)",
          }
        : {
            border: "rgba(239, 188, 130, 0.2)",
            iconBg: "var(--accent-soft)",
            text: "var(--accent-strong)",
          };

  return (
    <div
      className="fixed left-1/2 top-6 z-[9999] flex min-w-[300px] -translate-x-1/2 items-center gap-3 rounded-full border px-4 py-3 shadow-2xl"
      style={{
        background: "rgba(14, 19, 28, 0.88)",
        borderColor: palette.border,
        color: palette.text,
        backdropFilter: "blur(18px)",
      }}
    >
      {/* Icon */} 
      <div
        className="rounded-full p-1.5"
        style={{ background: palette.iconBg }}
      >
        {toast.type === 'error' ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
          </svg>
        ) : toast.type === 'success' ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
          </svg>
        )}
      </div>

      {/* Message */}
      <div className="flex-1 text-sm font-medium text-[var(--text-primary)]">
        {toast.message}
      </div>

      {/* Close Button */}
      <button
        onClick={hideToast}
        className="rounded-full p-1 text-[var(--text-soft)] hover:bg-white/5 hover:text-[var(--text-primary)]"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
