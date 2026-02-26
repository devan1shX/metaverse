"use client";

import { useEffect, useState, useRef } from "react";
import Phaser from "phaser";
import { ChevronLeft, LayoutDashboard, Keyboard, MousePointer2 } from "lucide-react";
import Link from "next/link"; // For dashboard link if needed, or simple buttons
import { Player, PlayerData } from "@/components/Player";

export default function MapTestPage() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [mapData, setMapData] = useState<any>(null);
  const [mapName, setMapName] = useState<string>("test_map");
  const [error, setError] = useState<string>("");
  const [gameInstance, setGameInstance] = useState<Phaser.Game | null>(null);

  // Zoom level for the test view - using 2x to make pixel art visible
  const ZOOM_LEVEL = 2;

  useEffect(() => {
    // Get map data from sessionStorage
    const storedMapData = sessionStorage.getItem('testMapData');
    const storedMapName = sessionStorage.getItem('testMapName');

    if (!storedMapData) {
      setError("No map data found. Please create a map first.");
      return;
    }

    try {
      const parsedData = JSON.parse(storedMapData);
      setMapData(parsedData);
      setMapName(storedMapName || "test_map");
    } catch (e) {
      setError("Failed to parse map data");
    }
  }, []);

  useEffect(() => {
    if (!mapData || !gameContainerRef.current) return;

    // cleanup previous game if exists (react strict mode double invoke)
    if (gameInstance) {
      gameInstance.destroy(true);
      setGameInstance(null);
    }

    // Calculate exact canvas dimensions
    // The map width in pixels * zoom level
    const width = mapData.width * mapData.tilewidth * ZOOM_LEVEL;
    const height = mapData.height * mapData.tileheight * ZOOM_LEVEL;

    // Create test Phaser scene
    class TestMapScene extends Phaser.Scene {
      private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
      private player?: Player; // Changed to Player class
      private wasd: any; // Changed to any to match Player class expectation (or compatible object)

      constructor() {
        super({ key: 'TestMapScene' });
      }

      preload() {
        console.log("Loading Map Data into Phaser:", JSON.stringify(mapData, null, 2));

        // Load map data directly
        this.cache.tilemap.add('testMap', { format: 1, data: mapData });

        // Load tilesets
        mapData.tilesets.forEach((tileset: any) => {
          this.load.image(tileset.name, tileset.image);
        });

        // Load player sprite
        // We use a specific key format to trigger the correct avatar logic in Player class
        // The Player class logic checks for 'avatar-2' in the key to determine frame/animation type
        this.load.spritesheet('avatar-key-test-avatar-2', '/sprites/avatar-2-spritesheet.png', {
          frameWidth: 48,
          frameHeight: 48,
        });
      }

      create() {
        const map = this.make.tilemap({ key: 'testMap' });

        // Add tilesets
        const tilesets: Phaser.Tilemaps.Tileset[] = [];
        mapData.tilesets.forEach((tilesetData: any) => {
          const tileset = map.addTilesetImage(tilesetData.name, tilesetData.name);
          if (tileset) {
            tilesets.push(tileset);
          }
        });

        // Create layers with layer-based collision and depth
        map.layers.forEach((layerData, index) => {
          const layer = map.createLayer(layerData.name, tilesets, 0, 0);
          if (layer) {
            // Check collision
            const hasCollision = layerData.properties?.some(
              (prop: any) => prop.name === 'collides' && prop.value === true
            );
            
            if (hasCollision) {
              layer.setCollisionByExclusion([-1]);
            }
            
            // Set Layer Depth
            // Ground (0), Walls (1), Objects (2) -> Below Player
            // Above Objects -> Above Player
            if (layerData.name === "Above Objects") {
              layer.setDepth(20); // High depth to cover player
            } else {
              layer.setDepth(index); // 0, 1, 2...
            }
            
            layer.setScale(1);
          }
        });

        // Set world bounds to match map size
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

        // Create player using the Player class
        const centerX = map.widthInPixels / 2;
        const centerY = map.heightInPixels / 2;
        
        const playerData: PlayerData = {
            id: 'test-user',
            user_name: 'Test User',
            user_avatar_url: '/sprites/avatar-2-spritesheet.png'
        };

        // Note: The texture key must match what we loaded in preload
        this.player = new Player(this, centerX, centerY, 'avatar-key-test-avatar-2', playerData);
        this.player.setDepth(10); // Above Ground/Walls, Below Above Objects
        
        // Ensure player collides with world bounds (should be set in Player class already, but good to ensure)
        this.player.setCollideWorldBounds(true);

        // Add collision with layers
        map.layers.forEach((layerData) => {
          const layer = map.getLayer(layerData.name);
          if (layer && this.player) {
            this.physics.add.collider(this.player, layer.tilemapLayer);
          }
        });

        // Camera setup
        this.cameras.main.startFollow(this.player, true);
        this.cameras.main.setZoom(ZOOM_LEVEL);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

        // Input
        if (this.input.keyboard) {
           this.cursors = this.input.keyboard.createCursorKeys();
           this.wasd = this.input.keyboard.addKeys('W,S,A,D');
        }
      }

      update(time: number, delta: number) {
        if (!this.player || !this.cursors || !this.wasd) return;

        // Use the Player class movement logic
        this.player.updateMovement(this.cursors, this.wasd);
        
        // Also call update on player for any internal logic (like name tag sync)
        this.player.update();
      }
    }

    // Create Phaser game
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: width,
      height: height,
      parent: gameContainerRef.current,
      pixelArt: true, // Critical for crisp scaling
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false
        }
      },
      scene: TestMapScene,
      backgroundColor: '#f8fafc', // Match slate-50
    };

    const game = new Phaser.Game(config);
    setGameInstance(game);

    return () => {
      game.destroy(true);
    };
  }, [mapData]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 text-slate-800">
        <div className="text-center p-8 bg-white border border-rose-200 rounded-xl shadow-2xl">
          <h1 className="text-xl font-bold mb-2 text-rose-600">Unable to Load Map</h1>
          <p className="text-slate-500 mb-6">{error}</p>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm border border-slate-200 transition text-slate-700"
          >
            Close Window
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-500/30">
      
      {/* Navbar */}
      <nav className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-50">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.close()}
            className="group flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <div className="p-1 rounded-md bg-slate-100 border border-slate-200 group-hover:border-indigo-500 transition-all">
               <ChevronLeft className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium">Back to Editor</span>
          </button>
          
          <div className="w-px h-6 bg-slate-200 mx-2" />
          
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Testing Map</span>
            <span className="text-sm font-bold text-slate-800">{mapName}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 px-4 py-1.5 bg-slate-100 rounded-full border border-slate-200">
             <div className="flex items-center gap-2 text-xs text-slate-500">
               <Keyboard className="w-3 h-3" />
               <span>Move: <strong className="text-slate-800">WASD</strong> or <strong className="text-slate-800">Arrows</strong></span>
             </div>
             <div className="w-px h-3 bg-slate-300" />
             <div className="flex items-center gap-2 text-xs text-slate-500">
               <MousePointer2 className="w-3 h-3" />
               <span>Interactive</span>
             </div>
          </div>

          <a 
            href="/dashboard" 
            target="_blank"
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-all shadow-lg shadow-indigo-900/20"
          >
            <LayoutDashboard className="w-3 h-3" />
            Dashboard
          </a>
        </div>
      </nav>

      {/* Game Area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-[url('/grid-pattern-light.svg')] bg-center relative">
        <div className="relative">
          {/* Game Container Wrapper for shadow/border */}
          <div className="rounded-lg overflow-hidden shadow-2xl shadow-slate-300/80 border border-slate-200 ring-4 ring-white">
             <div ref={gameContainerRef} />
          </div>
          
          {/* Dimensions Label */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-slate-400 font-mono">
            {mapData?.width}x{mapData?.height} Tiles • {ZOOM_LEVEL}x Zoom
          </div>
        </div>
      </div>
    </div>
  );
}
