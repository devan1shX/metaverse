"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const getWebSocketUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (envUrl) {
    if (envUrl.includes(':3000')) {
      console.error('ERROR: NEXT_PUBLIC_WS_URL should use port 8003, not 3000!');
      console.error('Falling back to default: ws://localhost:8003');
      return 'ws://localhost:8003';
    }
    return envUrl;
  }
  return 'ws://localhost:8003';
};

const WS_URL = getWebSocketUrl();

export interface PositionUpdate {
  event: string;
  user_id: string;
  space_id: string;
  nx: number;
  ny: number;
  direction?: string;
  isMoving?: boolean;
}
export interface UserJoinedEvent {
  event: string;
  user_id: string;
  space_id: string;
  user_data: {
    id: string;
    user_name: string;
    user_avatar_url: string;
    in_code_session?: boolean;
  };
  x: number;
  y: number;
}
export interface UserLeftEvent {
  event: string;
  user_id: string;
  space_id: string;
}
export interface ChatMessage {
  event: 'CHAT_MESSAGE';
  user_id: string;
  user_name: string;
  space_id: string;
  message: string;
  timestamp: number;
}
export interface SpaceState {
  event: 'space_state';
  space_id: string;
  map_id?: string;  // FIX: Include map_id from space
  users: { [key: string]: any };
  positions: { [key: string]: { x: number; y: number } };
  media_info?: {
    audio_streams: Array<{ user_id: string; stream_id: string }>;
    video_streams: Array<{ user_id: string; stream_id: string }>;
  };
  code_session?: {
    code: string;
    language: string;
  };
  whiteboard_state?: string; // JSON string of Excalidraw elements
}

export interface CodeUpdateEvent {
  event: 'code_update';
  code: string;
  language: string;
  user_id: string;
  target_user_ids?: string[];
}

export interface CodeInviteEvent {
  event: 'receive_code_invite';
  host_id: string;
  host_name: string;
}

export interface CodeInviteResponseEvent {
  event: 'receive_code_invite_response';
  responder_id: string;
  responder_name: string;
  accepted: boolean;
  reason?: string;
}

export interface UserStatusUpdateEvent {
  event: 'user_status_update';
  user_id: string;
  in_code_session: boolean;
}

export interface WhiteboardUpdateEvent {
  event: 'whiteboard_update';
  elements: string; // JSON string of Excalidraw elements
  files?: Record<string, any>; // Excalidraw BinaryFiles map (base64 dataURLs)
  user_id: string;
}

export interface WhiteboardInviteEvent {
  event: 'receive_whiteboard_invite';
  host_id: string;
  host_name: string;
}

export interface WhiteboardInviteResponseEvent {
  event: 'receive_whiteboard_invite_response';
  responder_id: string;
  responder_name: string;
  accepted: boolean;
  reason?: string;
}

export interface WhiteboardStatusUpdateEvent {
  event: 'whiteboard_status_update';
  user_id: string;
  in_whiteboard_session: boolean;
}

// ──────────────────────────────────────────
// Interview Room Types
// ──────────────────────────────────────────
export interface WaitingRoomStatusEvent {
  event: 'waiting_room_status';
  status: 'waiting' | 'admitted' | 'rejected';
  message: string;
}

export interface CandidateWaitingEvent {
  event: 'candidate_waiting';
  user_id: string;
  user_name: string;
  user_avatar_url: string;
  waiting_count: number;
}

export interface InterviewTimerEvent {
  event: 'INTERVIEW_TIMER_STARTED' | 'INTERVIEW_TIMER_PAUSED' | 'INTERVIEW_TIMER_EXTENDED';
  duration_seconds?: number;
  started_at?: number;
  remaining_seconds?: number;
  extra_seconds?: number;
  new_duration_seconds?: number;
}

export interface InterviewSessionEndedEvent {
  event: 'INTERVIEW_SESSION_ENDED';
  ended_by: string;
}

export interface TabSwitchDetectedEvent {
  event: 'TAB_SWITCH_DETECTED';
  candidate_id: string;
  candidate_name: string;
  switch_type: 'tab_switch' | 'blur';
  timestamp: number;
}

export interface WebcamSnapshotEvent {
  event: 'WEBCAM_SNAPSHOT';
  candidate_id: string;
  candidate_name: string;
  image: string; // base64 data URL
  timestamp: number;
}

