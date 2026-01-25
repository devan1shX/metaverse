"use client";

import { useRef, useEffect, useState } from "react";
import Canvas from "@/components/MapEditor/Canvas";
import TilesetPalette from "@/components/MapEditor/TilesetPalette";
import Toolbar from "@/components/MapEditor/Toolbar";
import LayerPanel from "@/components/MapEditor/LayerPanel";
import { MapData, TilesetConfig, SelectedTiles } from "@/types/MapEditor.types";
import { downloadMapJSON, saveMapToPublic, exportToTiledJSON } from "@/utils/MapExporter";

// Map configuration
const TILE_SIZE = 16;
const GRID_WIDTH = 20; // tiles
const GRID_HEIGHT = 15; // tiles

// Tileset configurations
const TILESETS: TilesetConfig[] = [
  {
    id: "floors",
    name: "Floor Tiles",
    image: "/map-editor/tilesets/floor_tiles.png",
    imageWidth: 176,
    imageHeight: 48,
    tileWidth: 16,
    tileHeight: 16,
    tileCount: 33,
    columns: 11,
    collisionTiles: [], // Floors typically don't have collision
  },
  {
    id: "walls",
    name: "Wall Tiles",
    image: "/map-editor/tilesets/wall_tiles.png",
    imageWidth: 256,
    imageHeight: 112,
    tileWidth: 16,
    tileHeight: 16,
    tileCount: 112,
    columns: 16,
    collisionTiles: [], // User will mark which wall tiles have collision
  },
  {
    id: "objects",
    name: "Object Tiles",
    image: "/map-editor/tilesets/object_tiles.png",
    imageWidth: 176,
    imageHeight: 96,
    tileWidth: 16,
    tileHeight: 16,
    tileCount: 66,
    columns: 11,
    collisionTiles: [], // User will mark which objects block movement
  },
];

