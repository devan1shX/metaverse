"use client";

interface ToolbarProps {
  currentTool: 'brush' | 'eraser';
  onToolChange: (tool: 'brush' | 'eraser') => void;
}

export default function Toolbar({ currentTool, onToolChange }: ToolbarProps) {
  return (
    <div className="glass-bar rounded-[24px] p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="surface-label">Tools</span>
          <button
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
              currentTool === "brush"
                ? "border-[rgba(239,188,130,0.28)] bg-[rgba(215,163,102,0.16)] text-[var(--accent-strong)]"
                : "border-[var(--border-default)] bg-white/5 text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            }`}
            onClick={() => onToolChange("brush")}
          >
            Brush
          </button>
          <button
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
              currentTool === "eraser"
                ? "border-[rgba(239,124,120,0.24)] bg-[var(--danger-soft)] text-[var(--danger)]"
                : "border-[var(--border-default)] bg-white/5 text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            }`}
            onClick={() => onToolChange("eraser")}
          >
            Eraser
          </button>
        </div>
      </div>
    </div>
  );
}
