"use client";

import React, { useState, useCallback, useRef, useEffect, memo } from "react";
import { Eraser, Users, X, AlertTriangle, LogOut, PenLine, Trash2, GripVertical } from "lucide-react";

interface SessionParticipant {
  id: string;
  user_name: string;
}

interface WhiteboardProps {
  spaceId: string;
  userId: string;
  userName: string;
  onClose: () => void;
  sessionParticipants?: SessionParticipant[];
  /** JSON string of Excalidraw elements — only pass new value when a REMOTE user changes the board */
  initialElements?: string;
  /** Binary file data received from remote users (Excalidraw BinaryFiles map) */
  remoteFiles?: Record<string, any>;
  onElementsChange?: (elementsJson: string, files: Record<string, any>) => void;
  onClear?: () => void;
}

function LeaveConfirmDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="modal-shell w-80 p-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-soft)]">
          <AlertTriangle className="h-6 w-6 text-[var(--accent-strong)]" />
        </div>
        <div className="text-center">
          <h3 className="mb-1 text-base font-semibold text-[var(--text-primary)]">Leave Whiteboard?</h3>
          <p className="text-sm text-[var(--text-muted)]">Your collaborators will stay. The board is saved automatically.</p>
        </div>
        <div className="flex gap-3 w-full">
          <button onClick={onCancel} className="btn-secondary flex-1">
            <X className="w-4 h-4" /> Stay
          </button>
          <button onClick={onConfirm} className="btn-primary flex-1">
            <LogOut className="w-4 h-4" /> Leave
          </button>
        </div>
      </div>
    </div>
  );
}

function ClearConfirmDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="modal-shell w-80 p-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--danger-soft)]">
          <Trash2 className="h-6 w-6 text-[var(--danger)]" />
        </div>
        <div className="text-center">
          <h3 className="mb-1 text-base font-semibold text-[var(--text-primary)]">Clear Whiteboard?</h3>
          <p className="text-sm text-[var(--text-muted)]">This will erase all drawings for everyone. This cannot be undone.</p>
        </div>
        <div className="flex gap-3 w-full">
          <button onClick={onCancel} className="btn-secondary flex-1">
            <X className="w-4 h-4" /> Cancel
          </button>
          <button onClick={onConfirm} className="btn-danger flex-1">
            <Trash2 className="w-4 h-4" /> Clear All
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ExcalidrawCanvas — memoised so parent re-renders don't remount the canvas.
// We use a stable callback ref pattern so Excalidraw always gets the latest
// onChange without the component unmounting.
// ─────────────────────────────────────────────────────────────────────────────
interface ExcalidrawCanvasProps {
  initialElements: any[];
  onAPIReady: (api: any) => void;
  onChangeRef: React.RefObject<((elements: readonly any[], appState: any, files: Record<string, any>) => void) | null>;
}

