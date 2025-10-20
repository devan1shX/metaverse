"use client"

// Logger is imported but not used in this file currently
// import { logger } from './logger'

export interface WebSocketMessage {
  type: string
  payload: any
}

export interface JoinSpacePayload {
  spaceId: string
  userId: string
  initialPosition: {
    x: number
    y: number
    direction: string
  }
}

export interface WebSocketResponse {
  status: 'success' | 'failed'
  message?: string
  error?: string
  data?: any
}

export class MetaverseWebSocket {
  private ws: WebSocket | null = null
  private url: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private messageHandlers = new Map<string, (data: any) => void>()
  private connectionHandlers = {
    onOpen: [] as (() => void)[],
    onClose: [] as ((event: CloseEvent) => void)[],
    onError: [] as ((error: Event) => void)[]
  }

  constructor(url?: string) {
    this.url = url || process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080'
  }

  connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Add token to URL if provided
        const wsUrl = token ? `${this.url}?token=${token}` : this.url
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          console.log('WebSocket connected')
          this.reconnectAttempts = 0
          this.connectionHandlers.onOpen.forEach(handler => handler())
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketResponse = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason)
          this.connectionHandlers.onClose.forEach(handler => handler(event))
          
          // Auto-reconnect if not a normal closure
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
              this.reconnectAttempts++
              console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
              this.connect(token)
            }, this.reconnectDelay * this.reconnectAttempts)
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          this.connectionHandlers.onError.forEach(handler => handler(error))
          reject(error)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
  }

  private handleMessage(message: WebSocketResponse) {
    // Handle broadcast messages
    if (message.data?.type) {
      const handler = this.messageHandlers.get(message.data.type)
      if (handler) {
        handler(message.data)
      }
    }

    // Handle response messages
    if (message.status) {
      const handler = this.messageHandlers.get('response')
      if (handler) {
        handler(message)
      }
    }
  }

  // Send a message to the WebSocket server
  send(message: WebSocketMessage): Promise<WebSocketResponse> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket is not connected'))
        return
      }

      try {
        // Set up a one-time response handler
        const responseHandler = (response: WebSocketResponse) => {
          this.messageHandlers.delete('response')
          resolve(response)
        }
        this.messageHandlers.set('response', responseHandler)

        // Send the message
        this.ws.send(JSON.stringify(message))

        // Set timeout for response
        setTimeout(() => {
          if (this.messageHandlers.has('response')) {
            this.messageHandlers.delete('response')
            reject(new Error('WebSocket request timeout'))
          }
        }, 10000) // 10 second timeout
      } catch (error) {
        reject(error)
      }
    })
  }

  // Space-related methods
  async joinSpace(spaceId: string, userId: string, initialPosition: { x: number, y: number, direction: string }): Promise<WebSocketResponse> {
    const message: WebSocketMessage = {
      type: 'JOIN_SPACE',
      payload: {
        spaceId,
        userId,
        initialPosition
      }
    }
    return this.send(message)
  }

  async leaveSpace(spaceId: string, userId: string): Promise<WebSocketResponse> {
    const message: WebSocketMessage = {
      type: 'LEAVE_SPACE',
      payload: {
        spaceId,
        userId
      }
    }
    return this.send(message)
  }

  async movePlayer(spaceId: string, userId: string, position: { x: number, y: number, direction: string }): Promise<WebSocketResponse> {
    const message: WebSocketMessage = {
      type: 'MOVE',
      payload: {
        spaceId,
        userId,
        position
      }
    }
    return this.send(message)
  }

  async sendChatMessage(spaceId: string, userId: string, message: string): Promise<WebSocketResponse> {
    const wsMessage: WebSocketMessage = {
      type: 'CHAT',
      payload: {
        spaceId,
        userId,
        message
      }
    }
    return this.send(wsMessage)
  }

  async performAction(spaceId: string, userId: string, action: string, target?: any): Promise<WebSocketResponse> {
    const message: WebSocketMessage = {
      type: 'ACTION',
      payload: {
        spaceId,
        userId,
        action,
        target
      }
    }
    return this.send(message)
  }

  // Event handlers
  onMessage(type: string, handler: (data: any) => void) {
    this.messageHandlers.set(type, handler)
  }

  offMessage(type: string) {
    this.messageHandlers.delete(type)
  }

  onConnect(handler: () => void) {
    this.connectionHandlers.onOpen.push(handler)
  }

  onDisconnect(handler: (event: CloseEvent) => void) {
    this.connectionHandlers.onClose.push(handler)
  }

  onError(handler: (error: Event) => void) {
    this.connectionHandlers.onError.push(handler)
  }

  // Utility methods
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  getReadyState(): number | null {
    return this.ws?.readyState || null
  }
}

// Create a singleton instance
let wsInstance: MetaverseWebSocket | null = null

export function getWebSocketInstance(): MetaverseWebSocket {
  if (!wsInstance) {
    wsInstance = new MetaverseWebSocket()
  }
  return wsInstance
}

// Export common WebSocket event types
export const WS_EVENTS = {
  JOIN_SPACE: 'JOIN_SPACE',
  LEAVE_SPACE: 'LEAVE_SPACE',
  MOVE: 'MOVE',
  ACTION: 'ACTION',
  CHAT: 'CHAT',
  AUDIO: 'AUDIO',
  VIDEO: 'VIDEO',
  USER_JOINED: 'USER_JOINED',
  USER_LEFT: 'USER_LEFT',
  USER_MOVED: 'USER_MOVED',
  CHAT_MESSAGE: 'CHAT_MESSAGE',
  ACTION_PERFORMED: 'ACTION_PERFORMED'
} as const

export type WSEventType = typeof WS_EVENTS[keyof typeof WS_EVENTS]
