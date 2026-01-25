"use client";

import { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
// **FIX: Import your game scene**
import { GameScene } from '@/scenes/GameScene'; 

interface PhaserGameWrapperProps {
  avatarUrl?: string;
  mapId?: string | null;
  spaceId?: string;
  userId?: string;
  streams?: Map<string, MediaStream>;
}

export default function PhaserGameWrapper({ 
  avatarUrl, 
  mapId, 
  spaceId, 
  userId,
  streams
}: PhaserGameWrapperProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isGameReady, setIsGameReady] = useState(false);
  
  const normalizedMapId = mapId ?? null;

  useEffect(() => {
    // **FIX: Removed !normalizedMapId check**
    // We'll let GameScene handle a null mapId and default it.
    if (!containerRef.current || gameRef.current || !userId || !spaceId) {
      return;
    }

    console.log('🎮 Initializing Phaser game with:', {
      mapId: normalizedMapId,
      spaceId,
      userId,
      avatarUrl
    });

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#f9fafb', // Light gray background to match dashboard
      dom: {
        createContainer: true
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false
        }
      },
      scene: [GameScene], // **FIX: Add your game scene here**
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      render: {
        pixelArt: true,
        antialias: false
      }
    };

    try {
      gameRef.current = new Phaser.Game(config);
      
      if (gameRef.current && gameRef.current.registry) {
        gameRef.current.registry.set('mapId', normalizedMapId);
        gameRef.current.registry.set('spaceId', spaceId);
        gameRef.current.registry.set('userId', userId);
        gameRef.current.registry.set('avatarUrl', avatarUrl);
      }

      // **FIX: Start the scene and pass data to its init() method**
      if (gameRef.current && gameRef.current.scene) {
        gameRef.current.scene.start('GameScene', {
          userId: userId,
          avatarUrl: avatarUrl,
          mapId: normalizedMapId
        });
      }

      setIsGameReady(true);
      console.log('✅ Phaser game initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Phaser game:', error);
    }

    const handleResize = () => {
      if (gameRef.current) {
        gameRef.current.scale.resize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (gameRef.current) {
        console.log('🧹 Cleaning up Phaser game');
        gameRef.current.destroy(true);
        gameRef.current = null;
        setIsGameReady(false);
      }
    };
  // **FIX: Add all props as dependencies for initialization**
  }, [normalizedMapId, spaceId, userId, avatarUrl]); 

  // This update effect is for handling changes *after* the game is loaded
  useEffect(() => {
    if (isGameReady && gameRef.current) {
        if (streams && streams.size > 0) {
            console.log(`📡 PhaserGameWrapper: Emitting update-streams with ${streams.size} streams`);
            gameRef.current.events.emit('update-streams', streams);
        }
    }
  }, [isGameReady, streams]);

  useEffect(() => {
    if (isGameReady && gameRef.current && gameRef.current.registry) {
      const oldMapId = gameRef.current.registry.get('mapId');
      
      console.log('🔄 Updating game data:', {
        mapId: normalizedMapId,
        spaceId,
        userId,
        avatarUrl
      });
      
      gameRef.current.registry.set('mapId', normalizedMapId);
      gameRef.current.registry.set('spaceId', spaceId);
      gameRef.current.registry.set('userId', userId);
      gameRef.current.registry.set('avatarUrl', avatarUrl);

      if (gameRef.current.events) {
        gameRef.current.events.emit('gameDataUpdated', {
          mapId: normalizedMapId,
          spaceId,
          userId,
          avatarUrl
        });
      }

      // **FIX: If mapId changes, restart the scene with new data**
      if (oldMapId !== normalizedMapId && oldMapId !== null) {
        console.log(`🗺️ Map ID changed from ${oldMapId} to ${normalizedMapId}. Restarting scene.`);
        const gameScene = gameRef.current.scene.getScene('GameScene');
        if (gameScene && gameScene.scene.isActive()) {
          gameScene.scene.restart({
            userId: userId,
            avatarUrl: avatarUrl,
            mapId: normalizedMapId
          });
        }
      }
    }
  }, [isGameReady, normalizedMapId, spaceId, userId, avatarUrl]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full bg-gray-50"
      style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        overflow: 'hidden'
      }}
    >
      {!isGameReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-indigo-600 font-semibold">Initializing Game Engine...</p>
            {normalizedMapId && (
              <p className="text-gray-500 text-sm mt-2">Loading Map: {normalizedMapId}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}