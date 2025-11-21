"use client";

import { useState, useEffect } from "react";
// *** FIX: Import the User type
import { User } from "@/contexts/AuthContext"; 
import { motion } from "framer-motion";
import {
  LogOut,
  Users,
  Settings,
  Expand,
  Shrink,
  Eye,
  EyeOff,
} from "lucide-react";
import dynamic from "next/dynamic";
import { ChatBox } from "./ChatBox"; 
import { useSpaceWebSocket } from "@/hooks/useSpaceWebSocket";
import { gameEventEmitter } from "@/lib/GameEventEmitter";

const PhaserGame = dynamic(() => import("./PhaserGameWrapper"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-apple-light-bg dark:bg-apple-dark-bg flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-apple-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-apple-blue font-semibold">Loading Metaverse...</p>
      </div>
    </div>
  ),
});

interface MetaverseGameProps {
  spaceId: string;
  // *** FIX: Accept user and logout as props ***
  user: User;
  logout: () => void;
  mapId?: string;  // FIX: Map from page props (fallback)
  avatarUrl?: string;  // User's avatar
}


export function MetaverseGame({ spaceId, user, logout, mapId, avatarUrl }: MetaverseGameProps) {
  // State will be declared later, after the hooks

  const {
    isConnected,
    onSpaceState,
    onUserJoined,
    onUserLeft,
    onPositionUpdate,
    sendPositionUpdate,
    onChatMessage,
  } = useSpaceWebSocket(spaceId);

  // Forward WebSocket events to gameEventEmitter for Phaser
  useEffect(() => {
    // Forward space-state to Phaser AND extract the correct map_id
    onSpaceState((state) => {
      console.log('MetaverseGame: Forwarding space-state to Phaser', state);
      
      // FIX: Extract and use the map_id from the backend
      if (state.map_id && state.map_id !== actualMapId) {
        console.log(`🗺️  Updating map from '${selectedMap}' to '${state.map_id}' (from backend)`);
        setActualMapId(state.map_id);
      }
      
      gameEventEmitter.emit('space-state', state);
    });

    // Forward user-joined to Phaser
    onUserJoined((event) => {
      console.log('MetaverseGame: Forwarding user-joined to Phaser', event);
      gameEventEmitter.emit('user-joined', event);
    });

    // Forward user-left to Phaser
    onUserLeft((event) => {
      console.log('MetaverseGame: Forwarding user-left to Phaser', event);
      gameEventEmitter.emit('user-left', event);
    });

    // Forward position-update to Phaser
    onPositionUpdate((update) => {
      gameEventEmitter.emit('position-update', update);
    });
  }, [onSpaceState, onUserJoined, onUserLeft, onPositionUpdate]);

  // Listen for player movement from Phaser and send to WebSocket
  useEffect(() => {
    const handlePlayerMoved = (position: { x: number; y: number; direction?: string; isMoving?: boolean }) => {
      sendPositionUpdate(position.x, position.y, position.direction || 'down', position.isMoving || false);
    };

    gameEventEmitter.on('player-moved', handlePlayerMoved);

    return () => {
      gameEventEmitter.off('player-moved', handlePlayerMoved);
    };
  }, [sendPositionUpdate]);
  
  const [onlineUsers, setOnlineUsers] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [actualMapId, setActualMapId] = useState<string | null>(null); // FIX: Track actual map from backend

  // FIX: Reset actualMapId when joining a different space
  useEffect(() => {
    setActualMapId(null); // Clear map from previous space
  }, [spaceId]);

  useEffect(() => {
    const map = localStorage.getItem("selectedMap");
    setSelectedMap(map);
  }, []);

  const handleLogout = () => {
    logout(); // Use the logout function from props
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
      setShowUI(false);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
        setShowUI(true);
      }
    }
  };

  useEffect(() => {
    const fullscreenChangeHandler = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement) {
        setShowUI(true);
      }
    };

    document.addEventListener("fullscreenchange", fullscreenChangeHandler);

    return () => {
      document.removeEventListener("fullscreenchange", fullscreenChangeHandler);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-apple-light-bg dark:bg-apple-dark-bg">
      {/* Top Bar */}
      {showUI && (
        <motion.div
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className="bg-apple-light-elevated/80 dark:bg-apple-dark-elevated/80 backdrop-blur-sm border-b border-apple-light-separator dark:border-apple-dark-separator p-4 pointer-events-auto"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-apple-black dark:text-apple-white">
                Metaverse 2D
              </h1>
              <div className="flex items-center space-x-2 text-sm text-apple-light-label dark:text-apple-dark-label">
                <Users className="w-4 h-4" />
                <span>{onlineUsers} online</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-apple-light-label dark:text-apple-dark-label">
                Welcome,{" "}
                <span className="text-apple-blue font-medium">
                  {user?.user_name}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="auth-button text-sm px-4 py-2 flex items-center space-x-2 w-auto"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main content area with Game and Side Panel */}
      <div className="flex-1 relative">
        <PhaserGame 
          avatarUrl={avatarUrl || user?.user_avatar_url} 
          mapId={actualMapId || mapId}
          spaceId={spaceId}
          userId={user?.id}
        />

        {/* Side Panel */}
        {showUI && (
          <motion.div
            initial={{ x: 300 }}
            animate={{ x: 0 }}
            className="absolute top-4 right-4 w-80 auth-card p-4 pointer-events-auto flex flex-col gap-4"
          >
            <div className="space-y-4">
              <div className="bg-apple-light-bg/50 dark:bg-apple-dark-bg/50 rounded-lg p-3">
                <h4 className="text-sm font-medium text-apple-light-label dark:text-apple-dark-label mb-2">
                  Your Avatar
                </h4>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-apple-blue to-blue-600 rounded-full flex items-center justify-center">
                    {/* TODO: Replace with actual avatar image */}
                    <span className="text-white font-bold text-lg">
                      {user?.user_name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-apple-black dark:text-apple-white font-medium">
                      {user?.user_name}
                    </p>
                    <p className="text-apple-light-label dark:text-apple-dark-label text-sm">
                      {user?.role}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* NEW: Replaced Quick Actions with the ChatBox component */}
              <ChatBox spaceId={spaceId} />

            </div>
          </motion.div>
        )}

        {/* Fullscreen and UI Toggle Buttons */}
        <div className="absolute bottom-4 right-4 flex gap-2 pointer-events-auto">
          {isFullscreen && (
            <button
              onClick={() => setShowUI(!showUI)}
              className="p-3 bg-apple-light-elevated/80 dark:bg-apple-dark-elevated/80 rounded-full text-apple-black dark:text-apple-white"
            >
              {showUI ? <EyeOff /> : <Eye />}
            </button>
          )}
          <button
            onClick={handleToggleFullscreen}
            className="p-3 bg-apple-light-elevated/80 dark:bg-apple-dark-elevated/80 rounded-full text-apple-black dark:text-apple-white"
          >
            {isFullscreen ? <Shrink /> : <Expand />}
          </button>
        </div>
      </div>

      {/* Bottom Controls */}
      {showUI && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="bg-apple-light-elevated/80 dark:bg-apple-dark-elevated/80 backdrop-blur-sm border-t border-apple-light-separator dark:border-apple-dark-separator p-4 pointer-events-auto"
        >
          <div className="flex items-center justify-center space-x-4">
            <div className="text-sm text-apple-light-label dark:text-apple-dark-label text-center">
              <p className="font-semibold">CONTROLS</p>
              <p>WASD or Arrow Keys to move. Press 'F' for fullscreen.</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}