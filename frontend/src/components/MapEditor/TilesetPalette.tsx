"use client";

import { useEffect, useState, useRef } from "react";
import { TilesetConfig, SelectedTiles } from "@/types/MapEditor.types";
import { ChevronDown, Check, Plus } from "lucide-react";
import TilesetUploader from "./TilesetUploader";

interface TilesetPaletteProps {
  tilesets: TilesetConfig[];
  selectedTileset: string;
  selectedTileId: number | null;
  selectedTiles: SelectedTiles | null;
  onTilesetChange: (tilesetId: string) => void;
  onTileSelect: (tileId: number) => void;
  onTileSelection: (selection: SelectedTiles) => void;
  onTilesetAdd?: (newTileset: TilesetConfig) => void;
  mapName?: string;
}

export default function TilesetPalette({
  tilesets,
  selectedTileset,
  selectedTileId,
  selectedTiles,
  onTilesetChange,
  onTileSelect,
  onTileSelection,
  onTilesetAdd,
  mapName = "default",
}: TilesetPaletteProps) {
  const [tilesetImage, setTilesetImage] = useState<HTMLImageElement | null>(null);
  const [showUploader, setShowUploader] = useState(false);
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
              ${isSelected ? "z-10 ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[#0d131d]" : "hover:z-10 hover:ring-1 hover:ring-white/40"}
              ${isInCurrentSelection ? "after:absolute after:inset-0 after:bg-[rgba(215,163,102,0.24)]" : ""}
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
            <div className={`pointer-events-none absolute bottom-0 right-0 px-1 text-[8px] transition-opacity ${isSelected || isInCurrentSelection ? "bg-[var(--accent)] text-[var(--accent-contrast)] opacity-100" : "bg-black/60 text-[var(--text-secondary)] opacity-70"}`}>
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
      className="flex h-full flex-col p-4" 
      onMouseLeave={() => {
        if (isSelecting) {
          handleMouseUp();
        }
      }}
    >
      <div className="mb-4 relative" ref={dropdownRef}>
        <div className="flex items-center gap-2">
            <label className="surface-label mb-2 block flex-1">Active Tileset</label>
            {onTilesetAdd && (
                <button 
                  onClick={() => setShowUploader(true)}
                  className="mb-2 rounded-full border border-[var(--border-default)] bg-white/5 p-2 text-[var(--text-secondary)] transition-colors hover:border-[rgba(239,188,130,0.22)] hover:bg-[rgba(215,163,102,0.1)] hover:text-[var(--accent-strong)]" 
                  title="Add Custom Tileset"
                >
                    <Plus className="w-3 h-3" />
                </button>
            )}
        </div>
        
        {/* Custom Dropdown Trigger */}
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`flex w-full items-center justify-between rounded-[18px] border px-4 py-3 text-sm font-medium transition-all ${
            isDropdownOpen ? "border-[rgba(239,188,130,0.26)] bg-[rgba(215,163,102,0.08)] text-[var(--text-primary)] shadow-[0_0_0_4px_rgba(215,163,102,0.08)]" : "border-[var(--border-default)] bg-white/5 text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          }`}
        >
          <span>{currentTileset ? currentTileset.name : 'Select Tileset'}</span>
          <ChevronDown className={`h-4 w-4 text-[var(--text-soft)] transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Custom Dropdown Menu */}
        {isDropdownOpen && (
          <div className="glass-panel absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-[20px] text-sm">
            {tilesets.map((tileset) => (
              <button
                key={tileset.id}
                onClick={() => {
                  onTilesetChange(tileset.id);
                  setIsDropdownOpen(false);
                }}
                className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
                  selectedTileset === tileset.id ? "bg-[rgba(215,163,102,0.12)] text-[var(--accent-strong)]" : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]"
                }`}
              >
                <span>{tileset.name}</span>
                {selectedTileset === tileset.id && <Check className="w-3 h-3" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative flex-1 overflow-hidden rounded-[22px] border border-[var(--border-default)] bg-[rgba(7,10,16,0.42)]">
        <div className="absolute inset-0 overflow-auto custom-scrollbar p-2">
         {/* ... (existing styles) ... */}
         <style jsx>{`
            .custom-scrollbar::-webkit-scrollbar {
              width: 8px;
              height: 8px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: rgba(255, 255, 255, 0.03);
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background-color: rgba(255, 255, 255, 0.14);
              border-radius: 4px;
              border: 2px solid rgba(10, 14, 22, 0.4);
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background-color: rgba(255, 255, 255, 0.22);
            }
            .custom-scrollbar::-webkit-scrollbar-corner {
               background: transparent;
            }
         `}</style>
         
         {/* Tileset Grid Container - Forces width based on columns */}
         <div
          className="grid content-start gap-px bg-white/10"
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
        <div className="mt-3 flex shrink-0 items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
          <span>{currentTileset.name}</span>
          <span>{currentTileset.tileCount} Tiles</span>
        </div>
      )}
      
      {showUploader && onTilesetAdd && (
        <TilesetUploader
            mapName={mapName}
            onUpload={(newTileset) => {
                onTilesetAdd(newTileset);
                setShowUploader(false);
            }}
            onClose={() => setShowUploader(false)}
        />
      )}
    </div>
  );
}
