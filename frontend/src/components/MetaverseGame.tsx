"use client";

import { useState, useEffect, useRef } from "react";
import { User } from "@/contexts/AuthContext"; 
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  Users,
  Home,
  Expand,
  Shrink,
  Eye,
  EyeOff,
  Compass,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Monitor,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ChatBox } from "./ChatBox"; 
import { InviteModal } from "./InviteModal";
import { useSpaceWebSocket } from "@/hooks/useSpaceWebSocket";
import { gameEventEmitter } from "@/lib/GameEventEmitter";
import { useMediaStream } from "@/hooks/useMediaStream";
import { MediaControls } from "@/components/MediaControls";
import { ScreenShareSelectModal } from "@/components/ScreenShareSelectModal";
import { VideoGrid } from "@/components/VideoGrid";

const PhaserGame = dynamic(() => import("./PhaserGameWrapper"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-indigo-600 font-semibold">Loading Metaverse...</p>
      </div>
    </div>
  ),
});

interface MetaverseGameProps {
  spaceId: string;
  spaceName?: string;
  user: User;
  logout: () => void;
  mapId?: string;
  avatarUrl?: string;
}

interface OnlineUser {
  id: string;
  user_name: string;
  user_avatar_url?: string;
}

export function MetaverseGame({ spaceId, spaceName, user, logout, mapId, avatarUrl }: MetaverseGameProps) {
  const {
    isConnected,
    onSpaceState,
    onUserJoined,
    onUserLeft,
    onPositionUpdate,
    sendPositionUpdate,
    onChatMessage,
    sendMediaSignal,
    onWebRTCSignal,
    onMediaStreamEvent,
    startMediaStream,
    stopMediaStream,
  } = useSpaceWebSocket(spaceId);

  const {
    mediaState,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    localStream,
    remoteStreams,
    remoteScreenStreams,
    handleSignal,
    handleStreamEvent,
    handleInitialState,
    error: mediaError,
  } = useMediaStream(user?.id, spaceId, sendMediaSignal, startMediaStream, stopMediaStream);

  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [actualMapId, setActualMapId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showScreenShareModal, setShowScreenShareModal] = useState(false);
  const [isOnlineListOpen, setIsOnlineListOpen] = useState(true);

  useEffect(() => {
    onSpaceState((state) => {
      console.log('MetaverseGame: Forwarding space-state to Phaser', state);
      
      if (state.map_id && state.map_id !== actualMapId) {
        console.log(`🗺️  Updating map from '${selectedMap}' to '${state.map_id}' (from backend)`);
        setActualMapId(state.map_id);
      }

      // Update online users from space state
      if (state.users) {
        const users = Object.values(state.users).map((userData: any) => ({
          id: String(userData.id), // Ensure ID is string
          user_name: userData.user_name,
          user_avatar_url: userData.user_avatar_url,
        }));
        setOnlineUsers(users);
      }

      // Handle initial media state if available
      if (state.media_info) {
        console.log('MetaverseGame: Received initial media info', state.media_info);
        handleInitialState(state.media_info);
      }
      
      gameEventEmitter.emit('space-state', state);
    });

    onUserJoined((event) => {
      console.log('MetaverseGame: Forwarding user-joined to Phaser', event);
      
      // Add newly joined user to online list
      const newUser = {
        id: String(event.user_data.id), // Ensure ID is string
        user_name: event.user_data.user_name,
        user_avatar_url: event.user_data.user_avatar_url,
      };
      setOnlineUsers(prev => {
        // Prevent duplicates
        if (prev.find(u => u.id === newUser.id)) return prev;
        return [...prev, newUser];
      });
      
      gameEventEmitter.emit('user-joined', event);
    });

    onUserLeft((event) => {
      console.log('MetaverseGame: Forwarding user-left to Phaser', event);
      
      // Remove user from online list
      setOnlineUsers(prev => {
        const updated = prev.filter(u => String(u.id) !== String(event.user_id));
        console.log(`MetaverseGame: Removed user ${event.user_id}. Online count: ${updated.length}`);
        return updated;
      });
      
      gameEventEmitter.emit('user-left', event);
    });

    onPositionUpdate((update) => {
      gameEventEmitter.emit('position-update', update);
    });

    onWebRTCSignal((signal) => {
      console.log('📡 MetaverseGame: Received WebRTC signal', signal.signal_type);
      handleSignal(signal);
    });

    onMediaStreamEvent((event) => {
      console.log('📡 MetaverseGame: Received media stream event', event.event, 'from', event.user_id);
      handleStreamEvent(event);
    });
  }, [onSpaceState, onUserJoined, onUserLeft, onPositionUpdate, onWebRTCSignal, onMediaStreamEvent, handleSignal, handleStreamEvent]);

  // Log when remoteStreams changes
  useEffect(() => {
    console.log(`🎥 MetaverseGame: remoteStreams updated, count: ${remoteStreams.size}`);
    remoteStreams.forEach((stream, userId) => {
      console.log(`   - ${userId}: ${stream.getTracks().length} tracks`);
    });
  }, [remoteStreams]);

  useEffect(() => {
    const handlePlayerMoved = (position: { x: number; y: number; direction?: string; isMoving?: boolean }) => {
      sendPositionUpdate(position.x, position.y, position.direction || 'down', position.isMoving || false);
    };

    gameEventEmitter.on('player-moved', handlePlayerMoved);

    return () => {
      gameEventEmitter.off('player-moved', handlePlayerMoved);
    };
  }, [sendPositionUpdate]);

  useEffect(() => {
    setActualMapId(null);
  }, [spaceId]);

  useEffect(() => {
    const map = localStorage.getItem("selectedMap");
    setSelectedMap(map);
  }, []);

  const handleLogout = () => {
    logout();
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
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Left Sidebar - Gather Style */}
      <AnimatePresence mode="wait">
        {showUI && showSidebar && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-72 bg-white border-r border-gray-200 flex flex-col shadow-lg z-20 relative"
          >
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  Metaverse 2D
                </h2>
                <button 
                  onClick={() => setShowSidebar(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
              
              {/* Navigation */}
              <div className="flex gap-2">
                <Link href="/dashboard" className="flex-1">
                  <button className="w-full px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-center gap-2 border border-transparent hover:border-gray-200">
                    <Home className="w-4 h-4" />
                    Dashboard
                  </button>
                </Link>
                <Link href="/discover" className="flex-1">
                  <button className="w-full px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-center gap-2 border border-transparent hover:border-gray-200">
                    <Compass className="w-4 h-4" />
                    Discover
                  </button>
                </Link>
              </div>
            </div>

            {/* User Section */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-white font-bold">
                    {user?.user_name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {user?.user_name}
                  </p>
                  <p className="text-xs text-gray-500 capitalize truncate">
                    Participant
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => setShowInviteModal(true)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow"
              >
                <UserPlus className="w-4 h-4" />
                Invite
              </button>
            </div>

            {/* Online Users */}
            <div className="border-b border-gray-100">
              <button 
                onClick={() => setIsOnlineListOpen(!isOnlineListOpen)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Online ({onlineUsers.length})
                </span>
                {isOnlineListOpen ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              
              <AnimatePresence>
                {isOnlineListOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-2 pb-2 space-y-1 max-h-40 overflow-y-auto">
                      {onlineUsers.map((onlineUser) => (
                        <div 
                          key={onlineUser.id}
                          className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                        >
                          <div className="relative">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>
                          </div>
                          <span className="text-sm text-gray-700 truncate flex-1 font-medium">
                            {onlineUser.user_name}
                          </span>
                          {String(onlineUser.id) === String(user?.id) && (
                            <span className="text-xs text-gray-400 font-medium">You</span>
                          )}
                        </div>
                      ))}
                      {onlineUsers.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-2">No users online</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Chat Section */}
            <div className="flex-1 flex flex-col p-4 overflow-hidden bg-white">
              <ChatBox spaceId={spaceId} />
            </div>

            {/* Logout Button */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/30">
              <button
                onClick={handleLogout}
                className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 hover:border-gray-300 text-sm font-medium py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Sidebar Toggle Button (Visible when sidebar is closed) */}
        {showUI && !showSidebar && (
          <motion.button
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            onClick={() => setShowSidebar(true)}
            className="absolute top-4 left-4 z-10 p-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg hover:bg-white transition-all text-gray-700"
            title="Open Sidebar"
          >
            <Menu className="w-5 h-5" />
          </motion.button>
        )}

        {/* Top Bar for fullscreen/when sidebar hidden */}
        {showUI && !showSidebar && (
          <div className="absolute top-0 right-0 left-0 z-0 bg-transparent pointer-events-none">
            <div className="flex justify-end p-4 pointer-events-auto">
              <button
                onClick={handleLogout}
                className="bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-700 hover:bg-white text-sm py-2 px-4 rounded-lg shadow-sm flex items-center gap-2 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        )}

        {/* Game Canvas */}
        <div className="flex-1 relative bg-gray-100">
          <PhaserGame 
            avatarUrl={avatarUrl || user?.user_avatar_url} 
            mapId={actualMapId || mapId}
            spaceId={spaceId}
            userId={user?.id}
            streams={remoteStreams}
            screenStreams={remoteScreenStreams}
          />

          {/* Media UI */}
          {/* VideoGrid removed as videos are now attached to avatars */}
          <MediaControls 
            mediaState={mediaState}
            toggleAudio={toggleAudio}
            toggleVideo={toggleVideo}
            onOpenScreenShare={() => setShowScreenShareModal(true)}
            stopScreenShare={stopScreenShare}
            localStream={localStream}
            error={mediaError}
          />

          {/* Floating Controls */}
          <div className="absolute bottom-4 right-4 flex gap-2 pointer-events-auto z-10">
            {isFullscreen && (
              <button
                onClick={() => setShowUI(!showUI)}
                className="p-3 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full text-gray-700 hover:text-gray-900 shadow-lg hover:shadow-xl transition-all hover:scale-105"
                title={showUI ? "Hide UI" : "Show UI"}
              >
                {showUI ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            )}
            <button
              onClick={handleToggleFullscreen}
              className="p-3 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full text-gray-700 hover:text-gray-900 shadow-lg hover:shadow-xl transition-all hover:scale-105"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Shrink className="w-5 h-5" /> : <Expand className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Bottom Controls */}
        {showUI && (
          <div className="bg-white border-t border-gray-200 py-1.5 px-4 z-10">
            <div className="text-center">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                WASD to move • F for fullscreen
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <InviteModal 
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        spaceId={spaceId}
        spaceName={spaceName || "Space"}
      />

      <ScreenShareSelectModal
        isOpen={showScreenShareModal}
        onClose={() => setShowScreenShareModal(false)}
        onlineUsers={onlineUsers}
        currentUserId={String(user?.id)}
        onStartShare={startScreenShare}
      />
    </div>
  );
}