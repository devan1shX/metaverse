"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { MetaverseWebSocket, getWebSocketInstance, WebSocketResponse, WS_EVENTS, WSEventType } from '@/lib/websocket'

export interface UseWebSocketOptions {
  autoConnect?: boolean
  token?: string
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { autoConnect = false, token } = options
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<MetaverseWebSocket | null>(null)

  // Initialize WebSocket instance
  useEffect(() => {
    wsRef.current = getWebSocketInstance()
    
    // Set up connection handlers
    wsRef.current.onConnect(() => {
      setIsConnected(true)
      setIsConnecting(false)
      setError(null)
    })

    wsRef.current.onDisconnect((event) => {
      setIsConnected(false)
      setIsConnecting(false)
      if (event.code !== 1000) {
        setError(`Connection lost: ${event.reason || 'Unknown reason'}`)
      }
    })

    wsRef.current.onError((error) => {
      setIsConnected(false)
      setIsConnecting(false)
      setError('WebSocket connection error')
    })

    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect()
      }
    }
  }, [])

  // Auto-connect if enabled
  useEffect(() => {
    if (autoConnect && wsRef.current && !isConnected && !isConnecting) {
      connect()
    }
  }, [autoConnect])

  const connect = useCallback(async () => {
    if (!wsRef.current || isConnecting || isConnected) return

    try {
      setIsConnecting(true)
      setError(null)
      await wsRef.current.connect(token)
    } catch (err: any) {
      setError(err.message || 'Failed to connect')
      setIsConnecting(false)
    }
  }, [token, isConnecting, isConnected])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.disconnect()
    }
  }, [])

  const sendMessage = useCallback(async (type: string, payload: any): Promise<WebSocketResponse> => {
    if (!wsRef.current) {
      throw new Error('WebSocket not initialized')
    }
    return wsRef.current.send({ type, payload })
  }, [])

  const onMessage = useCallback((type: WSEventType, handler: (data: any) => void) => {
    if (wsRef.current) {
      wsRef.current.onMessage(type, handler)
    }
  }, [])

  const offMessage = useCallback((type: WSEventType) => {
    if (wsRef.current) {
      wsRef.current.offMessage(type)
    }
  }, [])

  return {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    sendMessage,
    onMessage,
    offMessage,
    ws: wsRef.current
  }
}

// Hook specifically for space interactions
export function useSpaceWebSocket(spaceId: string, userId: string, options: UseWebSocketOptions = {}) {
  const { isConnected, isConnecting, error, connect, disconnect, sendMessage, onMessage, offMessage, ws } = useWebSocket(options)
  const [users, setUsers] = useState<Array<{
    id: string
    username: string
    position: { x: number, y: number, direction: string }
  }>>([])
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string
    userId: string
    username: string
    message: string
    timestamp: string
  }>>([])

  // Handle incoming messages
  useEffect(() => {
    if (!isConnected) return

    // Handle user joined
    onMessage(WS_EVENTS.USER_JOINED, (data) => {
      setUsers(prev => {
        const existing = prev.find(u => u.id === data.userId)
        if (existing) return prev
        return [...prev, {
          id: data.userId,
          username: data.username,
          position: data.position
        }]
      })
    })

    // Handle user left
    onMessage(WS_EVENTS.USER_LEFT, (data) => {
      setUsers(prev => prev.filter(u => u.id !== data.userId))
    })

    // Handle user moved
    onMessage(WS_EVENTS.USER_MOVED, (data) => {
      setUsers(prev => prev.map(u => 
        u.id === data.userId 
          ? { ...u, position: data.position }
          : u
      ))
    })

    // Handle chat messages
    onMessage(WS_EVENTS.CHAT_MESSAGE, (data) => {
      setChatMessages(prev => [...prev, {
        id: data.id || Date.now().toString(),
        userId: data.userId,
        username: data.username,
        message: data.message,
        timestamp: data.timestamp || new Date().toISOString()
      }])
    })

    return () => {
      offMessage(WS_EVENTS.USER_JOINED)
      offMessage(WS_EVENTS.USER_LEFT)
      offMessage(WS_EVENTS.USER_MOVED)
      offMessage(WS_EVENTS.CHAT_MESSAGE)
    }
  }, [isConnected, onMessage, offMessage])

  const joinSpace = useCallback(async (initialPosition: { x: number, y: number, direction: string }) => {
    if (!ws) throw new Error('WebSocket not available')
    return ws.joinSpace(spaceId, userId, initialPosition)
  }, [ws, spaceId, userId])

  const leaveSpace = useCallback(async () => {
    if (!ws) throw new Error('WebSocket not available')
    return ws.leaveSpace(spaceId, userId)
  }, [ws, spaceId, userId])

  const movePlayer = useCallback(async (position: { x: number, y: number, direction: string }) => {
    if (!ws) throw new Error('WebSocket not available')
    return ws.movePlayer(spaceId, userId, position)
  }, [ws, spaceId, userId])

  const sendChat = useCallback(async (message: string) => {
    if (!ws) throw new Error('WebSocket not available')
    return ws.sendChatMessage(spaceId, userId, message)
  }, [ws, spaceId, userId])

  const performAction = useCallback(async (action: string, target?: any) => {
    if (!ws) throw new Error('WebSocket not available')
    return ws.performAction(spaceId, userId, action, target)
  }, [ws, spaceId, userId])

  return {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    users,
    chatMessages,
    joinSpace,
    leaveSpace,
    movePlayer,
    sendChat,
    performAction,
    clearChat: () => setChatMessages([])
  }
}