const ExcalidrawCanvas = memo(function ExcalidrawCanvas({
  initialElements,
  onAPIReady,
  onChangeRef,
}: ExcalidrawCanvasProps) {
  const [ExcalidrawComp, setExcalidrawComp] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    import("@excalidraw/excalidraw").then((mod) => {
      if (!cancelled) setExcalidrawComp(() => mod.Excalidraw);
    });
    return () => { cancelled = true; };
  }, []);

  // Stable wrapper so Excalidraw always calls the latest handler
  const stableOnChange = useCallback(
    (elements: readonly any[], appState: any, files: Record<string, any>) => {
      onChangeRef.current?.(elements, appState, files);
    },
    [onChangeRef]   // onChangeRef itself is a stable ref object — never changes
  );

  if (!ExcalidrawComp) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-white text-sm text-slate-500">
        Loading whiteboard…
      </div>
    );
  }

  return (
    <ExcalidrawComp
      excalidrawAPI={onAPIReady}
      initialData={{
        elements: initialElements,
        appState: {
          viewBackgroundColor: "#ffffff",
          theme: "light",
        },
      }}
      theme="light"
      onChange={stableOnChange}
      // Hide the Library button by returning null for top-right UI
      renderTopRightUI={() => null}
      UIOptions={{
        canvasActions: {
          changeViewBackgroundColor: true,
          clearCanvas: false,   // handled by our own Clear button
          loadScene: false,
          saveToActiveFile: false,
          saveAsImage: true,
          toggleTheme: false,   // we force light permanently
        },
        tools: {
          image: true,         // enable image upload tool
        },
      }}
    />
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Whiteboard (main export)
// ─────────────────────────────────────────────────────────────────────────────
export function Whiteboard({
  spaceId,
  userId,
  userName,
  onClose,
  sessionParticipants = [],
  initialElements = "[]",
  remoteFiles = {},
  onElementsChange,
  onClear,
}: WhiteboardProps) {
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);

  // Track whether a scene update came from a remote peer (to skip echoing back)
  const isExternalUpdateRef = useRef(false);

  // Throttle outgoing updates to ~10fps
  const throttleRef = useRef<number>(0);

  // Keep a local copy of all image files Excalidraw has seen  ← image fix
  const localFilesRef = useRef<Record<string, any>>({});

  // Stable ref for the onChange handler — avoids remounting ExcalidrawCanvas
  const onChangeRef = useRef<((elements: readonly any[], appState: any, files: Record<string, any>) => void) | null>(null);
  onChangeRef.current = useCallback(
    (elements: readonly any[], _appState: any, files: Record<string, any>) => {
      // Merge any new files into our local cache
      if (files && Object.keys(files).length > 0) {
        localFilesRef.current = { ...localFilesRef.current, ...files };
      }

      if (isExternalUpdateRef.current) return; // don't echo remote changes back

      const now = Date.now();
      if (now - throttleRef.current < 100) return;
      throttleRef.current = now;

      if (onElementsChange) {
        try {
          onElementsChange(JSON.stringify(elements), localFilesRef.current);
        } catch { /* ignore */ }
      }
    },
    [onElementsChange]
  );

  // Apply remote elements (from WebSocket) without disturbing local image files
  useEffect(() => {
    if (!excalidrawAPI || !initialElements) return;
    try {
      const parsed = JSON.parse(initialElements);
      if (!Array.isArray(parsed)) return;
      // Merge files from the remote peer into our local cache first
      if (remoteFiles && Object.keys(remoteFiles).length > 0) {
        localFilesRef.current = { ...localFilesRef.current, ...remoteFiles };
      }
      isExternalUpdateRef.current = true;
      // Pass merged files so remote images render correctly
      excalidrawAPI.updateScene({
        elements: parsed,
        files: localFilesRef.current,
      });
      setTimeout(() => { isExternalUpdateRef.current = false; }, 50);
    } catch { /* ignore */ }
  }, [initialElements, remoteFiles, excalidrawAPI]);

  const handleClearConfirmed = () => {
    setShowClearConfirm(false);
    localFilesRef.current = {};
    if (excalidrawAPI) excalidrawAPI.updateScene({ elements: [], files: {} });
    if (onClear) onClear();
  };

  let parsedInitialElements: any[] = [];
  try {
    const p = JSON.parse(initialElements);
    if (Array.isArray(p)) parsedInitialElements = p;
  } catch { /* ignore */ }

  const allParticipants = [
    { id: userId, user_name: userName + " (You)" },
    ...sessionParticipants.filter((p) => p.id !== userId),
  ];

  return (
    <div className="glass-panel relative flex h-full w-full flex-col overflow-hidden rounded-[28px] border border-[var(--border-default)] pointer-events-auto" style={{ colorScheme: "light" }}>

      {/* CSS to hide the Library button Excalidraw renders inside canvas */}
      <style>{`
        .excalidraw .App-toolbar__extra-tools-trigger,
        .excalidraw button[title="Library"],
        .excalidraw .library-menu-trigger { display: none !important; }
      `}</style>

      {showLeaveConfirm && (
        <LeaveConfirmDialog
          onConfirm={() => { setShowLeaveConfirm(false); onClose(); }}
          onCancel={() => setShowLeaveConfirm(false)}
        />
      )}
      {showClearConfirm && (
        <ClearConfirmDialog
          onConfirm={handleClearConfirmed}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}

      {/* ── Header ── */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--border-default)] bg-[rgba(18,24,34,0.84)] px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <PenLine className="h-5 w-5 text-[var(--accent-strong)]" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">Collaborative Whiteboard</span>
          </div>
          <div className="mx-1 h-4 w-px bg-[var(--border-default)]" />
          {/* Participants */}
          <div className="relative">
            <button
              onClick={() => setShowParticipants((p) => !p)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                showParticipants ? "border-[rgba(239,188,130,0.24)] bg-[rgba(215,163,102,0.12)] text-[var(--accent-strong)]" : "border-[var(--border-default)] bg-white/5 text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{allParticipants.length}</span>
            </button>
            {showParticipants && (
              <div className="glass-panel absolute left-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-[20px]">
                <div className="border-b border-[var(--border-default)] px-3 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">In This Session</span>
                </div>
                <div className="py-1 max-h-48 overflow-y-auto">
                  {allParticipants.map((p) => (
                    <div key={p.id} className="flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-white/5">
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(215,163,102,0.18)] text-xs font-bold text-[var(--accent-strong)]">
                        {p.user_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate text-sm text-[var(--text-secondary)]">{p.user_name}</span>
                      {p.id === userId && <span className="ml-auto text-xs font-medium text-[var(--accent-strong)]">You</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowClearConfirm(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(239,124,120,0.24)] bg-[var(--danger-soft)] px-3 py-2 text-sm font-semibold text-[var(--danger)] transition-colors hover:brightness-110"
          >
            <Eraser className="w-4 h-4" /> <span>Clear</span>
          </button>
          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="btn-primary min-h-0 px-3 py-2 text-sm"
          >
            <LogOut className="w-4 h-4" /> <span>Leave</span>
          </button>
        </div>
      </div>

      {/* ── Participant strip ── */}
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-[var(--border-default)] bg-[rgba(10,14,22,0.58)] px-4 py-2">
        {allParticipants.map((p) => (
          <div key={p.id} className="flex items-center gap-1.5" title={p.user_name}>
            <div className="relative">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(215,163,102,0.18)] text-[10px] font-bold text-[var(--accent-strong)]">
                {p.user_name.charAt(0).toUpperCase()}
              </div>
              <div className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-[rgba(10,14,22,0.8)] bg-[var(--success)]" />
            </div>
          </div>
        ))}
        <span className="ml-1 text-[11px] text-[var(--text-soft)]">
          {allParticipants.length === 1 ? "Only you are drawing" : `${allParticipants.length} collaborators active`}
        </span>
      </div>

      {/* ── Excalidraw Canvas ──
          colorScheme:light breaks out of the global `dark` class on <html>
          so Excalidraw renders with a white canvas.
      */}
      <div
        className="flex-1 min-h-0"
        style={{ colorScheme: "light" }}
        onClick={() => setShowParticipants(false)}
      >
        <ExcalidrawCanvas
          initialElements={parsedInitialElements}
          onAPIReady={setExcalidrawAPI}
          onChangeRef={onChangeRef}
        />
      </div>
    </div>
  );
}
