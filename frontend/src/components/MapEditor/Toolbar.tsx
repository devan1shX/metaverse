"use client";

interface ToolbarProps {
  currentTool: "brush" | "eraser" | "fill" | "select";
  onToolChange: (tool: "brush" | "eraser" | "fill" | "select") => void;
}

export default function Toolbar({ currentTool, onToolChange }: ToolbarProps) {
  return (
    <div className="bg-gray-800 border-t border-gray-700 p-3">
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-400">Tool:</span>
        
        <button
          onClick={() => onToolChange("brush")}
          className={`
            px-4 py-2 rounded transition-colors
            ${currentTool === "brush" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}
          `}
        >
          🖌️ Brush
        </button>

        <button
          onClick={() => onToolChange("eraser")}
          disabled
          className="px-4 py-2 rounded bg-gray-700 text-gray-500 cursor-not-allowed"
          title="Coming in Step 2"
        >
          🧹 Eraser
        </button>

        <button
          onClick={() => onToolChange("fill")}
          disabled
          className="px-4 py-2 rounded bg-gray-700 text-gray-500 cursor-not-allowed"
          title="Coming in Step 2"
        >
          🪣 Fill
        </button>

        <div className="ml-auto text-sm text-gray-400">
          Step 1: Basic Canvas & Tile Painting
        </div>
      </div>
    </div>
  );
}
