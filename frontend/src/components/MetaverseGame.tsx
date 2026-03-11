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
  Code2,
  PenLine,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ChatBox } from "./ChatBox"; 
import { CodeEditor } from "./CodeEditor";
import { Whiteboard } from "./Whiteboard";
import { InviteModal } from "./InviteModal";
import { useSpaceWebSocket } from "@/hooks/useSpaceWebSocket";
import { useMediaStream } from "@/hooks/useMediaStream";
import { gameEventEmitter } from "@/lib/GameEventEmitter";
import { MediaControls } from "@/components/MediaControls";
import { ScreenShareSelectModal } from "@/components/ScreenShareSelectModal";
import { CodeShareSelectModal } from "@/components/CodeShareSelectModal";
import { WhiteboardSelectModal } from "@/components/WhiteboardSelectModal";
import { CodeInviteModal } from "@/components/CodeInviteModal";
import { WhiteboardInviteModal } from "@/components/WhiteboardInviteModal";
import { VideoGrid } from "@/components/VideoGrid";
import { InterviewerPanel } from "@/components/InterviewerPanel";
import { CandidateWaitingRoom } from "@/components/CandidateWaitingRoom";
import { GlobalInterviewTimer } from "@/components/GlobalInterviewTimer";
import { useAntiCheat } from "@/hooks/useAntiCheat";
import { useWebcamSnapshot } from "@/hooks/useWebcamSnapshot";
import type { TabSwitchDetectedEvent, WebcamSnapshotEvent, CandidateWaitingEvent } from "@/hooks/useSpaceWebSocket";

