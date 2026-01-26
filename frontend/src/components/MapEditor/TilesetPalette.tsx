"use client";

import { useEffect, useState, useRef } from "react";
import { TilesetConfig, SelectedTiles } from "@/types/MapEditor.types";
import { ChevronDown, Check } from "lucide-react";

interface TilesetPaletteProps {
  tilesets: TilesetConfig[];
  selectedTileset: string;
  selectedTileId: number | null;
  selectedTiles: SelectedTiles | null;
  onTilesetChange: (tilesetId: string) => void;
  onTileSelect: (tileId: number) => void;
  onTileSelection: (selection: SelectedTiles) => void;
}

export default function TilesetPalette({
  tilesets,
  selectedTileset,
  selectedTileId,
  selectedTiles,
  onTilesetChange,
  onTileSelect,
  onTileSelection,
}: TilesetPaletteProps) {
  const [tilesetImage, setTilesetImage] = useState<HTMLImageElement | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ row: number; col: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ row: number; col: number } | null>(null);
  
  // Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentTileset = tilesets.find((t) => t.id === selectedTileset);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load selected tileset image
  useEffect(() => {
    if (!currentTileset) return;

    const img = new Image();
    img.src = currentTileset.image;
    img.onload = () => setTilesetImage(img);
    img.onerror = () => {
      console.error("Failed to load tileset:", currentTileset.image);
    };
  }, [currentTileset]);

  const handleMouseDown = (row: number, col: number, tileId: number, e: React.MouseEvent) => {
    e.preventDefault();
    setIsSelecting(true);
    setSelectionStart({ row, col });
    setSelectionEnd({ row, col });
    
    // Single tile selection initially
    onTileSelect(tileId);
    onTileSelection({
      tiles: [[{ tileId, row, col }]],
      width: 1,
      height: 1,
    });
  };

  const handleMouseEnter = (row: number, col: number) => {
    if (isSelecting && selectionStart) {
      setSelectionEnd({ row, col });
    }
  };

  const handleMouseUp = () => {
    if (isSelecting && selectionStart && selectionEnd && currentTileset) {
      const minRow = Math.min(selectionStart.row, selectionEnd.row);
      const maxRow = Math.max(selectionStart.row, selectionEnd.row);
      const minCol = Math.min(selectionStart.col, selectionEnd.col);
      const maxCol = Math.max(selectionStart.col, selectionEnd.col);

      const width = maxCol - minCol + 1;
      const height = maxRow - minRow + 1;
      const tiles: { tileId: number; row: number; col: number }[][] = [];

      for (let r = minRow; r <= maxRow; r++) {
        const row: { tileId: number; row: number; col: number }[] = [];
        for (let c = minCol; c <= maxCol; c++) {
          const tileIndex = r * currentTileset.columns + c;
          if (tileIndex < currentTileset.tileCount) {
            row.push({ tileId: tileIndex + 1, row: r, col: c });
          }
        }
        tiles.push(row);
      }

      onTileSelection({ tiles, width, height });
      
      // Set first tile as selected tile ID
      if (tiles.length > 0 && tiles[0].length > 0) {
        onTileSelect(tiles[0][0].tileId);
      }
    }
    setIsSelecting(false);
  };

  // Global mouseup handler
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSelecting) {
        handleMouseUp();
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isSelecting, selectionStart, selectionEnd, currentTileset]);

  const isTileInSelection = (row: number, col: number) => {
    if (!selectionStart || !selectionEnd) return false;
    const minRow = Math.min(selectionStart.row, selectionEnd.row);
    const maxRow = Math.max(selectionStart.row, selectionEnd.row);
    const minCol = Math.min(selectionStart.col, selectionEnd.col);
    const maxCol = Math.max(selectionStart.col, selectionEnd.col);
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
  };

  // Generate tile grid
  const renderTileGrid = () => {
    if (!currentTileset) return null;

    const tiles = [];
    const rows = Math.ceil(currentTileset.tileCount / currentTileset.columns);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < currentTileset.columns; col++) {
        const tileIndex = row * currentTileset.columns + col;
        if (tileIndex >= currentTileset.tileCount) break;

        const tileId = tileIndex + 1;
        const isSelected = selectedTiles 
          ? selectedTiles.tiles.some(r => r.some(t => t.row === row && t.col === col))
          : selectedTileId === tileId;
        const isInCurrentSelection = isTileInSelection(row, col);

        tiles.push(
          <div
            key={tileIndex}
            onMouseDown={(e) => handleMouseDown(row, col, tileId, e)}
            onMouseEnter={() => handleMouseEnter(row, col)}
            className={`
              relative cursor-pointer select-none
              ${isSelected ? "z-10 ring-2 ring-indigo-500 ring-offset-1 ring-offset-white" : "hover:ring-1 hover:ring-slate-400 hover:z-10"}
              ${isInCurrentSelection ? "after:absolute after:inset-0 after:bg-indigo-500/30" : ""}
            `}
            style={{
              width: `${currentTileset.tileWidth * 2}px`,
              height: `${currentTileset.tileHeight * 2}px`,
            }}
          >
            {tilesetImage && (
              <div
                style={{
                  width: `${currentTileset.tileWidth * 2}px`,
                  height: `${currentTileset.tileHeight * 2}px`,
                  backgroundImage: `url(${currentTileset.image})`,
                  backgroundPosition: `-${col * currentTileset.tileWidth * 2}px -${row * currentTileset.tileHeight * 2}px`,
                  backgroundSize: `${currentTileset.imageWidth * 2}px ${currentTileset.imageHeight * 2}px`,
                  imageRendering: "pixelated",
                  pointerEvents: 'none',
                }}
              />
            )}
            <div className={`absolute bottom-0 right-0 text-[8px] px-1 pointer-events-none transition-opacity ${isSelected || isInCurrentSelection ? "opacity-100 bg-indigo-600 text-white" : "opacity-70 bg-black/60 text-slate-300"}`}>
              {tileId}
            </div>
          </div>
        );
      }
    }

    return tiles;
  };

  return (
    <div 
      className="p-4 flex flex-col h-full" 
      onMouseLeave={() => {
        if (isSelecting) {
          handleMouseUp();
        }
      }}
    >
      <div className="mb-4 relative" ref={dropdownRef}>
        <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-2 block">Active Tileset</label>
        
        {/* Custom Dropdown Trigger */}
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`w-full flex items-center justify-between bg-white text-slate-800 border rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
            isDropdownOpen ? 'border-indigo-500 ring-1 ring-indigo-500/50' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <span>{currentTileset ? currentTileset.name : 'Select Tileset'}</span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Custom Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden text-sm">
            {tilesets.map((tileset) => (
              <button
                key={tileset.id}
                onClick={() => {
                  onTilesetChange(tileset.id);
                  setIsDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 transition-colors ${
                  selectedTileset === tileset.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'
                }`}
              >
                <span>{tileset.name}</span>
                {selectedTileset === tileset.id && <Check className="w-3 h-3" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden bg-slate-50 rounded-lg border border-slate-200 relative">
        <div className="absolute inset-0 overflow-auto custom-scrollbar p-2">
         <style jsx>{`
            .custom-scrollbar::-webkit-scrollbar {
              width: 8px;
              height: 8px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: #f8fafc;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background-color: #cbd5e1;
              border-radius: 4px;
              border: 2px solid #f8fafc;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background-color: #94a3b8;
            }
            .custom-scrollbar::-webkit-scrollbar-corner {
               background: #f8fafc;
            }
         `}</style>
         
         {/* Tileset Grid Container - Forces width based on columns */}
         <div
          className="grid gap-px content-start bg-slate-200"
          style={{
            gridTemplateColumns: `repeat(${currentTileset?.columns || 8}, ${currentTileset?.tileWidth ? currentTileset.tileWidth * 2 : 32}px)`,
            width: 'max-content', // Forces container to grow horizontally
            minWidth: '100%'
          }}
          onMouseUp={handleMouseUp}
        >
          {renderTileGrid()}
        </div>
        </div>
      </div>

       {currentTileset && (
        <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-wider font-medium shrink-0">
          <span>{currentTileset.name}</span>
          <span>{currentTileset.tileCount} Tiles</span>
        </div>
      )}
    </div>
  );
}
