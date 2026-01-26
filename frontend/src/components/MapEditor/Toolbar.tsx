"use client";

interface ToolbarProps {
  currentTool: 'brush' | 'eraser';
  onToolChange: (tool: 'brush' | 'eraser') => void;
}

export default function Toolbar({ currentTool, onToolChange }: ToolbarProps) {
  return (
    <div className="bg-white border-t border-gray-200 p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 font-semibold">Tools:</span>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              currentTool === "brush"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => onToolChange("brush")}
          >
            🖌️ Brush
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              currentTool === "eraser"
                ? "bg-red-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => onToolChange("eraser")}
          >
            🧹 Eraser
          </button>
        </div>
      </div>
    </div>
  );
}
