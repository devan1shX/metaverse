"use client";

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { MapData, TilesetConfig, TilePosition, SelectedTiles } from "@/types/MapEditor.types";

interface CanvasProps {
  mapData: MapData;
  tilesets: TilesetConfig[];
  showGrid: boolean;
  selectedTileId: number | null;
  selectedTilesetIndex: number;
  selectedTiles: SelectedTiles | null;
  currentTool: 'brush' | 'eraser';
  scale: number;
  onCanvasClick: (tileX: number, tileY: number) => void;
  onCursorMove: (position: TilePosition | null) => void;
  onStrokeStart?: () => void;
  onStrokeEnd?: () => void;
}

const Canvas = forwardRef<HTMLCanvasElement, CanvasProps>(({
  mapData,
  tilesets,
  showGrid,
  selectedTileId,
  selectedTilesetIndex,
  selectedTiles,
  currentTool,
  scale,
  onCanvasClick,
  onCursorMove,
  onStrokeStart,
  onStrokeEnd,
}, ref) => {
  const localCanvasRef = useRef<HTMLCanvasElement>(null);

  // Expose the canvas ref to parent
  useImperativeHandle(ref, () => localCanvasRef.current as HTMLCanvasElement);
  const [tilesetImages, setTilesetImages] = useState<Map<string, HTMLImageElement>>(new Map());
  const [hoveredTile, setHoveredTile] = useState<TilePosition | null>(null);
  const [isPainting, setIsPainting] = useState(false);
  const [lastPaintedTile, setLastPaintedTile] = useState<string | null>(null);

  const canvasWidth = mapData.width * mapData.tilewidth;
  const canvasHeight = mapData.height * mapData.tileheight;

  // Load tileset images
  useEffect(() => {
    const loadImages = async () => {
      const imageMap = new Map<string, HTMLImageElement>();
      
      const promises = tilesets.map(async (tileset) => {
        try {
          const img = new Image();
          img.src = tileset.image;
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = (e) => reject(new Error(`Failed to load ${tileset.image}`));
          });
          imageMap.set(tileset.id, img);
          console.log(`Loaded tileset image: ${tileset.name} (${tileset.image})`);
        } catch (error) {
          console.error(`Error loading tileset ${tileset.name}:`, error);
        }
      });

      await Promise.all(promises);
      setTilesetImages(imageMap);
    };

    loadImages();
  }, [tilesets]);

  // Render canvas
  useEffect(() => {
    const canvas = localCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas with light background (slate-50)
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw tiles from ALL visible layers (in order: Ground → Walls → Objects → Above)
    mapData.layers.forEach((layer) => {
      if (layer && layer.visible) {
        // Apply layer opacity
        ctx.globalAlpha = layer.opacity;
        
        for (let y = 0; y < mapData.height; y++) {
          for (let x = 0; x < mapData.width; x++) {
            const index = y * mapData.width + x;
            const tileData = layer.data[index];

            if (tileData && tileData.tileId > 0) {
              const tileset = tilesets[tileData.tilesetIndex];
              // Safety check to prevent crash if tileset is missing
              if (!tileset) continue;

              const img = tilesetImages.get(tileset.id);

              if (img && tileset) {
                const tileIndex = tileData.tileId - 1;
                const sourceX = (tileIndex % tileset.columns) * tileset.tileWidth;
                const sourceY = Math.floor(tileIndex / tileset.columns) * tileset.tileHeight;

                ctx.drawImage(
                  img,
                  sourceX,
                  sourceY,
                  tileset.tileWidth,
                  tileset.tileHeight,
                  x * mapData.tilewidth,
                  y * mapData.tileheight,
                  mapData.tilewidth,
                  mapData.tileheight
                );
              }
            }
          }
        }
        
        // Reset opacity for next layer
        ctx.globalAlpha = 1;
      }
    });

    // Draw grid with slate-300 color for light theme (subtle)
    if (showGrid) {
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 0.5;

      for (let x = 0; x <= mapData.width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * mapData.tilewidth, 0);
        ctx.lineTo(x * mapData.tilewidth, canvasHeight);
        ctx.stroke();
      }

      for (let y = 0; y <= mapData.height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * mapData.tileheight);
        ctx.lineTo(canvasWidth, y * mapData.tileheight);
        ctx.stroke();
      }
    }

    // Draw stamp preview when hovering (only for brush tool)
    if (hoveredTile && selectedTiles && tilesetImages.size > 0 && currentTool === 'brush') {
      const tileset = tilesets[selectedTilesetIndex];
      // Safety check if tileset is undefined
      if (!tileset) return;
      
      const img = tilesetImages.get(tileset.id);
      
      if (img) {
        ctx.globalAlpha = 0.5;
        
        for (let row = 0; row < selectedTiles.height; row++) {
          for (let col = 0; col < selectedTiles.width; col++) {
            const tile = selectedTiles.tiles[row]?.[col];
            if (tile) {
              const canvasX = hoveredTile.x + col;
              const canvasY = hoveredTile.y + row;
              
              if (canvasX >= 0 && canvasX < mapData.width && canvasY >= 0 && canvasY < mapData.height) {
                const tileIndex = tile.tileId - 1;
                const sourceX = (tileIndex % tileset.columns) * tileset.tileWidth;
                const sourceY = Math.floor(tileIndex / tileset.columns) * tileset.tileHeight;

                ctx.drawImage(
                  img,
                  sourceX,
                  sourceY,
                  tileset.tileWidth,
                  tileset.tileHeight,
                  canvasX * mapData.tilewidth,
                  canvasY * mapData.tileheight,
                  mapData.tilewidth,
                  mapData.tileheight
                );
              }
            }
          }
        }
        
        ctx.globalAlpha = 1.0;
      }
      
      // Draw stamp outline - Cyan/Teal for dark mode visibility
      ctx.strokeStyle = "#22d3ee";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        hoveredTile.x * mapData.tilewidth,
        hoveredTile.y * mapData.tileheight,
        selectedTiles.width * mapData.tilewidth,
        selectedTiles.height * mapData.tileheight
      );
    } else if (hoveredTile) {
      // Draw single tile highlight
      ctx.strokeStyle = "#22d3ee";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        hoveredTile.x * mapData.tilewidth,
        hoveredTile.y * mapData.tileheight,
        mapData.tilewidth,
        mapData.tileheight
      );
    }
  }, [mapData, showGrid, tilesetImages, tilesets, hoveredTile, selectedTiles, selectedTilesetIndex, canvasWidth, canvasHeight, currentTool, scale]); // Ensure scale is dependency

  // Paint tile at position
  const paintAtPosition = (tileX: number, tileY: number) => {
    if (tileX >= 0 && tileX < mapData.width && tileY >= 0 && tileY < mapData.height) {
      const tileKey = `${tileX},${tileY}`;
      
      // Avoid painting the same tile multiple times in one drag
      if (tileKey !== lastPaintedTile) {
        onCanvasClick(tileX, tileY);
        setLastPaintedTile(tileKey);
      }
    }
  };

  // Handle mouse down - start painting
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = localCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Adjust x/y for scale
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    const tileX = Math.floor(x / mapData.tilewidth);
    const tileY = Math.floor(y / mapData.tileheight);

    setIsPainting(true);
    if (onStrokeStart) onStrokeStart(); // Start stroke history
    setLastPaintedTile(null);
    paintAtPosition(tileX, tileY);
  };

  // Handle mouse move - continue painting if mouse is down
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = localCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    const tileX = Math.floor(x / mapData.tilewidth);
    const tileY = Math.floor(y / mapData.tileheight);

    if (tileX >= 0 && tileX < mapData.width && tileY >= 0 && tileY < mapData.height) {
      setHoveredTile({ x: tileX, y: tileY });
      onCursorMove({ x: tileX, y: tileY });

      // Paint while dragging
      if (isPainting) {
        paintAtPosition(tileX, tileY);
      }
    } else {
      setHoveredTile(null);
      onCursorMove(null);
    }
  };

  // Handle mouse up - stop painting
  const handleMouseUp = () => {
    setIsPainting(false);
    if (onStrokeEnd) onStrokeEnd(); // End stroke history
    setLastPaintedTile(null);
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    setHoveredTile(null);
    onCursorMove(null);
    if (isPainting && onStrokeEnd) onStrokeEnd(); // End stroke history if painting
    setIsPainting(false);
    setLastPaintedTile(null);
  };

  // Add global mouseup listener
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      // We can't easily check isPainting here due to closure, but checking externally or trusting local state
      // Ideally we only fire onStrokeEnd if we were actually painting.
      // Since this is a specialized useEffect, we might miss the latest isPainting state.
      // However, MapEditor tracks global mouseup too. 
      // Let's rely on component-level events for now, or use a ref for isPainting if needed.
      // For now, to keep it simple, we'll update state.
      setIsPainting(false);
      setLastPaintedTile(null);
      // Note: We don't call onStrokeEnd here because we can't be sure if we were painting inside THIS canvas
      // But handleMouseLeave usually catches the exit.
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  return (
    <div 
      className="inline-block border-2 border-slate-200 shadow-lg bg-slate-50 transition-all origin-top-left"   
      style={{ 
        width: `${canvasWidth * scale}px`,
        height: `${canvasHeight * scale}px`,
      }}
    >
      <canvas
        ref={localCanvasRef}
        width={canvasWidth}
        height={canvasHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className={`w-full h-full ${currentTool === 'eraser' ? '' : 'cursor-crosshair'}`}
        style={{
          imageRendering: "pixelated",
          cursor: currentTool === 'eraser' ? `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" fill="%23be185d"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>') 0 24, auto` : undefined
        }}
      />
    </div>
  );
});

export default Canvas;
