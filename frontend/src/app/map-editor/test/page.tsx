"use client";

import { useEffect, useState, useRef } from "react";
import Phaser from "phaser";

export default function MapTestPage() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [mapData, setMapData] = useState<any>(null);
  const [mapName, setMapName] = useState<string>("test_map");
  const [error, setError] = useState<string>("");

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

    // Create test Phaser scene
    class TestMapScene extends Phaser.Scene {
      private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
      private player?: Phaser.Physics.Arcade.Sprite;

      constructor() {
        super({ key: 'TestMapScene' });
      }

      preload() {
        // Load map data directly
        this.cache.tilemap.add('testMap', { format: 1, data: mapData });

        // Load tilesets
        mapData.tilesets.forEach((tileset: any) => {
          this.load.image(tileset.name, tileset.image);
        });

        // Load player sprite
        this.load.spritesheet('player', '/sprites/avatar-2-spritesheet.png', {
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

        // Create layers with layer-based collision
        map.layers.forEach((layerData) => {
          const layer = map.createLayer(layerData.name, tilesets, 0, 0);
          if (layer) {
            // Check if this layer has collision property set
            const hasCollision = layerData.properties?.some(
              (prop: any) => prop.name === 'collides' && prop.value === true
            );
            
            if (hasCollision) {
              // This layer has collision - ALL tiles in it should collide
              layer.setCollisionByExclusion([-1]); // -1 = empty tiles, so all non-empty tiles collide
              console.log(`Layer "${layerData.name}" has AUTO-COLLISION enabled`);
            } else {
              console.log(`Layer "${layerData.name}" is walkable (no collision)`);
            }
          }
        });

        // Set world bounds
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

        // Create player sprite at center
        const centerX = map.widthInPixels / 2;
        const centerY = map.heightInPixels / 2;
        this.player = this.physics.add.sprite(centerX, centerY, 'player');

        // CRITICAL: Set precise collision body
        // Avatar sprite is 48x48, but the actual character is much smaller
        // We need a small collision body that matches the character's feet/body
        this.player.setCollideWorldBounds(true);
        
        // Set body size to 8x8 pixels (small, precise collision box)
        // Offset it to center on the character's feet
        this.player.body.setSize(8, 8);
        this.player.body.setOffset(20, 36); // Center the small body on character's feet
        
        console.log('Player collision body:', {
          width: this.player.body.width,
          height: this.player.body.height,
          offsetX: this.player.body.offset.x,
          offsetY: this.player.body.offset.y
        });
        this.player.setScale(1);

        // Create animations
        if (!this.anims.exists('walk-down')) {
          this.anims.create({
            key: 'walk-down',
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: -1
          });
        }

        // Add collision with layers
        map.layers.forEach((layerData) => {
          const layer = map.getLayer(layerData.name);
          if (layer && this.player) {
            this.physics.add.collider(this.player, layer.tilemapLayer);
          }
        });

        // Camera follow player
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setZoom(2);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

        // Input
        this.cursors = this.input.keyboard?.createCursorKeys();
      }

      update() {
        if (!this.player || !this.cursors) return;

        const speed = 160;
        this.player.setVelocity(0);

        if (this.cursors.left.isDown) {
          this.player.setVelocityX(-speed);
        } else if (this.cursors.right.isDown) {
          this.player.setVelocityX(speed);
        }

        if (this.cursors.up.isDown) {
          this.player.setVelocityY(-speed);
        } else if (this.cursors.down.isDown) {
          this.player.setVelocityY(speed);
        }

        if (this.player.body?.velocity.x !== 0 || this.player.body?.velocity.y !== 0) {
          this.player.anims.play('walk-down', true);
        } else {
          this.player.anims.stop();
        }
      }
    }

    // Create Phaser game
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: gameContainerRef.current,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false
        }
      },
      scene: TestMapScene,
      backgroundColor: '#1a1a1a',
    };

    const game = new Phaser.Game(config);

    return () => {
      game.destroy(true);
    };
  }, [mapData]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => window.close()}
            className="mt-4 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Testing: {mapName}</h1>
          <div className="flex gap-3">
            <div className="text-sm text-gray-400">
              Use Arrow Keys to move
            </div>
            <button
              onClick={() => window.close()}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div ref={gameContainerRef} />
      </div>
    </div>
  );
}
