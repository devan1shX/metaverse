"use client";

import React from "react";
import { useToast } from "@/contexts/ToastContext";
import { X } from "lucide-react";

export default function Toast() {
  const { toast, hideToast } = useToast();

  if (!toast.isVisible) return null;

  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 min-w-[300px] animate-in fade-in slide-in-from-top-4 duration-200 border ${
      toast.type === 'error' ? 'bg-white border-rose-100 text-rose-600' :
      toast.type === 'success' ? 'bg-white border-emerald-100 text-emerald-600' :
      'bg-white border-blue-100 text-blue-600'
    }`}>
      {/* Icon */}
      <div className={`p-1.5 rounded-full ${
        toast.type === 'error' ? 'bg-rose-100' :
        toast.type === 'success' ? 'bg-emerald-100' :
        'bg-blue-100'
      }`}>
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
      <div className="flex-1 text-sm font-medium">
        {toast.message}
      </div>

      {/* Close Button */}
      <button onClick={hideToast} className="text-slate-400 hover:text-slate-600 p-1">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
