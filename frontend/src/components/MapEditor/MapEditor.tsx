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
    <div className="relative flex h-full w-full overflow-hidden bg-[radial-gradient(circle_at_top,rgba(215,163,102,0.09),transparent_28%),linear-gradient(180deg,#0f1520_0%,#090d14_100%)] text-[var(--text-primary)]">
      


      {/* SETUP SCREEN MODAL */}
      {isSetupMode && (
         <div className="overlay-backdrop absolute inset-0 z-50 flex items-center justify-center p-4">
            <div className="modal-shell w-96 max-w-full p-8">
               <div className="text-center mb-6">
                 <h1 className="mb-2 text-2xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">Create New Map</h1>
                 <p className="text-sm text-[var(--text-muted)]">Define your map dimensions, then shape the world around the canvas.</p>
               </div>
               
               <div className="space-y-4">
                  <div>
                    <label className="surface-label mb-1 block">Map Name</label>
                    <input
                      type="text"
                      value={mapName}
                      onChange={(e) => setMapName(e.target.value)}
                      className="input-field rounded-[18px] px-4 py-3"
                      placeholder="e.g. Forest Level 1"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="surface-label mb-1 block">Width (Tiles)</label>
                       <input
                         type="number"
                         min="10"
                         max="100"
                         value={mapWidth}
                         onChange={(e) => setMapWidth(parseInt(e.target.value) || 10)}
                         className="input-field rounded-[18px] px-4 py-3"
                       />
                     </div>
                     <div>
                       <label className="surface-label mb-1 block">Height (Tiles)</label>
                       <input
                         type="number"
                         min="10"
                         max="100"
                         value={mapHeight}
                         onChange={(e) => setMapHeight(parseInt(e.target.value) || 10)}
                         className="input-field rounded-[18px] px-4 py-3"
                       />
                     </div>
                  </div>
                  
                  <div className="pt-2 text-center text-xs text-[var(--text-soft)]">
                     Min: 10x10 • Max: 100x100
                  </div>
                  
                  <button
                    onClick={handleCreateMap}
                    className="btn-primary mt-2 w-full"
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
        className={`relative overflow-hidden transition-all duration-300 ease-[var(--ease-spring)] ${leftCollapsed ? 'w-0 border-none' : 'w-80 border-r border-[var(--border-default)]'}`}
      >
        <div className="glass-panel relative flex h-full w-80 flex-col overflow-hidden rounded-none border-0 border-r border-[var(--border-default)] bg-[rgba(11,15,23,0.78)]">
          
          {/* Header & Tools - Compact */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border-default)] px-4 py-4">
            <div>
              <span className="surface-label">Tools</span>
              <p className="mt-1 text-xs text-[var(--text-soft)]">Brush, erase, and stamp without losing sight of the world.</p>
            </div>
            
            <div className="flex rounded-full border border-[var(--border-default)] bg-white/5 p-1">
               <button
                onClick={() => setCurrentTool('brush')}
                className={`rounded-full border p-2 transition-all ${
                  currentTool === 'brush' 
                    ? 'border-[rgba(239,188,130,0.26)] bg-[rgba(215,163,102,0.16)] text-[var(--accent-strong)]' 
                    : 'border-transparent text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]'
                }`}
                title="Brush"
              >
                <Brush className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentTool('eraser')}
                className={`rounded-full border p-2 transition-all ${
                  currentTool === 'eraser' 
                    ? 'border-[rgba(239,124,120,0.2)] bg-[var(--danger-soft)] text-[var(--danger)]' 
                    : 'border-transparent text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]'
                }`}
                title="Eraser"
              >
                <Eraser className="w-4 h-4" />
              </button>
              <div className="mx-1 w-px bg-[var(--border-default)]"></div>
              
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`rounded-full border p-2 transition-all ${
                  showGrid
                    ? 'border-[rgba(239,188,130,0.26)] bg-[rgba(215,163,102,0.16)] text-[var(--accent-strong)]' 
                    : 'border-transparent text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]'
                }`}
                title="Grid"
              >
                <Grid className="w-4 h-4" />
              </button>
              </div>
              
              <div className="mx-1 w-px bg-[var(--border-default)]"></div>
              
              <button
                onClick={() => undo()}
                disabled={!canUndo}
                className={`rounded-full border p-2 transition-all ${
                  canUndo
                    ? 'border-transparent text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--accent-strong)] cursor-pointer' 
                    : 'border-transparent text-[var(--text-soft)] cursor-not-allowed'
                }`}
                title="Undo (Ctrl+Z)"
              >
                <Undo className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => redo()}
                disabled={!canRedo}
                className={`rounded-full border p-2 transition-all ${
                  canRedo
                    ? 'border-transparent text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--accent-strong)] cursor-pointer' 
                    : 'border-transparent text-[var(--text-soft)] cursor-not-allowed'
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
           className="glass-bar absolute -right-3 top-1/2 z-50 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full p-1 text-[var(--text-secondary)] transition-all hover:text-[var(--text-primary)]"
           title={leftCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
         >
           {leftCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
         </button>
       </div>


      {/* MAIN CANVAS AREA */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent_52%)]">
        {/* Canvas Toolbar Status */}
        {/* Canvas Toolbar Status - Auto Hides */}
        <div 
          className={`glass-bar absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-4 rounded-full px-4 py-2 text-xs transition-all duration-300 ${isCanvasHovered ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'}`}
        >
          <div className="flex items-center gap-2">
            <span className="status-dot animate-pulse"></span>
            <span className="font-medium text-[var(--text-secondary)]">Map Size: {mapData ? `${mapData.width}×${mapData.height}` : '...'}</span>
          </div>
          <div className="h-3 w-px bg-[var(--border-default)]"></div>
          <div className="text-[var(--text-soft)]">
             {selectedTiles ? (
               <span className="font-medium text-[var(--accent-strong)]">{selectedTiles.width}×{selectedTiles.height} Stamp</span>
             ) : selectedTileId !== null ? (
               <span className="font-medium text-[var(--accent-strong)]">Tile #{selectedTileId}</span>
             ) : (
               "No Selection"
             )}
          </div>
          <div className="h-3 w-px bg-[var(--border-default)]"></div>
          <div className="text-[var(--text-soft)]">
            Layer: <span className="font-medium text-[var(--text-primary)]">{mapData?.layers[currentLayerIndex]?.name || '...'}</span>
          </div>
        </div>

        {/* Scrollable Canvas Container */}
        <div 
          ref={scrollContainerRef}
          className={`relative flex flex-1 items-center justify-center overflow-auto p-8 ${isPanning ? 'cursor-grab select-none active:cursor-grabbing' : ''}`}
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
           <div className="rounded-[28px] border border-[rgba(214,223,234,0.1)] bg-[rgba(8,11,16,0.44)] p-4 shadow-[0_28px_80px_rgba(2,6,12,0.34)] backdrop-blur-sm">
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
           <div className="glass-panel pointer-events-none absolute bottom-full right-0 mb-2 w-max translate-y-2 rounded-[20px] p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
             <h4 className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">Navigation</h4>
             <ul className="space-y-1 text-xs text-[var(--text-secondary)]">
               <li className="flex items-center gap-2">
                 <span className="rounded-full border border-[var(--border-default)] bg-white/5 px-2 py-0.5 text-[10px] text-[var(--text-primary)]">Space</span>
                 <span>+ Drag to Pan</span>
               </li>
               <li className="flex items-center gap-2">
                 <span className="rounded-full border border-[var(--border-default)] bg-white/5 px-2 py-0.5 text-[10px] text-[var(--text-primary)]">Scroll</span>
                 <span>to Pan Vertical</span>
               </li>
             </ul>
           </div>

           <div className="glass-bar flex flex-col overflow-hidden rounded-[20px]">
             <button 
               onClick={() => setZoom(prev => Math.min(prev + 0.5, 6))}
               className="border-b border-[var(--border-default)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-white/5 hover:text-[var(--text-primary)]"
               title="Zoom In"
             >
               <span className="font-bold text-lg leading-none">+</span>
             </button>
             <div className="cursor-default bg-black/10 px-2 py-1 text-center text-[10px] font-medium text-[var(--text-muted)]">
               {Math.round((zoom / BASE_ZOOM) * 100)}%
             </div>
             <button 
               onClick={() => setZoom(prev => Math.max(prev - 0.5, 1))}
               className="border-t border-[var(--border-default)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-white/5 hover:text-[var(--text-primary)]"
               title="Zoom Out"
             >
               <span className="font-bold text-lg leading-none">-</span>
             </button>
           </div>
           
           <button 
            onClick={() => setZoom(BASE_ZOOM)}
            className="glass-bar self-end rounded-full px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
          className="glass-bar absolute -left-3 top-1/2 z-50 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full p-1 text-[var(--text-secondary)] transition-all hover:text-[var(--text-primary)]"
          title={rightCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {rightCollapsed ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
      </div>

      {/* RIGHT SIDEBAR - Project & Layers */}
      <div 
        className={`relative overflow-hidden transition-all duration-300 ease-[var(--ease-spring)] ${rightCollapsed ? 'w-0 border-none' : 'w-80 border-l border-[var(--border-default)]'}`}
      >
        <div className="glass-panel relative flex h-full w-80 flex-col overflow-hidden rounded-none border-0 border-l border-[var(--border-default)] bg-[rgba(11,15,23,0.78)]">
        
        {/* Project Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-default)] px-4 py-4">
          <div>
            <span className="surface-label">Project</span>
            <h2 className="mt-1 font-semibold text-[var(--text-primary)]">Map Settings</h2>
          </div>
          <a 
            href="/dashboard" 
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[rgba(239,188,130,0.22)] hover:bg-[rgba(215,163,102,0.1)] hover:text-[var(--accent-strong)]"
            title="Back to Dashboard"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Dashboard
          </a>
        </div>
        <div className="shrink-0 border-b border-[var(--border-default)] px-4 py-4">
          <div className="space-y-3">
             <div>
               <label className="surface-label mb-1 block">Map Name</label>
               <input
                type="text"
                value={mapName}
                onChange={(e) => setMapName(e.target.value)}
                className="input-field rounded-[18px] px-4 py-3 text-sm"
                placeholder="Enter map name..."
              />
             </div>
             
             {/* Action Buttons Grid */}
             <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={handleTestMap}
                  className="btn-primary min-h-0 rounded-full px-3 py-2 text-xs"
                >
                  <Play className="w-3 h-3 fill-current" /> Test Map
                </button>
                <button 
                  onClick={handleSaveToServer}
                  className="btn-primary min-h-0 rounded-full px-3 py-2 text-xs"
                >
                  <Save className="w-3 h-3" /> Save to Server
                </button>
                <button 
                  onClick={handleDownload}
                  className="btn-secondary col-span-2 min-h-0 rounded-full px-3 py-2 text-xs"
                >
                  <Download className="w-3 h-3" /> Export JSON
                </button>
                <button 
                  onClick={handleImportToSpaces}
                  disabled={isImporting}
                  className="btn-primary col-span-2 min-h-0 rounded-full px-3 py-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
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