export interface YouWereKickedEvent {
  event: 'YOU_WERE_KICKED';
  reason: string;
}

export interface WebRTCSignal {
  event: 'WEBRTC_SIGNAL';
  signal_type: 'offer' | 'answer' | 'ice_candidate';
  from_user_id: string;
  space_id: string;
  data: any;
  timestamp: number;
}

export interface MediaStreamEvent {
  event: 'AUDIO_STREAM_STARTED' | 'AUDIO_STREAM_STOPPED' | 'VIDEO_STREAM_STARTED' | 'VIDEO_STREAM_STOPPED' | 'SCREEN_STREAM_STARTED' | 'SCREEN_STREAM_STOPPED';
  user_id: string;
  user_name: string;
  space_id: string;
  stream_id: string;
  timestamp: number;
}

export function useSpaceWebSocket(spaceId: string | null) {
  const { user } = useAuth();
  const userId = user?.id;
  const [isConnected, setIsConnected] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const isSubscribedRef = useRef(false);
  const isConnectingRef = useRef(false);
  const isMountedRef = useRef(true);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const lastPositionRef = useRef<{ x: number; y: number; direction?: string; isMoving?: boolean } | null>(null);
  const positionThrottleRef = useRef<number>(0);

  // Callbacks
  const positionUpdateCallbackRef = useRef<((update: PositionUpdate) => void) | null>(null);
  const userJoinedCallbackRef = useRef<((event: UserJoinedEvent) => void) | null>(null);
  const userLeftCallbackRef = useRef<((event: UserLeftEvent) => void) | null>(null);
  const chatCallbackRef = useRef<((message: ChatMessage) => void) | null>(null);
  const spaceStateCallbackRef = useRef<((state: SpaceState) => void) | null>(null);
  const webrtcSignalCallbackRef = useRef<((signal: WebRTCSignal) => void) | null>(null);
  const mediaStreamCallbackRef = useRef<((event: MediaStreamEvent) => void) | null>(null);
  const codeUpdateCallbackRef = useRef<((event: CodeUpdateEvent) => void) | null>(null);
  const codeExecutionCallbackRef = useRef<((result: { output: string, error: string, isRunning: boolean }) => void) | null>(null);
  const codeInviteCallbackRef = useRef<((event: CodeInviteEvent) => void) | null>(null);
  const codeInviteResponseCallbackRef = useRef<((event: CodeInviteResponseEvent) => void) | null>(null);
  const userStatusUpdateCallbackRef = useRef<((event: UserStatusUpdateEvent) => void) | null>(null);
  // Whiteboard callbacks
  const whiteboardUpdateCallbackRef = useRef<((event: WhiteboardUpdateEvent) => void) | null>(null);
  const whiteboardClearCallbackRef = useRef<(() => void) | null>(null);
  const whiteboardInviteCallbackRef = useRef<((event: WhiteboardInviteEvent) => void) | null>(null);
  const whiteboardInviteResponseCallbackRef = useRef<((event: WhiteboardInviteResponseEvent) => void) | null>(null);
  const whiteboardStatusUpdateCallbackRef = useRef<((event: WhiteboardStatusUpdateEvent) => void) | null>(null);

  // ── Interview Room Callbacks ───────────────────────────────
  const waitingRoomStatusCallbackRef = useRef<((event: WaitingRoomStatusEvent) => void) | null>(null);
  const candidateWaitingCallbackRef = useRef<((event: CandidateWaitingEvent) => void) | null>(null);
  const interviewTimerCallbackRef = useRef<((event: InterviewTimerEvent) => void) | null>(null);
  const interviewSessionEndedCallbackRef = useRef<((event: InterviewSessionEndedEvent) => void) | null>(null);
  const tabSwitchDetectedCallbackRef = useRef<((event: TabSwitchDetectedEvent) => void) | null>(null);
  const webcamSnapshotCallbackRef = useRef<((event: WebcamSnapshotEvent) => void) | null>(null);
  const youWereKickedCallbackRef = useRef<((event: YouWereKickedEvent) => void) | null>(null);

  // Update ref when state changes
  useEffect(() => {
    isSubscribedRef.current = isSubscribed;
  }, [isSubscribed]);

  // Clean disconnect
  const cleanupConnection = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      const ws = wsRef.current;
      wsRef.current = null;

      // Remove all event listeners to prevent memory leaks
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;

      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        try {
          ws.close(1000, 'Cleanup');
        } catch (e) {
          console.error('Error closing WebSocket:', e);
        }
      }
    }

    isConnectingRef.current = false;
    setIsConnected(false);
    setIsSubscribed(false);
    isSubscribedRef.current = false;
  }, []);

  // Connect function
  const connect = useCallback(() => {
    // Prevent duplicate connections
    if (!spaceId || !userId || isConnectingRef.current) {
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket: Already connected');
      return;
    }

    // Clean up any existing connection
    cleanupConnection();

    isConnectingRef.current = true;

    try {
      const wsUrl = `${WS_URL}/ws/metaverse/space`;
      console.log('WebSocket: Connecting to:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) {
          ws.close();
          return;
        }

        console.log('WebSocket: Connected successfully');
        setIsConnected(true);
        setError(null);
        isConnectingRef.current = false;
        reconnectAttemptsRef.current = 0;

        // Subscribe to space
        const subscribeMessage = {
          event: 'subscribe',
          space_id: spaceId,
        };
        console.log('WebSocket: Subscribing to space:', spaceId);
        ws.send(JSON.stringify(subscribeMessage));
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;

        try {
          const message = JSON.parse(event.data);

          if (message.event === 'subscribed') {
            console.log('WebSocket: Subscribed to space:', message.space_id);
            setIsSubscribed(true);
            isSubscribedRef.current = true;

            // Send join message
            if (userId) {
              const joinMessage = {
                event: 'join',
                user_id: userId,
                space_id: spaceId,
              };
              ws.send(JSON.stringify(joinMessage));
            }
          }
          else if (message.event === 'space_state') {
            spaceStateCallbackRef.current?.(message as SpaceState);
          }
          else if (message.event === 'position_update') {
            positionUpdateCallbackRef.current?.(message as PositionUpdate);
          }
          else if (message.event === 'user_joined') {
            userJoinedCallbackRef.current?.(message as UserJoinedEvent);
          }
          else if (message.event === 'user_left') {
            userLeftCallbackRef.current?.(message as UserLeftEvent);
          }
          else if (message.event === 'CHAT_MESSAGE') {
            // CRITICAL FIX: Always save chat messages to localStorage, even if ChatBox is not mounted
            // This ensures messages are available when the user opens the chat later
            if (spaceId) {
              try {
                const storageKey = `chat-history-${spaceId}`;
                const storedMessages = localStorage.getItem(storageKey);
                let messages: ChatMessage[] = [];

                if (storedMessages) {
                  messages = JSON.parse(storedMessages);
                }

                // Add new message if it doesn't already exist (prevent duplicates)
                const isDuplicate = messages.some(
                  (msg) => msg.timestamp === message.timestamp && msg.user_id === message.user_id
                );

                if (!isDuplicate) {
                  messages.push(message as ChatMessage);
                  localStorage.setItem(storageKey, JSON.stringify(messages));
                  console.log('Chat message saved to localStorage:', message);
                }
              } catch (storageErr) {
                console.error('Error saving chat message to localStorage:', storageErr);
              }
            }

            // Also call the callback if ChatBox is mounted and listening
            chatCallbackRef.current?.(message as ChatMessage);
          }
          else if (message.event === 'code_update') {
            codeUpdateCallbackRef.current?.(message as CodeUpdateEvent);
          }
          else if (message.event === 'code_execution_result') {
            codeExecutionCallbackRef.current?.({ output: message.output, error: message.error, isRunning: false });
          }
          else if (message.event === 'receive_code_invite') {
            codeInviteCallbackRef.current?.(message as CodeInviteEvent);
          }
          else if (message.event === 'receive_code_invite_response') {
            codeInviteResponseCallbackRef.current?.(message as CodeInviteResponseEvent);
          }
          else if (message.event === 'user_status_update') {
            userStatusUpdateCallbackRef.current?.(message as UserStatusUpdateEvent);
          }
          else if (message.event === 'whiteboard_update') {
            whiteboardUpdateCallbackRef.current?.(message as WhiteboardUpdateEvent);
          }
          else if (message.event === 'whiteboard_clear') {
            whiteboardClearCallbackRef.current?.();
          }
          else if (message.event === 'receive_whiteboard_invite') {
            whiteboardInviteCallbackRef.current?.(message as WhiteboardInviteEvent);
          }
          else if (message.event === 'receive_whiteboard_invite_response') {
            whiteboardInviteResponseCallbackRef.current?.(message as WhiteboardInviteResponseEvent);
          }
          else if (message.event === 'whiteboard_status_update') {
            whiteboardStatusUpdateCallbackRef.current?.(message as WhiteboardStatusUpdateEvent);
          }
          else if (message.event === 'position_move_ack') {
            // Acknowledged
          }
          else if (message.event === 'WEBRTC_SIGNAL') {
            console.log('📡 WebSocket: Received WEBRTC_SIGNAL:', message.signal_type, 'from', message.from_user_id);
            webrtcSignalCallbackRef.current?.(message as WebRTCSignal);
          }
          else if (
            message.event === 'AUDIO_STREAM_STARTED' ||
            message.event === 'AUDIO_STREAM_STOPPED' ||
            message.event === 'VIDEO_STREAM_STARTED' ||
            message.event === 'VIDEO_STREAM_STOPPED' ||
            message.event === 'SCREEN_STREAM_STARTED' ||
            message.event === 'SCREEN_STREAM_STOPPED'
          ) {
            console.log('📡 WebSocket: Received media event:', message.event, 'from user', message.user_id);
            mediaStreamCallbackRef.current?.(message as MediaStreamEvent);
          }
          else if (message.event === 'error') {
            console.error('WebSocket server error:', message.message);
            setError(message.message);
          }
          // ── Interview Room Events ───────────────────────────────
          else if (message.event === 'waiting_room_status') {
            waitingRoomStatusCallbackRef.current?.(message as WaitingRoomStatusEvent);
          }
          else if (message.event === 'candidate_waiting') {
            candidateWaitingCallbackRef.current?.(message as CandidateWaitingEvent);
          }
          else if (
            message.event === 'INTERVIEW_TIMER_STARTED' ||
            message.event === 'INTERVIEW_TIMER_PAUSED' ||
            message.event === 'INTERVIEW_TIMER_EXTENDED'
          ) {
            interviewTimerCallbackRef.current?.(message as InterviewTimerEvent);
          }
          else if (message.event === 'INTERVIEW_SESSION_ENDED') {
            interviewSessionEndedCallbackRef.current?.(message as InterviewSessionEndedEvent);
          }
          else if (message.event === 'TAB_SWITCH_DETECTED') {
            tabSwitchDetectedCallbackRef.current?.(message as TabSwitchDetectedEvent);
          }
          else if (message.event === 'WEBCAM_SNAPSHOT') {
            webcamSnapshotCallbackRef.current?.(message as WebcamSnapshotEvent);
          }
          else if (message.event === 'YOU_WERE_KICKED') {
            youWereKickedCallbackRef.current?.(message as YouWereKickedEvent);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error');
        isConnectingRef.current = false;
      };

      ws.onclose = (event) => {
        if (!isMountedRef.current) return;

        console.log('WebSocket: Closed', event.code, event.reason);
        setIsConnected(false);
        setIsSubscribed(false);
        isSubscribedRef.current = false;
        isConnectingRef.current = false;

        // Only reconnect if not a clean close and we haven't exceeded attempts
        if (event.code !== 1000 && reconnectAttemptsRef.current < 5) {
          const delay = Math.min(3000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`WebSocket: Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current && spaceId && userId) {
              reconnectAttemptsRef.current++;
              connect();
            }
          }, delay);
        } else if (reconnectAttemptsRef.current >= 5) {
          console.error('WebSocket: Max reconnection attempts reached');
          setError('Failed to connect after multiple attempts');
        }
      };
    } catch (err: any) {
      console.error('Error creating WebSocket:', err);
      setError(err.message || 'Failed to create WebSocket connection');
      isConnectingRef.current = false;
    }
  }, [spaceId, userId, cleanupConnection]);

  // Disconnect
  const disconnect = useCallback(() => {
    console.log('WebSocket: Disconnecting...');

    if (wsRef.current && isSubscribedRef.current && userId && spaceId) {
      try {
        const leaveMessage = {
          event: 'left',
          user_id: userId,
          space_id: spaceId,
        };
        console.log('WebSocket: Sending leave message');
        wsRef.current.send(JSON.stringify(leaveMessage));
      } catch (err) {
        console.error('Error sending leave message:', err);
      }
    }

    cleanupConnection();
  }, [userId, spaceId, cleanupConnection]);

  // Send position update
  const sendPositionUpdate = useCallback((x: number, y: number, direction: string, isMoving: boolean) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !isSubscribedRef.current || !userId || !spaceId) {
      return;
    }

    const now = Date.now();
    if (now - positionThrottleRef.current < 100) {
      return;
    }

    if (lastPositionRef.current) {
      const dx = Math.abs(x - lastPositionRef.current.x);
      const dy = Math.abs(y - lastPositionRef.current.y);
      // Reduce threshold to ensure small movements (like turning in place) are sent
      // But still prevent spamming if absolutely no change
      if (dx < 1 && dy < 1 && lastPositionRef.current.direction === direction && lastPositionRef.current.isMoving === isMoving) {
        return;
      }
    }

    try {
      const positionMessage = {
        event: 'position_move',
        user_id: userId,
        space_id: spaceId,
        nx: Math.round(x),
        ny: Math.round(y),
        direction,
        isMoving,
      };
      wsRef.current.send(JSON.stringify(positionMessage));
      positionThrottleRef.current = now;
      lastPositionRef.current = { x, y, direction, isMoving };
    } catch (err) {
      console.error('Error sending position update:', err);
    }
  }, [userId, spaceId]);

  // Send chat message
  const sendChatMessage = useCallback((message: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !isSubscribedRef.current || !userId || !spaceId) {
      console.error('Cannot send chat message, WS not ready');
      return;
    }

    try {
      const chatMessage = {
        event: 'send_chat_message',
        data: {
          sender_id: userId,
          space_id: spaceId,
          content: message,
        }
      };
      wsRef.current.send(JSON.stringify(chatMessage));
    } catch (err) {
      console.error('Error sending chat message:', err);
    }
  }, [userId, spaceId]);

  // Send Code Update
  const sendCodeUpdate = useCallback((code: string, language: string, targetUserIds: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({
          event: 'code_update',
          code,
          language,
          target_user_ids: targetUserIds
        }));
      } catch (err) {
        console.error('Error sending code update:', err);
      }
    }
  }, []);

  // Sync execution results across users
  const sendCodeExecutionResult = useCallback((output: string, error: string, targetUserIds: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({
          event: 'code_execution_result',
          output,
          error,
          target_user_ids: targetUserIds
        }));
      } catch (err) {
        console.error('Error sending code execution info:', err);
      }
    }
  }, []);

  const sendCodeInvite = useCallback((targetUserIds: string[], hostName: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        event: 'send_code_invite',
        target_user_ids: targetUserIds,
        host_name: hostName
      }));
    }
  }, []);

  const sendCodeInviteResponse = useCallback((hostId: string, accepted: boolean, responderName: string, reason?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        event: 'code_invite_response',
        host_id: hostId,
        accepted,
        responder_name: responderName,
        reason
      }));
    }
  }, []);

  const sendCodeSessionStatus = useCallback((inSession: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && userId && spaceId) {
      wsRef.current.send(JSON.stringify({
        event: 'code_session_status',
        user_id: userId,
        space_id: spaceId,
        in_session: inSession
      }));
    }
  }, [userId, spaceId]);

  // ─── Whiteboard Send Functions ───────────────────────────────────────────────

  const sendWhiteboardUpdate = useCallback((elementsJson: string, targetUserIds: string[], files: Record<string, any> = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        event: 'whiteboard_update',
        elements: elementsJson,
        target_user_ids: targetUserIds,
        files: files,
      }));
    }
  }, []);

  const sendWhiteboardClear = useCallback((targetUserIds: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        event: 'whiteboard_clear',
        target_user_ids: targetUserIds,
      }));
    }
  }, []);

  const sendWhiteboardInvite = useCallback((targetUserIds: string[], hostName: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        event: 'send_whiteboard_invite',
        target_user_ids: targetUserIds,
        host_name: hostName,
      }));
    }
  }, []);

  const sendWhiteboardInviteResponse = useCallback((hostId: string, accepted: boolean, responderName: string, reason?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        event: 'whiteboard_invite_response',
        host_id: hostId,
        accepted,
        responder_name: responderName,
        reason,
      }));
    }
  }, []);

  const sendWhiteboardSessionStatus = useCallback((inSession: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && userId && spaceId) {
      wsRef.current.send(JSON.stringify({
        event: 'whiteboard_session_status',
        user_id: userId,
        space_id: spaceId,
        in_session: inSession,
      }));
    }
  }, [userId, spaceId]);

  // ── Interview Room Send Functions ────────────────────────────
  const sendAdmitCandidate = useCallback((candidateId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'admit_candidate', candidate_id: candidateId }));
    }
  }, []);

  const sendRejectCandidate = useCallback((candidateId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'reject_candidate', candidate_id: candidateId }));
    }
  }, []);

  const sendInterviewTimerStart = useCallback((durationSeconds: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'interview_timer_start', duration_seconds: durationSeconds }));
    }
  }, []);

  const sendInterviewTimerPause = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'interview_timer_pause' }));
    }
  }, []);

  const sendInterviewTimerExtend = useCallback((extraSeconds: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'interview_timer_extend', extra_seconds: extraSeconds }));
    }
  }, []);

  const sendInterviewSessionEnd = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'interview_session_end' }));
    }
  }, []);

  const sendTabSwitchEvent = useCallback((switchType: 'tab_switch' | 'blur') => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'tab_switch_event', switch_type: switchType }));
    }
  }, []);

  const sendWebcamSnapshot = useCallback((imageDataUrl: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'webcam_snapshot', image: imageDataUrl }));
    }
  }, []);

  const sendKickUser = useCallback((targetUserId: string, reason?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'kick_user', target_user_id: targetUserId, reason: reason || 'Removed by interviewer' }));
    }
  }, []);

  // ── Interview Room Callback Setters ────────────────────────
  const onWaitingRoomStatus = useCallback((cb: (event: WaitingRoomStatusEvent) => void) => {
    waitingRoomStatusCallbackRef.current = cb;
  }, []);

  const onCandidateWaiting = useCallback((cb: (event: CandidateWaitingEvent) => void) => {
    candidateWaitingCallbackRef.current = cb;
  }, []);

  const onInterviewTimer = useCallback((cb: (event: InterviewTimerEvent) => void) => {
    interviewTimerCallbackRef.current = cb;
  }, []);

  const onInterviewSessionEnded = useCallback((cb: (event: InterviewSessionEndedEvent) => void) => {
    interviewSessionEndedCallbackRef.current = cb;
  }, []);

  const onTabSwitchDetected = useCallback((cb: (event: TabSwitchDetectedEvent) => void) => {
    tabSwitchDetectedCallbackRef.current = cb;
  }, []);

  const onWebcamSnapshot = useCallback((cb: (event: WebcamSnapshotEvent) => void) => {
    webcamSnapshotCallbackRef.current = cb;
  }, []);

  const onYouWereKicked = useCallback((cb: (event: YouWereKickedEvent) => void) => {
    youWereKickedCallbackRef.current = cb;
  }, []);

  // Set callbacks – existing whiteboard
  const onWhiteboardSessionStatus = useCallback((cb: (event: WhiteboardStatusUpdateEvent) => void) => {
    whiteboardStatusUpdateCallbackRef.current = cb;
  }, []);


  const onPositionUpdate = useCallback((callback: (update: PositionUpdate) => void) => {
    positionUpdateCallbackRef.current = callback;
  }, []);

  const onUserJoined = useCallback((callback: (event: UserJoinedEvent) => void) => {
    userJoinedCallbackRef.current = callback;
  }, []);

  const onUserLeft = useCallback((callback: (event: UserLeftEvent) => void) => {
    userLeftCallbackRef.current = callback;
  }, []);

  const onChatMessage = useCallback((callback: (message: ChatMessage) => void) => {
    chatCallbackRef.current = callback;
  }, []);

  const onSpaceState = useCallback((callback: (state: SpaceState) => void) => {
    spaceStateCallbackRef.current = callback;
  }, []);

  const onUserStatusUpdate = useCallback((callback: (event: UserStatusUpdateEvent) => void) => {
    userStatusUpdateCallbackRef.current = callback;
  }, []);

  const sendMediaSignal = useCallback((signalType: string, toUserId: string, data: any) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !isSubscribedRef.current || !userId || !spaceId) {
      return;
    }
    try {
      const signalMessage = {
        event: 'webrtc_signal',
        signal_type: signalType,
        to_user_id: toUserId,
        space_id: spaceId,
        data: data
      };
      wsRef.current.send(JSON.stringify(signalMessage));
    } catch (err) {
      console.error('Error sending media signal:', err);
    }
  }, [userId, spaceId]);

  const startMediaStream = useCallback((type: 'audio' | 'video' | 'screen', metadata: any = {}) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !isSubscribedRef.current || !userId || !spaceId) {
      return;
    }
    try {
      wsRef.current.send(JSON.stringify({
        event: `start_${type}_stream`,
        user_id: userId,
        space_id: spaceId,
        metadata
      }));
    } catch (err) {
      console.error(`Error starting ${type} stream:`, err);
    }
  }, [userId, spaceId]);

  const stopMediaStream = useCallback((type: 'audio' | 'video' | 'screen') => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !isSubscribedRef.current || !userId || !spaceId) {
      return;
    }
    try {
      wsRef.current.send(JSON.stringify({
        event: `stop_${type}_stream`,
        user_id: userId,
        space_id: spaceId
      }));
    } catch (err) {
      console.error(`Error stopping ${type} stream:`, err);
    }
  }, [userId, spaceId]);

  const onWebRTCSignal = useCallback((callback: (signal: WebRTCSignal) => void) => {
    webrtcSignalCallbackRef.current = callback;
  }, []);

  const onMediaStreamEvent = useCallback((callback: (event: MediaStreamEvent) => void) => {
    mediaStreamCallbackRef.current = callback;
  }, []);

  const onCodeUpdate = useCallback((callback: (event: CodeUpdateEvent) => void) => {
    codeUpdateCallbackRef.current = callback;
  }, []);

  const onCodeExecutionResult = useCallback((callback: (result: { output: string, error: string, isRunning: boolean }) => void) => {
    codeExecutionCallbackRef.current = callback;
  }, []);

  const onCodeInvite = useCallback((callback: (event: CodeInviteEvent) => void) => {
    codeInviteCallbackRef.current = callback;
  }, []);

  const onCodeInviteResponse = useCallback((callback: (event: CodeInviteResponseEvent) => void) => {
    codeInviteResponseCallbackRef.current = callback;
  }, []);

  // ─── Whiteboard Callbacks ────────────────────────────────────────────────────

  const onWhiteboardUpdate = useCallback((callback: (event: WhiteboardUpdateEvent) => void) => {
    whiteboardUpdateCallbackRef.current = callback;
  }, []);

  const onWhiteboardClear = useCallback((callback: () => void) => {
    whiteboardClearCallbackRef.current = callback;
  }, []);

  const onWhiteboardInvite = useCallback((callback: (event: WhiteboardInviteEvent) => void) => {
    whiteboardInviteCallbackRef.current = callback;
  }, []);

  const onWhiteboardInviteResponse = useCallback((callback: (event: WhiteboardInviteResponseEvent) => void) => {
    whiteboardInviteResponseCallbackRef.current = callback;
  }, []);

  const onWhiteboardStatusUpdate = useCallback((callback: (event: WhiteboardStatusUpdateEvent) => void) => {
    whiteboardStatusUpdateCallbackRef.current = callback;
  }, []);

  // Connect on mount
  useEffect(() => {
    isMountedRef.current = true;

    if (spaceId && userId) {
      // Small delay to prevent double-connect in StrictMode
      const timeoutId = setTimeout(() => {
        if (isMountedRef.current) {
          connect();
        }
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        isMountedRef.current = false;
        disconnect();
      };
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [spaceId, userId, connect, disconnect]);

  return {
    isConnected,
    isSubscribed,
    error,
    connect,
    disconnect,
    sendPositionUpdate,
    onPositionUpdate,
    onUserJoined,
    onUserLeft,
    sendChatMessage,
    onChatMessage,
    onSpaceState,
    sendMediaSignal,
    startMediaStream,
    stopMediaStream,
    onWebRTCSignal,
    onMediaStreamEvent,
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
  };
}