export default function MapEditor() {
  const [selectedTileId, setSelectedTileId] = useState<number | null>(null);
  const [selectedTileset, setSelectedTileset] = useState<string>("floors");
  const [selectedTilesetIndex, setSelectedTilesetIndex] = useState<number>(0);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const [mapName, setMapName] = useState<string>("my_custom_map");
  const [currentLayerIndex, setCurrentLayerIndex] = useState<number>(0);
  
  // Multi-tile selection state
  const [selectedTiles, setSelectedTiles] = useState<SelectedTiles | null>(null);

  // Initialize map data with 4 layers
  const [mapData, setMapData] = useState<MapData>({
    width: GRID_WIDTH,
    height: GRID_HEIGHT,
    tilewidth: TILE_SIZE,
    tileheight: TILE_SIZE,
    layers: [
      {
        id: 0,
        name: "Ground",
        type: "tilelayer",
        visible: true,
        opacity: 1,
        data: new Array(GRID_WIDTH * GRID_HEIGHT).fill(null),
        width: GRID_WIDTH,
        height: GRID_HEIGHT,
      },
      {
        id: 1,
        name: "Walls",
        type: "tilelayer",
        visible: true,
        opacity: 1,
        data: new Array(GRID_WIDTH * GRID_HEIGHT).fill(null),
        width: GRID_WIDTH,
        height: GRID_HEIGHT,
      },
      {
        id: 2,
        name: "Objects",
        type: "tilelayer",
        visible: true,
        opacity: 1,
        data: new Array(GRID_WIDTH * GRID_HEIGHT).fill(null),
        width: GRID_WIDTH,
        height: GRID_HEIGHT,
      },
      {
        id: 3,
        name: "Above Objects",
        type: "tilelayer",
        visible: true,
        opacity: 1,
        data: new Array(GRID_WIDTH * GRID_HEIGHT).fill(null),
        width: GRID_WIDTH,
        height: GRID_HEIGHT,
      },
    ],
    tilesets: TILESETS,
  });

  // Handle tileset change
  const handleTilesetChange = (tilesetId: string) => {
    setSelectedTileset(tilesetId);
    const index = TILESETS.findIndex(t => t.id === tilesetId);
    setSelectedTilesetIndex(index);
    setSelectedTileId(null);
    setSelectedTiles(null);
  };

  // Handle multi-tile selection from palette
  const handleTileSelection = (selection: SelectedTiles) => {
    setSelectedTiles(selection);
    setSelectedTileId(selection.tiles[0]?.[0]?.tileId || null);
  };

  // Handle tile painting on canvas (paints on current layer)
  const handleCanvasClick = (tileX: number, tileY: number) => {
    if (!selectedTiles) {
      if (selectedTileId === null) return;

      const index = tileY * GRID_WIDTH + tileX;
      const newData = [...mapData.layers[currentLayerIndex].data];
      
      newData[index] = {
        tileId: selectedTileId,
        tilesetIndex: selectedTilesetIndex,
      };

      const updatedLayers = [...mapData.layers];
      updatedLayers[currentLayerIndex] = {
        ...updatedLayers[currentLayerIndex],
        data: newData,
      };

      setMapData({
        ...mapData,
        layers: updatedLayers,
      });
    } else {
      const newData = [...mapData.layers[currentLayerIndex].data];
      
      for (let row = 0; row < selectedTiles.height; row++) {
        for (let col = 0; col < selectedTiles.width; col++) {
          const canvasX = tileX + col;
          const canvasY = tileY + row;
          
          if (canvasX >= 0 && canvasX < GRID_WIDTH && canvasY >= 0 && canvasY < GRID_HEIGHT) {
            const index = canvasY * GRID_WIDTH + canvasX;
            const tile = selectedTiles.tiles[row]?.[col];
            
            if (tile) {
              newData[index] = {
                tileId: tile.tileId,
                tilesetIndex: selectedTilesetIndex,
              };
            }
          }
        }
      }

      const updatedLayers = [...mapData.layers];
      updatedLayers[currentLayerIndex] = {
        ...updatedLayers[currentLayerIndex],
        data: newData,
      };

      setMapData({
        ...mapData,
        layers: updatedLayers,
      });
    }
  };

  // Handle instant test map
  const handleTestMap = () => {
    try {
      const tiledJSON = exportToTiledJSON(mapData, mapName);
      sessionStorage.setItem('testMapData', JSON.stringify(tiledJSON));
      sessionStorage.setItem('testMapName', mapName);
      
      window.open('/map-editor/test', '_blank');
    } catch (error) {
      alert('Error preparing test map: ' + error);
    }
  };

  // Handle export functions
  const handleDownload = () => {
    downloadMapJSON(mapData, mapName);
    alert(`Map "${mapName}.json" downloaded!`);
  };

  const handleSaveToConsole = () => {
    saveMapToPublic(mapData, mapName);
    alert(`Map JSON logged to console!`);
  };

  // Handle layer selection and visibility
  const handleLayerSelect = (index: number) => {
    setCurrentLayerIndex(index);
  };

  const handleLayerToggle = (index: number) => {
    const updatedLayers = [...mapData.layers];
    updatedLayers[index] = {
      ...updatedLayers[index],
      visible: !updatedLayers[index].visible,
    };
    
    setMapData({
      ...mapData,
      layers: updatedLayers,
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Map Editor</h1>
            <input
              type="text"
              value={mapName}
              onChange={(e) => setMapName(e.target.value)}
              placeholder="Map name"
              className="bg-gray-700 text-white px-3 py-1 rounded border border-gray-600 focus:border-blue-500 outline-none w-48"
            />
          </div>
          <div className="flex gap-3 items-center">
            <button
              onClick={handleTestMap}
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded font-semibold transition-colors shadow-lg"
            >
              🎮 Test Map
            </button>
            <button
              onClick={handleDownload}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-semibold transition-colors shadow-lg"
            >
              💾 Download
            </button>
            <button
              onClick={handleSaveToConsole}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-semibold transition-colors shadow-lg"
            >
              📋 Copy JSON
            </button>
            <span className="text-sm text-gray-400">
              Pos: {cursorPosition ? `(${cursorPosition.x}, ${cursorPosition.y})` : "—"}
            </span>
          </div>
        </div>
        <div className="mt-2 text-sm text-gray-400">
          Selected: {selectedTiles 
            ? `${selectedTiles.width}×${selectedTiles.height} Stamp (${TILESETS[selectedTilesetIndex].name})`
            : selectedTileId !== null 
              ? `Tile #${selectedTileId} (${TILESETS[selectedTilesetIndex].name})` 
              : "None"}
          {" | "}
          <span className="text-blue-400 font-semibold">
            Active Layer: {mapData.layers[currentLayerIndex].name}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Tileset Palette */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 overflow-y-auto">
          <TilesetPalette
            tilesets={TILESETS}
            selectedTileset={selectedTileset}
            selectedTileId={selectedTileId}
            selectedTiles={selectedTiles}
            onTilesetChange={handleTilesetChange}
            onTileSelect={setSelectedTileId}
            onTileSelection={handleTileSelection}
          />
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-900 overflow-auto p-8">
          <Canvas
            mapData={mapData}
            tilesets={TILESETS}
            showGrid={showGrid}
            selectedTileId={selectedTileId}
            selectedTilesetIndex={selectedTilesetIndex}
            selectedTiles={selectedTiles}
            onCanvasClick={handleCanvasClick}
            onCursorMove={setCursorPosition}
          />
        </div>

        {/* Right Sidebar - Layers */}
        <div className="w-64 bg-gray-800 border-l border-gray-700 overflow-y-auto">
          <LayerPanel
            layers={mapData.layers}
            currentLayerIndex={currentLayerIndex}
            onLayerSelect={handleLayerSelect}
            onLayerToggle={handleLayerToggle}
          />
          
          <div className="p-4 border-t border-gray-700">
            <h3 className="text-lg font-bold mb-4">Layer Collision</h3>
            
            <div className="space-y-3">
              <div className={`p-3 rounded ${
                currentLayerIndex === 0 
                  ? 'bg-green-900 border-2 border-green-500'
                  : 'bg-red-900 border-2 border-red-500'
              }`}>
                <div className="font-semibold mb-2">
                  {mapData.layers[currentLayerIndex].name}
                </div>
                <div className="text-sm">
                  {currentLayerIndex === 0 ? (
                    <div className="text-green-200">
                      ✅ <strong>Walkable</strong><br/>
                      Tiles painted here have NO collision
                    </div>
                  ) : (
                    <div className="text-red-200">
                      🚫 <strong>Blocks Movement</strong><br/>
                      Tiles painted here AUTO-COLLIDE
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 bg-blue-900 rounded text-xs text-blue-200">
                <div className="font-semibold mb-2">How it works:</div>
                <div className="space-y-1">
                  <div>• <strong>Ground:</strong> Walkable floors</div>
                  <div>• <strong>Walls:</strong> Auto-collision</div>
                  <div>• <strong>Objects:</strong> Auto-collision</div>
                  <div>• <strong>Above:</strong> Auto-collision</div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-gray-700">
            <h3 className="text-lg font-bold mb-4">Controls</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                className="w-4 h-4"
              />
              <span>Show Grid</span>
            </label>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <Toolbar currentTool="brush" onToolChange={() => {}} />
    </div>
  );
}
