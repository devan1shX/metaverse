"use client";

import { useRef, useEffect, useState } from "react";
import Canvas from "@/components/MapEditor/Canvas";
import TilesetPalette from "@/components/MapEditor/TilesetPalette";
import LayerPanel from "@/components/MapEditor/LayerPanel";
import { useToast } from "@/contexts/ToastContext";
import { MapData, TilesetConfig, SelectedTiles } from "@/types/MapEditor.types";
import { downloadMapJSON, saveMapToPublic, exportToTiledJSON } from "@/utils/MapExporter";
import { ChevronLeft, ChevronRight, Brush, Eraser, Grid, Download, Save, Play, Upload, LayoutDashboard, Undo, Redo } from "lucide-react";
import { useHistory } from "@/hooks/useHistory";

// Map configuration
const TILE_SIZE = 16;
// CONSTANTS DELETED: GRID_WIDTH and GRID_HEIGHT are now dynamic state

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
    collisionTiles: [],
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
    collisionTiles: [],
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
    collisionTiles: [],
  },
];

export default function MapEditor() {
  const [tilesets, setTilesets] = useState<TilesetConfig[]>(TILESETS);
  const [selectedTileId, setSelectedTileId] = useState<number | null>(null);
  const [selectedTileset, setSelectedTileset] = useState<string>("floors");
  const [selectedTilesetIndex, setSelectedTilesetIndex] = useState<number>(0);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Setup State
  const [isSetupMode, setIsSetupMode] = useState<boolean>(true);
  const [mapName, setMapName] = useState<string>("My New Map");
  const [mapWidth, setMapWidth] = useState<number>(30);
  const [mapHeight, setMapHeight] = useState<number>(20);

  const [currentLayerIndex, setCurrentLayerIndex] = useState<number>(0);
  const [currentTool, setCurrentTool] = useState<'brush' | 'eraser'>('brush');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(false);
  const [rightCollapsed, setRightCollapsed] = useState<boolean>(false);
  
  const [selectedTiles, setSelectedTiles] = useState<SelectedTiles | null>(null);
  // Default zoom 2x (Physical) = 100% (Visual Perception for Pixel Art)
  const BASE_ZOOM = 2;
  const [zoom, setZoom] = useState<number>(BASE_ZOOM);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [scrollStart, setScrollStart] = useState<{ x: number; y: number } | null>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isCanvasHovered, setIsCanvasHovered] = useState<boolean>(false);

  // Handle Spacebar for Panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !isPanning) {
        setIsPanning(true);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPanning]);

  // Global Toast Hook
  const { showToast } = useToast();

  // const [mapData, setMapData] = useState<MapData | null>(null);
  const { 
    state: mapData,
    set: setMapDataHistory,
    setOverwrite: setMapDataOverwrite,
    reset: resetMapData,
    undo,
    redo,
    canUndo,
    canRedo
  } = useHistory<MapData | null>(null);
  
  // Helper wrapper to match expected setMapData signature for simple updates (which should add history)
  // For specialized updates (strokes), we'll call setMapDataOverwrite directly
  const setMapData = (newData: MapData | null) => {
      setMapDataHistory(newData);
  };

  // Canvas Ref for Thumbnail Capture
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const uploadThumbnail = async (mapId: string) => {
    try {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob) return;

        const formData = new FormData();
        formData.append('mapId', mapId);
        formData.append('thumbnail', blob, 'thumbnail.png');

        const { getAuth } = await import('firebase/auth');
        const user = getAuth().currentUser;
        if (!user) return;
        const token = await user.getIdToken();

        await fetch('http://localhost:3000/metaverse/custom-maps/thumbnail', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        console.log('Thumbnail uploaded successfully');
    } catch (e) {
        console.error('Failed to upload thumbnail', e);
        // Don't show toast for thumbnail failure to avoid annoying user if functionality otherwise works
    }
  };

  const handleCreateMap = () => {
    // ... existing ... 
    // Validation
    const w = Math.max(10, Math.min(100, mapWidth));
    const h = Math.max(10, Math.min(100, mapHeight));
    
    // Initialize empty layers
    const initialLayers = [
      { id: 1, name: "Ground", type: "tilelayer", visible: true, opacity: 1, data: new Array(w * h).fill(null), width: w, height: h },
      { id: 2, name: "Walls", type: "tilelayer", visible: true, opacity: 1, data: new Array(w * h).fill(null), width: w, height: h },
      { id: 3, name: "Objects", type: "tilelayer", visible: true, opacity: 1, data: new Array(w * h).fill(null), width: w, height: h },
      { id: 4, name: "Above Objects", type: "tilelayer", visible: true, opacity: 1, data: new Array(w * h).fill(null), width: w, height: h },
    ];

    setMapData({
      width: w,
      height: h,
      tilewidth: TILE_SIZE,
      tileheight: TILE_SIZE,
      tilesets: TILESETS,
      layers: initialLayers,
    });
    
    // Also reset history with initial state
    resetMapData({
      width: w,
      height: h,
      tilewidth: TILE_SIZE,
      tileheight: TILE_SIZE,
      tilesets: TILESETS,
      layers: initialLayers,
    });
    
    setMapWidth(w);
    setMapHeight(h);
    setIsSetupMode(false);
  };
 
  const handleTilesetChange = (tilesetId: string) => {
    setSelectedTileset(tilesetId);
    const index = tilesets.findIndex(t => t.id === tilesetId);
    setSelectedTilesetIndex(index);
    setSelectedTileId(null);
    setSelectedTiles(null);
  };
  
  const handleTilesetAdd = (newTileset: TilesetConfig) => {
    const newIndex = tilesets.length;
    setTilesets(prev => [...prev, newTileset]);
    setSelectedTileset(newTileset.id);
    setSelectedTilesetIndex(newIndex);
    setSelectedTileId(null);
    setSelectedTiles(null);
    if (mapData) {
        setMapData({
            ...mapData,
            tilesets: [...mapData.tilesets, newTileset]
        });
    }
  };

  const handleTileSelection = (selection: SelectedTiles) => {
    setSelectedTiles(selection);
    setSelectedTileId(selection.tiles[0]?.[0]?.tileId || null);
  };


  
  const isStrokeActiveRef = useRef(false);
  const hasPushedStrokeRef = useRef(false);

  const onStrokeStart = () => {
      isStrokeActiveRef.current = true;
      // We DON'T prevent the push here. The first click MUST push.
  };
  
  const handleCanvasClick = (tileX: number, tileY: number) => {
     if (!mapData) return;
     // ... logic to calculate new mapData ...
     const index = tileY * mapData.width + tileX;
     const newData = [...mapData.layers[currentLayerIndex].data];
     
     // REPLICATING LOGIC TO GET newMapData
     let newMapData = mapData;
     
     if (currentTool === 'eraser') {
        newData[index] = null;
        const updatedLayers = [...mapData.layers];
        updatedLayers[currentLayerIndex] = { ...updatedLayers[currentLayerIndex], data: newData };
        newMapData = { ...mapData, layers: updatedLayers };
     } else {
         if (!selectedTiles) {
              if (selectedTileId === null) return;
              newData[index] = { tileId: selectedTileId, tilesetIndex: selectedTilesetIndex };
              const updatedLayers = [...mapData.layers];
              updatedLayers[currentLayerIndex] = { ...updatedLayers[currentLayerIndex], data: newData };
              newMapData = { ...mapData, layers: updatedLayers };
         } else {
             // ... stamps ...
             for (let row = 0; row < selectedTiles.height; row++) {
                for (let col = 0; col < selectedTiles.width; col++) {
                  const canvasX = tileX + col;
                  const canvasY = tileY + row;
                  if (canvasX >= 0 && canvasX < mapData.width && canvasY >= 0 && canvasY < mapData.height) {
                    const stampIndex = canvasY * mapData.width + canvasX;
                    const tile = selectedTiles.tiles[row]?.[col];
                    if (tile) newData[stampIndex] = { tileId: tile.tileId, tilesetIndex: selectedTilesetIndex };
                  }
                }
              }
              const updatedLayers = [...mapData.layers];
              updatedLayers[currentLayerIndex] = { ...updatedLayers[currentLayerIndex], data: newData };
              newMapData = { ...mapData, layers: updatedLayers };
         }
     }
     
     // HISTORY DECISION
     if (isStrokeActiveRef.current) {
          if (!hasPushedStrokeRef.current) {
              setMapDataHistory(newMapData);
              hasPushedStrokeRef.current = true;
          } else {
              setMapDataOverwrite(newMapData);
          }
     } else {
         // Single click (should ideally be covered by stroke logic if Canvas implements it well, but if not:)
         setMapDataHistory(newMapData);
     }
  };

  const onStrokeEnd = () => {
      isStrokeActiveRef.current = false;
      hasPushedStrokeRef.current = false;
  };

  // Keyboard Shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Create custom map keyboard handling
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            undo();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
            e.preventDefault();
            redo();
        }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const handleTestMap = () => {
    if (!mapData) return;
    try {
      const tiledJSON = exportToTiledJSON(mapData, mapName);
      sessionStorage.setItem('testMapData', JSON.stringify(tiledJSON));
      sessionStorage.setItem('testMapName', mapName);
      window.open('/map-editor/test', '_blank');
    } catch (error) {
      showToast('Error preparing test map: ' + error, 'error');
    }
  };

  const handleDownload = () => {
    if (!mapData) return;
    downloadMapJSON(mapData, mapName);
    showToast(`Map "${mapName}.json" downloaded!`, 'success');
  };

  const handleLayerSelect = (index: number) => setCurrentLayerIndex(index);
  
  const handleLayerToggle = (index: number) => {
    if (!mapData) return;
    const updatedLayers = [...mapData.layers];
    updatedLayers[index] = { ...updatedLayers[index], visible: !updatedLayers[index].visible };
    setMapData({ ...mapData, layers: updatedLayers });
  };

  const handleLayerClear = (index: number) => {
    if (!mapData) return;
    const updatedLayers = [...mapData.layers];
    updatedLayers[index] = { ...updatedLayers[index], data: new Array(mapData.width * mapData.height).fill(null) };
    setMapData({ ...mapData, layers: updatedLayers });
  };

  const handleLayerOpacityChange = (index: number, opacity: number) => {
    if (!mapData) return;
    const updatedLayers = [...mapData.layers];
    updatedLayers[index] = { ...updatedLayers[index], opacity };
    setMapData({ ...mapData, layers: updatedLayers });
  };

  const handleSaveToServer = async () => {
    if (!mapData) return;
    try {
        const response = await fetch('http://localhost:3000/metaverse/maps/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mapName: mapName,
                mapData: {
                    ...mapData,
                    tilesets: tilesets // Use current dynamic tilesets
                }
            })
        });
        const result = await response.json();
        if (result.success) {
            showToast('Map saved to server successfully!', 'success');
            // Try to upload thumbnail if we can identify the map ID or if generic save supports it
            // Note: The generic 'save' endpoint saves by name, not ID. 
            // Thumbnail usually requires a consistent ID. For 'custom-maps' we have an ID.
            // For file-based maps, maybe we skip thumbnail or use name? 
            // The instructions mostly focus on "Custom Maps" which are imported to spaces. 
            // But let's see if we can support it here too if needed. 
            // For now, only custom maps (CreateSpace flow) definitely have the collection-based structure.
        } else {
            showToast('Failed to save map: ' + result.message, 'error');
        }
    } catch (e: any) {
        console.error(e);
        showToast('Error saving map: ' + e.message, 'error');
    }
  };
  
  // ... other handlers ...

  const handleImportToSpaces = async () => {
    setIsImporting(true);
    try {
      const { getAuth } = await import('firebase/auth');
      const firebaseAuth = getAuth();
      const user = firebaseAuth.currentUser;
      if (!user) {
        showToast('Please sign in to import maps to spaces', 'error');
        setIsImporting(false);
        return;
        }
      const token = await user.getIdToken();
      if (!mapData) return; // Guard
      const tiledJSON = exportToTiledJSON(mapData, mapName);
      const mapResponse = await fetch('http://localhost:3000/metaverse/custom-maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ mapData: tiledJSON, mapName: mapName }),
      });
      const mapResult = await mapResponse.json();
      if (!mapResult.success) {
        showToast(`Failed to import map: ${mapResult.message}`, 'error');
        setIsImporting(false);
        return;
      }
      const customMapId = mapResult.mapId;
      
      // Upload Thumbnail immediately after custom map creation
      await uploadThumbnail(customMapId);

      const spaceResponse = await fetch('http://localhost:3000/metaverse/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
            name: mapName || 'My Custom Map Space', 
            description: 'Space created from custom map editor', 
            isPublic: true, 
            maxUsers: 50, 
            mapId: customMapId,
            mapImageUrl: `/maps/custom/thumbnails/${customMapId}.png`
        }),
      });
      const spaceResult = await spaceResponse.json();
      
      if (spaceResult.success) {
        showToast(`Success! Space "${spaceResult.space.name}" created.`, 'success');
        setTimeout(() => { window.location.href = '/dashboard'; }, 1500);
      } else {
        // Robust Error Handling for Space Creation
        let errorMsg = spaceResult.message || "Failed to create space";
        
        // Check array errors (as seen in SpaceService.js)
        if (spaceResult.errors && Array.isArray(spaceResult.errors)) {
            if (spaceResult.errors.some((e: string) => e.toLowerCase().includes('space name already exists'))) {
                errorMsg = `Space Name "${mapName}" is already taken. Please rename your map in the sidebar.`;
            } else {
                errorMsg = spaceResult.errors.join(', ');
            }
        } 
        // Check string error (fallback)
        else if (spaceResult.error && typeof spaceResult.error === 'string') {
             if (spaceResult.error.toLowerCase().includes('space name already exists')) {
                 errorMsg = `Space Name "${mapName}" is already taken. Please rename your map in the sidebar.`;
             } else {
                 errorMsg = spaceResult.error;
             }
        }
        // Check main message field
        else if (spaceResult.message && spaceResult.message.toLowerCase().includes('unique constraint')) {
            errorMsg = `Space Name "${mapName}" is already taken. Please rename your map in the sidebar.`;
        }

        showToast(errorMsg, 'error');
      }
    } catch (error: any) {
      console.error('Import error:', error);
      showToast(`Error importing map: ${error.message || error}`, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex h-full w-full bg-slate-50 text-slate-800 overflow-hidden relative">
      


      {/* SETUP SCREEN MODAL */}
      {isSetupMode && (
         <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-50/50 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-2xl shadow-2xl border border-slate-200 w-96 max-w-full">
               <div className="text-center mb-6">
                 <h1 className="text-2xl font-bold text-slate-800 mb-2">Create New Map</h1>
                 <p className="text-slate-500 text-sm">Define your map dimensions to get started.</p>
               </div>
               
               <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Map Name</label>
                    <input
                      type="text"
                      value={mapName}
                      onChange={(e) => setMapName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      placeholder="e.g. Forest Level 1"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Width (Tiles)</label>
                       <input
                         type="number"
                         min="10"
                         max="100"
                         value={mapWidth}
                         onChange={(e) => setMapWidth(parseInt(e.target.value) || 10)}
                         className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                       />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Height (Tiles)</label>
                       <input
                         type="number"
                         min="10"
                         max="100"
                         value={mapHeight}
                         onChange={(e) => setMapHeight(parseInt(e.target.value) || 10)}
                         className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                       />
                     </div>
                  </div>
                  
                  <div className="text-xs text-slate-400 text-center pt-2">
                     Min: 10x10 • Max: 100x100
                  </div>
                  
                  <button
                    onClick={handleCreateMap}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-[0.98] mt-2"
                  >
                    Start Creating
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Editor Content - Only clickable when not in setup mode */}
      <div className={`flex h-full w-full ${isSetupMode ? 'pointer-events-none blur-[2px]' : ''}`}>
      
      {/* LEFT SIDEBAR - Tools & Tilesets */}
      <div 
        className={`bg-white transition-all duration-300 ease-in-out relative overflow-hidden ${leftCollapsed ? 'w-0 border-none' : 'w-80 border-r border-slate-200'}`}
      >
        <div className="w-80 flex flex-col h-full bg-white overflow-hidden relative border-r border-slate-200">
          
          {/* Header & Tools - Compact */}
          <div className="p-3 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tools</span>
            
            <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
               <button
                onClick={() => setCurrentTool('brush')}
                className={`p-1.5 rounded transition-all border ${
                  currentTool === 'brush' 
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                }`}
                title="Brush"
              >
                <Brush className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentTool('eraser')}
                className={`p-1.5 rounded transition-all border ${
                  currentTool === 'eraser' 
                    ? 'bg-rose-600 border-rose-500 text-white shadow-sm' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                }`}
                title="Eraser"
              >
                <Eraser className="w-4 h-4" />
              </button>
              <div className="w-px bg-slate-300 mx-1"></div>
              
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`p-1.5 rounded transition-all border ${
                  showGrid
                    ? 'bg-emerald-600/10 text-emerald-600 border-emerald-600/30' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                }`}
                title="Grid"
              >
                <Grid className="w-4 h-4" />
              </button>
              </div>
              
              <div className="w-px bg-slate-300 mx-1"></div>
              
              <button
                onClick={() => undo()}
                disabled={!canUndo}
                className={`p-1.5 rounded transition-all border ${
                  canUndo
                    ? 'border-transparent text-slate-500 hover:text-indigo-600 hover:bg-slate-200 cursor-pointer' 
                    : 'border-transparent text-slate-200 cursor-not-allowed'
                }`}
                title="Undo (Ctrl+Z)"
              >
                <Undo className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => redo()}
                disabled={!canRedo}
                className={`p-1.5 rounded transition-all border ${
                  canRedo
                    ? 'border-transparent text-slate-500 hover:text-indigo-600 hover:bg-slate-200 cursor-pointer' 
                    : 'border-transparent text-slate-200 cursor-not-allowed'
                }`}
                title="Redo (Ctrl+Y)"
              >
                <Redo className="w-4 h-4" />
              </button>
          </div>

          <div className="flex-1 w-full min-h-0">
            <TilesetPalette
              tilesets={tilesets}
              selectedTileset={selectedTileset}
              selectedTileId={selectedTileId}
              selectedTiles={selectedTiles}
              onTilesetChange={handleTilesetChange}
              onTileSelect={setSelectedTileId}
              onTileSelection={handleTileSelection}
              onTilesetAdd={handleTilesetAdd}
              mapName={mapName}
            />
          </div>
        </div>
      </div>

       {/* LEFT COLLAPSE TOGGLE */}
       <div className="relative h-full w-0 z-20">
          <button
           onClick={() => setLeftCollapsed(!leftCollapsed)}
           className="absolute top-1/2 -translate-y-1/2 -right-3 bg-white border border-slate-200 rounded-full p-1 shadow-md hover:bg-slate-50 hover:text-slate-900 text-slate-400 transition-all z-50 flex items-center justify-center w-6 h-6"
           title={leftCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
         >
           {leftCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
         </button>
       </div>


      {/* MAIN CANVAS AREA */}
      <div className="flex-1 relative bg-slate-50 flex flex-col min-w-0 overflow-hidden">
        {/* Canvas Toolbar Status */}
        {/* Canvas Toolbar Status - Auto Hides */}
        <div 
          className={`absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur border border-slate-200 px-4 py-2 rounded-full shadow-lg shadow-slate-200/50 z-10 flex items-center gap-4 text-xs transition-opacity duration-300 ${isCanvasHovered ? 'opacity-100' : 'opacity-0'}`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-600 font-medium">Map Size: {mapData ? `${mapData.width}×${mapData.height}` : '...'}</span>
          </div>
          <div className="w-px h-3 bg-slate-200"></div>
          <div className="text-slate-500">
             {selectedTiles ? (
               <span className="text-indigo-600 font-medium">{selectedTiles.width}×{selectedTiles.height} Stamp</span>
             ) : selectedTileId !== null ? (
               <span className="text-emerald-600 font-medium">Tile #{selectedTileId}</span>
             ) : (
               "No Selection"
             )}
          </div>
          <div className="w-px h-3 bg-slate-200"></div>
          <div className="text-slate-500">
            Layer: <span className="text-slate-800 font-medium">{mapData?.layers[currentLayerIndex]?.name || '...'}</span>
          </div>
        </div>

        {/* Scrollable Canvas Container */}
        <div 
          ref={scrollContainerRef}
          className={`flex-1 overflow-auto flex items-center justify-center p-8 custom-scrollbar relative ${isPanning ? 'cursor-grab active:cursor-grabbing select-none' : ''}`}
          onMouseEnter={() => setIsCanvasHovered(true)}
          onMouseDown={(e) => {
            if (isPanning && scrollContainerRef.current) {
              setPanStart({ x: e.clientX, y: e.clientY });
              setScrollStart({ x: scrollContainerRef.current.scrollLeft, y: scrollContainerRef.current.scrollTop });
            }
          }}
          onMouseMove={(e) => {
            if (isPanning && panStart && scrollStart && scrollContainerRef.current) {
              const dx = e.clientX - panStart.x;
              const dy = e.clientY - panStart.y;
              scrollContainerRef.current.scrollLeft = scrollStart.x - dx;
              scrollContainerRef.current.scrollTop = scrollStart.y - dy;
            }
          }}
          onMouseUp={() => {
            setPanStart(null);
            setScrollStart(null);
          }}
          onMouseLeave={() => {
            setPanStart(null);
            setScrollStart(null);
            setIsCanvasHovered(false);
          }}
        >
           <div className="shadow-2xl shadow-slate-300/50 border border-slate-200">
            {mapData && (
             <Canvas
               ref={canvasRef}
               mapData={mapData}
               tilesets={tilesets}
               showGrid={showGrid}
               selectedTileId={selectedTileId}
               selectedTilesetIndex={selectedTilesetIndex}
               selectedTiles={selectedTiles}
               currentTool={currentTool}
               scale={zoom}
               onCanvasClick={handleCanvasClick}
               onCursorMove={setCursorPosition}
               onStrokeStart={onStrokeStart}
               onStrokeEnd={onStrokeEnd}
             />
            )}
           </div>
        </div>

        {/* Zoom Controls & Help */}
        <div className="absolute bottom-6 right-6 flex flex-col gap-3 group z-20">
           {/* Controls Help Tooltip */}
           <div className="absolute bottom-full right-0 mb-2 w-max bg-white border border-slate-200 p-3 rounded-lg shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none">
             <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Navigation</h4>
             <ul className="text-xs text-slate-600 space-y-1">
               <li className="flex items-center gap-2">
                 <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] border border-slate-200 shadow-sm">Space</span>
                 <span>+ Drag to Pan</span>
               </li>
               <li className="flex items-center gap-2">
                 <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] border border-slate-200 shadow-sm">Scroll</span>
                 <span>to Pan Vertical</span>
               </li>
             </ul>
           </div>

           <div className="flex flex-col bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
             <button 
               onClick={() => setZoom(prev => Math.min(prev + 0.5, 6))}
               className="p-2 hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-colors border-b border-slate-200"
               title="Zoom In"
             >
               <span className="font-bold text-lg leading-none">+</span>
             </button>
             <div className="px-1 py-1 text-center text-[10px] font-medium text-slate-500 bg-slate-50 cursor-default">
               {Math.round((zoom / BASE_ZOOM) * 100)}%
             </div>
             <button 
               onClick={() => setZoom(prev => Math.max(prev - 0.5, 1))}
               className="p-2 hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-colors border-t border-slate-200"
               title="Zoom Out"
             >
               <span className="font-bold text-lg leading-none">-</span>
             </button>
           </div>
           
           <button 
            onClick={() => setZoom(BASE_ZOOM)}
            className="self-end p-2 bg-white border border-slate-200 rounded-lg shadow hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-colors text-xs font-medium"
            title="Reset View"
           >
             Reset
           </button>
        </div>
      </div>


       {/* RIGHT COLLAPSE TOGGLE */}
       <div className="relative h-full w-0 z-20">
         <button
          onClick={() => setRightCollapsed(!rightCollapsed)}
          className="absolute top-1/2 -translate-y-1/2 -left-3 bg-white border border-slate-200 rounded-full p-1 shadow-md hover:bg-slate-50 hover:text-slate-900 text-slate-400 transition-all z-50 flex items-center justify-center w-6 h-6"
          title={rightCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {rightCollapsed ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
      </div>

      {/* RIGHT SIDEBAR - Project & Layers */}
      <div 
        className={`bg-white transition-all duration-300 ease-in-out relative overflow-hidden ${rightCollapsed ? 'w-0 border-none' : 'w-80 border-l border-slate-200'}`}
      >
        <div className="w-80 flex flex-col h-full bg-white overflow-hidden relative">
        
        {/* Project Header */}
        <div className="p-4 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">Project Settings</h2>
          <a 
            href="/dashboard" 
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
            title="Back to Dashboard"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Dashboard
          </a>
        </div>
        <div className="p-4 border-b border-slate-200 bg-white shrink-0">
          <div className="space-y-3">
             <div>
               <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1 block">Map Name</label>
               <input
                type="text"
                value={mapName}
                onChange={(e) => setMapName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                placeholder="Enter map name..."
              />
             </div>
             
             {/* Action Buttons Grid */}
             <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={handleTestMap}
                  className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-3 rounded text-xs font-medium transition-colors"
                >
                  <Play className="w-3 h-3 fill-current" /> Test Map
                </button>
                <button 
                  onClick={handleSaveToServer}
                  className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-3 rounded text-xs font-medium transition-colors"
                >
                  <Save className="w-3 h-3" /> Save to Server
                </button>
                <button 
                  onClick={handleDownload}
                  className="col-span-2 flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 py-2 px-3 rounded text-xs font-medium transition-colors"
                >
                  <Download className="w-3 h-3" /> Export JSON
                </button>
                <button 
                  onClick={handleImportToSpaces}
                  disabled={isImporting}
                  className="col-span-2 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-3 rounded text-xs font-medium transition-colors"
                >
                  <Upload className="w-3 h-3" /> {isImporting ? 'Importing...' : 'Import to Spaces'}
                </button>
             </div>
          </div>
        </div>

        {/* Layers Section */}
        <div className="flex-1 overflow-hidden flex flex-col w-full min-h-0">
           {mapData && (
             <LayerPanel
              layers={mapData.layers}
              currentLayerIndex={currentLayerIndex}
              onLayerSelect={handleLayerSelect}
              onLayerToggle={handleLayerToggle}
              onLayerClear={handleLayerClear}
              onLayerOpacityChange={handleLayerOpacityChange}
            />
           )}
        </div>

        </div>
      </div>
     </div>
    </div>
  );
}
