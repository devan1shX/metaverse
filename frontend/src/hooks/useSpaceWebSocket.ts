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

  // Set callbacks
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
  };
}