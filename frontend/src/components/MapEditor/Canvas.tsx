"use client";

import { useRef, useEffect, useState } from "react";
import { MapData, TilesetConfig, TilePosition, SelectedTiles } from "@/types/MapEditor.types";

interface CanvasProps {
  mapData: MapData;
  tilesets: TilesetConfig[];
  showGrid: boolean;
  selectedTileId: number | null;
  selectedTilesetIndex: number;
  selectedTiles: SelectedTiles | null;
  currentTool: 'brush' | 'eraser';
  onCanvasClick: (tileX: number, tileY: number) => void;
  onCursorMove: (position: TilePosition | null) => void;
}

export default function Canvas({
  mapData,
  tilesets,
  showGrid,
  selectedTileId,
  selectedTilesetIndex,
  selectedTiles,
  currentTool,
  onCanvasClick,
  onCursorMove,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

      for (const tileset of tilesets) {
        const img = new Image();
        img.src = tileset.image;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        imageMap.set(tileset.id, img);
      }

      setTilesetImages(imageMap);
    };

    loadImages().catch((error) => {
      console.error("Failed to load tileset images:", error);
    });
  }, [tilesets]);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#1a1a1a";
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

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = "#4a4a4a";
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

    // Draw stamp preview when hovering
    if (hoveredTile && selectedTiles && tilesetImages.size > 0) {
      const tileset = tilesets[selectedTilesetIndex];
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
      
      // Draw stamp outline
      ctx.strokeStyle = "#4CAF50";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        hoveredTile.x * mapData.tilewidth,
        hoveredTile.y * mapData.tileheight,
        selectedTiles.width * mapData.tilewidth,
        selectedTiles.height * mapData.tileheight
      );
    } else if (hoveredTile) {
      // Draw single tile highlight
      ctx.strokeStyle = "#4CAF50";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        hoveredTile.x * mapData.tilewidth,
        hoveredTile.y * mapData.tileheight,
        mapData.tilewidth,
        mapData.tileheight
      );
    }
  }, [mapData, showGrid, tilesetImages, tilesets, hoveredTile, selectedTiles, selectedTilesetIndex, canvasWidth, canvasHeight]);

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
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const tileX = Math.floor(x / mapData.tilewidth);
    const tileY = Math.floor(y / mapData.tileheight);

    setIsPainting(true);
    setLastPaintedTile(null);
    paintAtPosition(tileX, tileY);
  };

  // Handle mouse move - continue painting if mouse is down
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

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
    setLastPaintedTile(null);
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    setHoveredTile(null);
    onCursorMove(null);
    setIsPainting(false);
    setLastPaintedTile(null);
  };

  // Add global mouseup listener
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsPainting(false);
      setLastPaintedTile(null);
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  return (
    <div className="inline-block border-2 border-gray-700 shadow-lg">
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className={currentTool === 'eraser' ? 'cursor-not-allowed' : 'cursor-crosshair'}
        style={{
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}
