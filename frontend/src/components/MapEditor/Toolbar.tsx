"use client";

interface ToolbarProps {
  currentTool: 'brush' | 'eraser';
  onToolChange: (tool: 'brush' | 'eraser') => void;
}

export default function Toolbar({ currentTool, onToolChange }: ToolbarProps) {
  return (
    <div className="bg-gray-800 border-t border-gray-700 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400 font-semibold">Tools:</span>
          <button
            className={`px-4 py-2 rounded font-semibold transition-colors ${
              currentTool === "brush"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
            onClick={() => onToolChange("brush")}
          >
            🖌️ Brush
          </button>
          <button
            className={`px-4 py-2 rounded font-semibold transition-colors ${
              currentTool === "eraser"
                ? "bg-red-600 text-white shadow-lg"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
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
