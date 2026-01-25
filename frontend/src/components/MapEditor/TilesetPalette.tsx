"use client";

import { useEffect, useState } from "react";
import { TilesetConfig, SelectedTiles } from "@/types/MapEditor.types";

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

  const currentTileset = tilesets.find((t) => t.id === selectedTileset);

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
              relative border cursor-pointer transition-all select-none
              ${isSelected ? "border-green-500 border-2 shadow-lg shadow-green-500/50" : "border-gray-600"}
              ${isInCurrentSelection ? "bg-blue-500/30" : ""}
              hover:border-blue-400
            `}
            style={{
              width: `${currentTileset.tileWidth * 2}px`,
              height: `${currentTileset.tileHeight * 2}px`,
              userSelect: 'none',
              WebkitUserSelect: 'none',
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
            <div className="absolute bottom-0 right-0 bg-black bg-opacity-70 text-white text-[8px] px-1 pointer-events-none">
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
      className="p-4" 
      onMouseLeave={() => {
        if (isSelecting) {
          handleMouseUp();
        }
      }}
    >
      <h3 className="text-lg font-bold mb-4">Tileset Palette</h3>

      {/* Tileset Selector */}
      <div className="mb-4">
        <select
          value={selectedTileset}
          onChange={(e) => onTilesetChange(e.target.value)}
          className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
        >
          {tilesets.map((tileset) => (
            <option key={tileset.id} value={tileset.id}>
              {tileset.name}
            </option>
          ))}
        </select>
      </div>

      {/* Selection Info */}
      {selectedTiles && selectedTiles.width > 1 || selectedTiles && selectedTiles.height > 1 ? (
        <div className="mb-4 p-2 bg-blue-700 rounded text-sm">
          <div className="text-blue-200">Stamp Selected:</div>
          <div className="font-bold text-white">{selectedTiles.width}×{selectedTiles.height} tiles</div>
        </div>
      ) : selectedTileId !== null ? (
        <div className="mb-4 p-2 bg-gray-700 rounded text-sm">
          <div className="text-gray-400">Selected Tile:</div>
          <div className="font-bold text-green-400">#{selectedTileId}</div>
        </div>
      ) : null}

      <div className="mb-2 text-xs text-gray-400">
        💡 Click and drag to select multiple tiles
      </div>

      {/* Tile Grid */}
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${currentTileset?.columns || 4}, 1fr)`,
        }}
        onMouseUp={handleMouseUp}
      >
        {renderTileGrid()}
      </div>

      {/* Tileset Info */}
      {currentTileset && (
        <div className="mt-4 text-xs text-gray-400">
          <div>Tiles: {currentTileset.tileCount}</div>
          <div>Size: {currentTileset.tileWidth}×{currentTileset.tileHeight}px</div>
        </div>
      )}
    </div>
  );
}