// Custom Toast component for simple notifications
function SimpleToast({ message, type = "info", onClose }: { message: string, type?: "info" | "success" | "error", onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const palette =
    type === "error"
      ? { border: "rgba(239, 124, 120, 0.22)", color: "var(--danger)" }
      : type === "success"
        ? { border: "rgba(122, 194, 142, 0.22)", color: "var(--success)" }
        : { border: "rgba(239, 188, 130, 0.2)", color: "var(--accent-strong)" };

  return (
    <div
      className="glass-bar fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full px-5 py-3 shadow-xl"
      style={{ borderColor: palette.border, color: palette.color }}
    >
      <span className="font-medium text-[var(--text-primary)]">{message}</span>
      <button
        onClick={onClose}
        className="rounded-full p-1 text-[var(--text-soft)] hover:bg-white/5 hover:text-[var(--text-primary)]"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

const PhaserGame = dynamic(() => import("./PhaserGameWrapper"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-app)]">
      <div className="glass-panel rounded-[28px] px-8 py-8 text-center">
        <div className="mx-auto mb-4 h-14 w-14 animate-spin rounded-full border-4 border-[var(--accent)] border-t-transparent" />
        <p className="font-display text-lg font-medium tracking-[-0.03em] text-[var(--text-primary)]">
          Loading metaverse
        </p>
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
  in_code_session?: boolean;
  in_whiteboard_session?: boolean;
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
    sendCodeUpdate,
    onCodeUpdate,
    sendCodeExecutionResult,
    onCodeExecutionResult,
    sendCodeInvite,
    onCodeInvite,
    sendCodeInviteResponse,
    onCodeInviteResponse,
    sendCodeSessionStatus,
    onUserStatusUpdate,
    // Whiteboard
    sendWhiteboardUpdate,
    sendWhiteboardClear,
    sendWhiteboardInvite,
    sendWhiteboardInviteResponse,
    sendWhiteboardSessionStatus,
    onWhiteboardUpdate,
    onWhiteboardClear,
    onWhiteboardInvite,
    onWhiteboardInviteResponse,
    onWhiteboardStatusUpdate,
    // ── Interview Rooms
    sendAdmitCandidate,
    sendRejectCandidate,
    sendInterviewTimerStart,
    sendInterviewTimerPause,
    sendInterviewTimerExtend,
    sendInterviewSessionEnd,
    sendTabSwitchEvent,
    sendWebcamSnapshot,
    sendKickUser,
    onWaitingRoomStatus,
    onCandidateWaiting,
    onInterviewTimer,
    onInterviewSessionEnded,
    onTabSwitchDetected,
    onWebcamSnapshot,
    onYouWereKicked,
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

  // ─────────────────────────────────────────────────
  // Interview Room State
  // ─────────────────────────────────────────────────
  const [isInterviewSpace, setIsInterviewSpace] = useState(false);
  const [interviewRole, setInterviewRole] = useState<string | null>(null); // 'INTERVIEWER' | 'CANDIDATE'
  const [waitingRoomStatus, setWaitingRoomStatus] = useState<'waiting' | 'admitted' | 'rejected' | null>(null);
  const [waitingRoomMsg, setWaitingRoomMsg] = useState<string>('');
  const [waitingCandidates, setWaitingCandidates] = useState<{ user_id: string; user_name: string; user_avatar_url: string }[]>([]);
  const [interviewTimer, setInterviewTimer] = useState({
    active: false,
    durationSeconds: 0,
    elapsed: 0,
    startedAt: null as number | null,
  });
  const [tabSwitchEvents, setTabSwitchEvents] = useState<TabSwitchDetectedEvent[]>([]);
  const [snapshotEvents, setSnapshotEvents] = useState<WebcamSnapshotEvent[]>([]);
  const [snapshotIntervalMin, setSnapshotIntervalMin] = useState(0);
  // ────────────────────────────────────────────────────────────────────────────
  const [showSidebar, setShowSidebar] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showScreenShareModal, setShowScreenShareModal] = useState(false);
  const [isOnlineListOpen, setIsOnlineListOpen] = useState(true);
  const [isCodeEditorOpen, setIsCodeEditorOpen] = useState(false);
  const [showCodeShareModal, setShowCodeShareModal] = useState(false);
  const [codeSessionTargets, setCodeSessionTargets] = useState<string[]>([]);
  const [activeCode, setActiveCode] = useState("");
  const [activeLanguage, setActiveLanguage] = useState("javascript");
  const [executionResult, setExecutionResult] = useState<{output: string, error: string, isRunning: boolean} | null>(null);

  // Whiteboard state
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [showWhiteboardSelectModal, setShowWhiteboardSelectModal] = useState(false);
  const [whiteboardSessionTargets, setWhiteboardSessionTargets] = useState<string[]>([]);
  const [activeWhiteboardElements, setActiveWhiteboardElements] = useState("[]");
  const [activeWhiteboardFiles, setActiveWhiteboardFiles] = useState<Record<string, any>>({}); // image file binaries from remote peers
  const [incomingWhiteboardInvite, setIncomingWhiteboardInvite] = useState<{ hostId: string; hostName: string } | null>(null);
  const [whiteboardWidth, setWhiteboardWidth] = useState(50); // percent, 50–70

  // Invite Flow State
  const [incomingInvite, setIncomingInvite] = useState<{ hostId: string, hostName: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string, type: "info" | "success" | "error" } | null>(null);
  const [interactionPrompt, setInteractionPrompt] = useState<{show: boolean, type: string | null} | null>(null);

  // Ref to track isCodeEditorOpen without stale closure issues
  const isCodeEditorOpenRef = useRef(false);
  useEffect(() => {
    isCodeEditorOpenRef.current = isCodeEditorOpen;
  }, [isCodeEditorOpen]);

  // Ref to track codeSessionTargets without stale closure
  const codeSessionTargetsRef = useRef<string[]>([]);
  useEffect(() => {
    codeSessionTargetsRef.current = codeSessionTargets;
  }, [codeSessionTargets]);

  // Whiteboard refs (same stale-closure safety pattern)
  const isWhiteboardOpenRef = useRef(false);
  useEffect(() => {
    isWhiteboardOpenRef.current = isWhiteboardOpen;
  }, [isWhiteboardOpen]);

  const whiteboardSessionTargetsRef = useRef<string[]>([]);
  useEffect(() => {
    whiteboardSessionTargetsRef.current = whiteboardSessionTargets;
  }, [whiteboardSessionTargets]);

  // Derive participants who are in the current session
  const sessionParticipants = onlineUsers
    .filter(u => codeSessionTargets.includes(String(u.id)))
    .map(u => ({ id: String(u.id), user_name: u.user_name }));

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
          in_code_session: userData.in_code_session || false,
        }));
        setOnlineUsers(users);
      }

      // Handle initial media state if available
      if (state.media_info) {
        console.log('MetaverseGame: Received initial media info', state.media_info);
        handleInitialState(state.media_info);
      }

      // Handle initial code session state
      if (state.code_session) {
          setActiveCode(state.code_session.code);
          setActiveLanguage(state.code_session.language);
      }
      // Handle initial whiteboard state
      if (state.whiteboard_state) {
          setActiveWhiteboardElements(state.whiteboard_state);
      }

      // ── Interview Room: parse role + timer state from space_state ──────────
      const sAny = state as any;
      if (sAny.is_interview_space) {
        setIsInterviewSpace(true);
        setInterviewRole(sAny.interview_role || null);
        if (sAny.waiting_room && Array.isArray(sAny.waiting_room)) {
          setWaitingCandidates(sAny.waiting_room);
        }
        if (sAny.interview_timer) {
          const t = sAny.interview_timer;
          setInterviewTimer({
            active: t.active || false,
            durationSeconds: t.duration_seconds || 0,
            elapsed: t.elapsed_seconds || 0,
            startedAt: t.started_at || null,
          });
        }
        // Read snapshot interval from space config
        if (sAny.interview_config?.snapshot_interval_min) {
          setSnapshotIntervalMin(sAny.interview_config.snapshot_interval_min);
        }
      }

      gameEventEmitter.emit('space-state', state);
    });

    onCodeUpdate((event) => {
        // When another user updates the code, update our local state
        setActiveCode(event.code);
        setActiveLanguage(event.language);
    });

    onCodeExecutionResult((result) => {
        setExecutionResult(result);
    });

    onUserJoined((event) => {
      console.log('MetaverseGame: Forwarding user-joined to Phaser', event);
      
      // Add newly joined user to online list
      const newUser = {
        id: String(event.user_data.id), // Ensure ID is string
        user_name: event.user_data.user_name,
        user_avatar_url: event.user_data.user_avatar_url,
        in_code_session: event.user_data.in_code_session || false,
        in_whiteboard_session: false,
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
      
      // If this user was in our code session, notify we lost a collaborator
      if (isCodeEditorOpenRef.current && codeSessionTargetsRef.current.includes(String(event.user_id))) {
        setOnlineUsers(prev => {
          const leavingUser = prev.find(u => String(u.id) === String(event.user_id));
          if (leavingUser) {
            setToastMessage({ message: `${leavingUser.user_name} left the code session`, type: "info" });
          }
          return prev.filter(u => String(u.id) !== String(event.user_id));
        });
        // Remove from session targets
        setCodeSessionTargets(prev => prev.filter(id => id !== String(event.user_id)));
      } else {
        // Remove user from online list
        setOnlineUsers(prev => {
          const updated = prev.filter(u => String(u.id) !== String(event.user_id));
          console.log(`MetaverseGame: Removed user ${event.user_id}. Online count: ${updated.length}`);
          return updated;
        });
      }
      
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

    onCodeInvite((event) => {
      console.log('Received code invite from:', event.host_name);
      // Auto-reject if we're already in a session (use ref to avoid stale closure)
      if (isCodeEditorOpenRef.current) {
        console.log(`Auto-rejecting invite from ${event.host_name} because we are already in a session.`);
        sendCodeInviteResponse(event.host_id, false, String(user?.user_name || "A user"), "User is already in another code session");
        return;
      }
      setIncomingInvite({ hostId: event.host_id, hostName: event.host_name });
    });

    onCodeInviteResponse((event) => {
      console.log('Received invite response from:', event.responder_name, 'Accepted:', event.accepted);
      if (event.accepted) {
        setToastMessage({ message: `${event.responder_name} joined your session`, type: "success" });
      } else {
        const reasonStr = event.reason ? ` (${event.reason})` : '';
        setToastMessage({ message: `${event.responder_name} declined your invite${reasonStr}`, type: "error" });
      }
    });

    onUserStatusUpdate((event) => {
      console.log(`Received status update for user ${event.user_id}: in_code_session=${event.in_code_session}`);
      setOnlineUsers(prev => prev.map(user => 
        user.id === event.user_id 
          ? { ...user, in_code_session: event.in_code_session }
          : user
      ));
    });

    // Whiteboard WebSocket events
    onWhiteboardUpdate((event) => {
      setActiveWhiteboardElements(event.elements);
      // Apply image files from remote user so images render on this client
      if (event.files && Object.keys(event.files).length > 0) {
        setActiveWhiteboardFiles(prev => ({ ...prev, ...event.files }));
      }
    });

    onWhiteboardClear(() => {
      setActiveWhiteboardElements("[]");
    });

    onWhiteboardInvite((event) => {
      // Auto-reject if already in a whiteboard session
      if (isWhiteboardOpenRef.current) {
        sendWhiteboardInviteResponse(event.host_id, false, String(user?.user_name || "A user"), "User is already in another whiteboard session");
        return;
      }
      setIncomingWhiteboardInvite({ hostId: event.host_id, hostName: event.host_name });
    });

    onWhiteboardInviteResponse((event) => {
      if (event.accepted) {
        setToastMessage({ message: `${event.responder_name} joined your whiteboard`, type: "success" });
      } else {
        const reasonStr = event.reason ? ` (${event.reason})` : '';
        setToastMessage({ message: `${event.responder_name} declined your whiteboard invite${reasonStr}`, type: "error" });
      }
    });

    onWhiteboardStatusUpdate((event) => {
      setOnlineUsers(prev => prev.map(u =>
        u.id === event.user_id
          ? { ...u, in_whiteboard_session: event.in_whiteboard_session }
          : u
      ));
    });

    // ── Interview Room Callbacks ────────────────────────────────────────────
    onWaitingRoomStatus((event) => {
      setWaitingRoomStatus(event.status);
      setWaitingRoomMsg(event.message);
    });

    onCandidateWaiting((event) => {
      setWaitingCandidates((prev) => {
        if (prev.find((c) => c.user_id === event.user_id)) return prev;
        return [...prev, { user_id: event.user_id, user_name: event.user_name, user_avatar_url: event.user_avatar_url }];
      });
      setToastMessage({ message: `${event.user_name} is waiting to join`, type: "info" });
    });

    onInterviewTimer((event) => {
      if (event.event === 'INTERVIEW_TIMER_STARTED') {
        setInterviewTimer({ active: true, durationSeconds: event.duration_seconds || 0, elapsed: 0, startedAt: event.started_at || null });
      } else if (event.event === 'INTERVIEW_TIMER_PAUSED') {
        setInterviewTimer((prev) => ({ ...prev, active: false, durationSeconds: event.remaining_seconds ?? prev.durationSeconds, startedAt: null }));
      } else if (event.event === 'INTERVIEW_TIMER_EXTENDED') {
        setInterviewTimer((prev) => ({ ...prev, durationSeconds: event.new_duration_seconds ?? prev.durationSeconds }));
      }
    });

    onInterviewSessionEnded(() => {
      setInterviewTimer({ active: false, durationSeconds: 0, elapsed: 0, startedAt: null });
      setToastMessage({ message: "Interview session has ended", type: "info" });
    });

    onTabSwitchDetected((event) => {
      setTabSwitchEvents((prev) => [...prev, event]);
    });

    onWebcamSnapshot((event) => {
      setSnapshotEvents((prev) => [...prev, event].slice(-50));
    });

    onYouWereKicked((event) => {
      setToastMessage({ message: `You were removed: ${event.reason}`, type: "error" });
      setTimeout(() => { window.location.href = '/dashboard'; }, 2500);
    });

  }, [onSpaceState, onUserJoined, onUserLeft, onPositionUpdate, onWebRTCSignal,
    onMediaStreamEvent,
    handleSignal,
    handleStreamEvent,
    onCodeUpdate,
    onCodeExecutionResult,
    onCodeInvite,
    onCodeInviteResponse,
    onUserStatusUpdate,
    onWhiteboardUpdate,
    onWhiteboardClear,
    onWhiteboardInvite,
    onWhiteboardInviteResponse,
    onWhiteboardStatusUpdate,
    onWaitingRoomStatus,
    onCandidateWaiting,
    onInterviewTimer,
    onInterviewSessionEnded,
    onTabSwitchDetected,
    onWebcamSnapshot,
    onYouWereKicked,
  ]);

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

    const handleOpenInteractive = (type: string) => {
      if (type === 'CodeEditor' && !isCodeEditorOpenRef.current) {
        setShowCodeShareModal(true);
      } else if (type === 'WhiteBoard' && !isWhiteboardOpenRef.current) {
        setShowWhiteboardSelectModal(true);
      }
    };

    const handleInteractionPrompt = (data: { show: boolean; type: string | null }) => {
      setInteractionPrompt(data);
    };

    gameEventEmitter.on('player-moved', handlePlayerMoved);
    gameEventEmitter.on('open-interactive', handleOpenInteractive);
    gameEventEmitter.on('interaction-prompt', handleInteractionPrompt);

    return () => {
      gameEventEmitter.off('player-moved', handlePlayerMoved);
      gameEventEmitter.off('open-interactive', handleOpenInteractive);
      gameEventEmitter.off('interaction-prompt', handleInteractionPrompt);
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

  // ── Interview Room Hooks (candidate-side invigilation) ──────────────────
  useAntiCheat(interviewRole, sendTabSwitchEvent);
  useWebcamSnapshot(interviewRole, localStream, snapshotIntervalMin, sendWebcamSnapshot);

  // Active candidates admitted to the interview room
  const activeCandidates = onlineUsers
    .filter((u) => String(u.id) !== String(user.id) && (u as any).interview_role === 'CANDIDATE')
    .map((u) => ({ id: String(u.id), user_name: u.user_name }));

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

  useEffect(() => {
    // Disable game canvas input while code editor OR whiteboard is open
    gameEventEmitter.emit('toggle-input', isCodeEditorOpen || isWhiteboardOpen);
  }, [isCodeEditorOpen, isWhiteboardOpen]);

  const handleRunCode = async (code: string, language: string) => {
     try {
         // Optimistically update UI to show "Running..."
         setExecutionResult({ output: "", error: "", isRunning: true });
         sendCodeExecutionResult("", "", codeSessionTargets); // Clear for other people

         const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(':3000', ':8003') || 'http://localhost:8003';
         
         const res = await fetch(`${apiUrl}/api/execute_code`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ code, language, target_user_ids: codeSessionTargets })
         });

         if (!res.ok) {
             throw new Error(`HTTP Error: ${res.statusText}`);
         }

         const data = await res.json();
         setExecutionResult({ output: data.output, error: data.error, isRunning: false });
         
         // Broadcast result to other targeted users in the space
         sendCodeExecutionResult(data.output, data.error, codeSessionTargets);

     } catch (e: any) {
         setExecutionResult({ output: "", error: e.message, isRunning: false });
         sendCodeExecutionResult("", e.message, codeSessionTargets);
     }
  };

  return (
    <div className="page-shell flex h-screen overflow-hidden">
      {/* Left Sidebar - Gather Style */}
      <AnimatePresence mode="wait">
        {showUI && showSidebar && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="glass-panel relative z-20 m-4 flex w-72 flex-col rounded-[28px]"
          >
            {/* Sidebar Header */}
            <div className="border-b border-white/8 p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="surface-label">In Space</p>
                  <h2 className="font-display text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                    {spaceName || "Metaverse 2D"}
                  </h2>
                </div>
                <button 
                  onClick={() => setShowSidebar(false)}
                  className="modal-close"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
              
              {/* Navigation */}
              <div className="grid grid-cols-2 gap-2">
                <Link href="/dashboard" className="btn-ghost rounded-2xl text-sm">
                  <Home className="w-4 h-4" />
                  Dashboard
                </Link>
                <Link href="/discover" className="btn-ghost rounded-2xl text-sm">
                  <Compass className="w-4 h-4" />
                  Discover
                </Link>
              </div>
            </div>

            {/* User Section */}
            <div className="border-b border-white/8 p-4">
              <div className="mb-3 flex items-center gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] p-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-[rgba(239,188,130,0.24)] bg-[rgba(215,163,102,0.12)] text-sm font-bold text-[var(--accent-strong)] shadow-sm">
                  <span>
                    {user?.user_name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                    {user?.user_name}
                  </p>
                  <p className="truncate text-xs uppercase tracking-[0.16em] text-[var(--text-soft)]">
                    Participant
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => setShowInviteModal(true)}
                className="btn-success w-full"
              >
                <UserPlus className="w-4 h-4" />
                Invite
              </button>
            </div>

            {/* Online Users */}
            <div className="border-b border-white/8">
              <button 
                onClick={() => setIsOnlineListOpen(!isOnlineListOpen)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
              >
                <span className="surface-label">
                  Online ({onlineUsers.length})
                </span>
                {isOnlineListOpen ? (
                  <ChevronUp className="w-4 h-4 text-[var(--text-soft)]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[var(--text-soft)]" />
                )}
              </button>
              
              <AnimatePresence>
                {isOnlineListOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 320, damping: 32 }}
                    className="overflow-hidden"
                  >
                    <div className="max-h-40 space-y-1 overflow-y-auto px-2 pb-2">
                      {onlineUsers.map((onlineUser) => (
                        <div 
                          key={onlineUser.id}
                          className="flex items-center gap-2 rounded-2xl px-3 py-2 transition-colors hover:bg-white/[0.04]"
                        >
                          <div className="status-dot" />
                          <span className="flex-1 truncate text-sm font-medium text-[var(--text-secondary)]">
                            {onlineUser.user_name}
                          </span>
                          {String(onlineUser.id) === String(user?.id) && (
                            <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-soft)]">You</span>
                          )}
                        </div>
                      ))}
                      {onlineUsers.length === 0 && (
                        <p className="py-2 text-center text-sm text-[var(--text-soft)]">No users online</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Chat Section */}
            <div className="flex-1 overflow-hidden p-3">
              <ChatBox spaceId={spaceId} />
            </div>

            {/* Logout Button */}
            <div className="border-t border-white/8 p-4">
              <button
                onClick={handleLogout}
                className="btn-secondary w-full"
              >
                <LogOut className="w-4 h-4" />
                Leave Space
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
            className="floating-control absolute left-4 top-4 z-10"
            title="Open Sidebar"
          >
            <Menu className="w-5 h-5" />
          </motion.button>
        )}

        {/* Top Bar for fullscreen/when sidebar hidden */}
        {showUI && !showSidebar && (
          <div className="pointer-events-none absolute left-0 right-0 top-0 z-0 bg-transparent">
            <div className="pointer-events-auto flex justify-end p-4">
              <button
                onClick={handleLogout}
                className="btn-secondary"
              >
                <LogOut className="w-4 h-4" />
                Leave Space
              </button>
            </div>
          </div>
        )}

        {/* Game Canvas & Editor Container */}
        <div className="flex-1 relative flex overflow-hidden bg-[rgba(7,10,16,0.8)]">

          {/* Global Interview Timer — floats above game canvas */}
          {isInterviewSpace && (interviewTimer.active || interviewTimer.durationSeconds > 0) && (
            <GlobalInterviewTimer
              active={interviewTimer.active}
              durationSeconds={interviewTimer.durationSeconds}
              startedAt={interviewTimer.startedAt}
              elapsedAtStart={interviewTimer.elapsed}
            />
          )}
          
          {/* Code Editor (Left Side Split) */}
          <AnimatePresence>
            {isCodeEditorOpen && (
              <motion.div 
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "50%", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="h-full z-20 flex-shrink-0"
              >
                <CodeEditor 
                  spaceId={spaceId} 
                  userId={user?.id}
                  userName={user?.user_name}
                  sessionParticipants={sessionParticipants}
                  onClose={() => {
                    setIsCodeEditorOpen(false);
                    setCodeSessionTargets([]);
                    sendCodeSessionStatus(false);
                  }} 
                  initialCode={activeCode}
                  initialLanguage={activeLanguage}
                  onCodeChange={(code, lang) => {
                      setActiveCode(code);
                      setActiveLanguage(lang);
                      sendCodeUpdate(code, lang, codeSessionTargets);
                  }}
                  onRunCode={handleRunCode}
                  executionResult={executionResult}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Whiteboard (Left Side Split) */}
          <AnimatePresence>
            {isWhiteboardOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: `${whiteboardWidth}%`, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="h-full z-20 flex-shrink-0"
                style={{ width: `${whiteboardWidth}%` }}
              >
                <Whiteboard
                  spaceId={spaceId}
                  userId={String(user?.id)}
                  userName={String(user?.user_name)}
                  sessionParticipants={
                    whiteboardSessionTargets.length > 0
                      ? onlineUsers
                          .filter(u => whiteboardSessionTargets.includes(String(u.id)))
                          .map(u => ({ id: String(u.id), user_name: u.user_name }))
                      : []
                  }
                  onClose={() => {
                    setIsWhiteboardOpen(false);
                    setWhiteboardSessionTargets([]);
                    sendWhiteboardSessionStatus(false);
                  }}
                  initialElements={activeWhiteboardElements}
                  remoteFiles={activeWhiteboardFiles}
                  onElementsChange={(elementsJson, files) => {
                    // Include image file binaries so remote peers can render images
                    sendWhiteboardUpdate(elementsJson, whiteboardSessionTargets, files);
                  }}
                  onClear={() => {
                    setActiveWhiteboardElements("[]");
                    setActiveWhiteboardFiles({});
                    sendWhiteboardClear(whiteboardSessionTargets);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Draggable resize handle — only visible when whiteboard is open */}
          {isWhiteboardOpen && (
            <div
              className="group z-30 flex h-full w-1.5 flex-shrink-0 cursor-col-resize items-center justify-center bg-white/6 transition-colors hover:bg-[rgba(215,163,102,0.28)]"
              title="Drag to resize (50%–70%)"
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startWidthPct = whiteboardWidth;
                const container = (e.currentTarget.parentElement as HTMLElement);
                const containerWidth = container.offsetWidth;

                const onMove = (me: MouseEvent) => {
                  const delta = me.clientX - startX;
                  const newPct = startWidthPct + (delta / containerWidth) * 100;
                  setWhiteboardWidth(Math.min(70, Math.max(50, newPct)));
                };
                const onUp = () => {
                  document.removeEventListener("mousemove", onMove);
                  document.removeEventListener("mouseup", onUp);
                };
                document.addEventListener("mousemove", onMove);
                document.addEventListener("mouseup", onUp);
              }}
            >
              <div className="h-10 w-0.5 rounded-full bg-white/16 transition-colors group-hover:bg-[var(--accent)]" />
            </div>
          )}

          {/* Phaser Game (Right Side Split or Full) */}
          <motion.div 
            layout
            className="relative flex-1 h-full"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
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
            <div className="pointer-events-auto absolute bottom-4 right-4 z-10 flex gap-2">
              {isFullscreen && (
                <button
                  onClick={() => setShowUI(!showUI)}
                  className="floating-control"
                  title={showUI ? "Hide UI" : "Show UI"}
                >
                  {showUI ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              )}
              
              {/* Whiteboard Toggle — hidden when whiteboard open AND hidden in interview-room where you must walk to the board */}
              {!isWhiteboardOpen && !isCodeEditorOpen && actualMapId !== 'interview-room' && (
                <button
                  onClick={() => setShowWhiteboardSelectModal(true)}
                  className="floating-control"
                  title="Open Whiteboard"
                >
                  <PenLine size={20} />
                </button>
              )}
              
              {/* Code Editor Toggle — hidden when code/whiteboard open AND hidden in interview-room where you must walk to the desk */}
              {!isCodeEditorOpen && !isWhiteboardOpen && actualMapId !== 'interview-room' && (
                <button
                  onClick={() => setShowCodeShareModal(true)}
                  className="floating-control"
                  title="Open Code Editor"
                >
                  <Code2 size={20} />
                </button>
              )}

              <button
                onClick={handleToggleFullscreen}
                className={`floating-control ${isFullscreen ? "floating-control-active" : ""}`}
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? <Shrink className="w-5 h-5" /> : <Expand className="w-5 h-5" />}
              </button>
            </div>

            {/* Minimal & Stylish Floating Interaction Prompt */}
            <AnimatePresence>
              {interactionPrompt?.show && interactionPrompt.type && !isCodeEditorOpen && !isWhiteboardOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ type: "spring", stiffness: 320, damping: 28 }}
                  className="absolute bottom-20 left-1/2 z-[100] flex -translate-x-1/2 items-center justify-center pointer-events-none"
                >
                  <div className="glass-bar flex items-center gap-3 rounded-2xl px-5 py-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[rgba(239,188,130,0.2)] bg-[rgba(215,163,102,0.12)] text-sm font-bold text-[var(--accent-strong)] shadow-sm">
                      F
                    </div>
                    <span className="whitespace-nowrap font-semibold tracking-tight text-[var(--text-primary)]">
                      Open {interactionPrompt.type === 'CodeEditor' ? 'Code Editor' : 'Whiteboard'}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        </div>

        {/* Bottom Controls */}
        {showUI && (
          <div className="z-10 px-4 py-2">
            <div className="text-center">
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--text-soft)]">
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

      <CodeShareSelectModal
        isOpen={showCodeShareModal}
        onClose={() => setShowCodeShareModal(false)}
        onlineUsers={onlineUsers}
        currentUserId={String(user?.id)}
        onStartShare={(targets) => {
          setCodeSessionTargets(targets);
          setIsCodeEditorOpen(true);
          setShowCodeShareModal(false);
          sendCodeSessionStatus(true);
          // Send the invite payload
          sendCodeInvite(targets, String(user?.user_name || "Someone"));
          setToastMessage({ message: `Invited ${targets.length} user(s) to code`, type: "info" });
        }}
      />

      <WhiteboardSelectModal
        isOpen={showWhiteboardSelectModal}
        onClose={() => setShowWhiteboardSelectModal(false)}
        onlineUsers={onlineUsers}
        currentUserId={String(user?.id)}
        onStartSession={(targets) => {
          setWhiteboardSessionTargets(targets);
          setIsWhiteboardOpen(true);
          setShowWhiteboardSelectModal(false);
          sendWhiteboardSessionStatus(true);
          if (targets.length > 0) {
            sendWhiteboardInvite(targets, String(user?.user_name || "Someone"));
            setToastMessage({ message: `Invited ${targets.length} user(s) to whiteboard`, type: "info" });
          }
        }}
      />

      <CodeInviteModal
        isOpen={!!incomingInvite}
        hostName={incomingInvite?.hostName || "Someone"}
        onAccept={() => {
          if (incomingInvite) {
            sendCodeInviteResponse(incomingInvite.hostId, true, String(user?.user_name || "A user"));
            setCodeSessionTargets([incomingInvite.hostId]);
            setIsCodeEditorOpen(true);
            sendCodeSessionStatus(true);
          }
          setIncomingInvite(null);
        }}
        onDecline={() => {
          if (incomingInvite) {
            sendCodeInviteResponse(incomingInvite.hostId, false, String(user?.user_name || "A user"));
          }
          setIncomingInvite(null);
        }}
      />

      <WhiteboardInviteModal
        isOpen={!!incomingWhiteboardInvite}
        hostName={incomingWhiteboardInvite?.hostName || "Someone"}
        onAccept={() => {
          if (incomingWhiteboardInvite) {
            sendWhiteboardInviteResponse(incomingWhiteboardInvite.hostId, true, String(user?.user_name || "A user"));
            setWhiteboardSessionTargets([incomingWhiteboardInvite.hostId]);
            setIsWhiteboardOpen(true);
            sendWhiteboardSessionStatus(true);
          }
          setIncomingWhiteboardInvite(null);
        }}
        onDecline={() => {
          if (incomingWhiteboardInvite) {
            sendWhiteboardInviteResponse(incomingWhiteboardInvite.hostId, false, String(user?.user_name || "A user"));
          }
          setIncomingWhiteboardInvite(null);
        }}
      />

      {/* ── Interview Rooms: Interviewer Panel ───────────────────────────── */}
      {isInterviewSpace && interviewRole === 'INTERVIEWER' && showUI && (
        <div className="absolute right-4 top-4 bottom-4 z-20 flex items-start">
          <InterviewerPanel
            initialWaiting={waitingCandidates}
            onAdmit={sendAdmitCandidate}
            onReject={sendRejectCandidate}
            onKick={sendKickUser}
            onTimerStart={sendInterviewTimerStart}
            onTimerPause={sendInterviewTimerPause}
            onTimerExtend={sendInterviewTimerExtend}
            onSessionEnd={sendInterviewSessionEnd}
            timerActive={interviewTimer.active}
            timerDuration={interviewTimer.durationSeconds}
            timerElapsed={interviewTimer.elapsed}
            timerStartedAt={interviewTimer.startedAt}
            tabSwitchEvents={tabSwitchEvents}
            snapshotEvents={snapshotEvents}
            activeCandidates={activeCandidates}
          />
        </div>
      )}

      {/* ── Interview Rooms: Candidate Waiting Room Overlay ──────────────── */}
      {isInterviewSpace && interviewRole === 'CANDIDATE' && (
        <CandidateWaitingRoom
          status={waitingRoomStatus}
          message={waitingRoomMsg}
          onDismiss={() => { window.location.href = '/dashboard'; }}
        />
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <SimpleToast 
          message={toastMessage.message} 
          type={toastMessage.type} 
          onClose={() => setToastMessage(null)} 
        />
      )}
    </div>
  );
}
