// Comprehensive TypeScript types for all API responses and requests

// Base API Response
export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  error?: string
  data?: T
}

// User Types
export interface User {
  id: string
  username: string
  email: string
  role: 'admin' | 'participant'
  designation?: string
  avatarUrl?: string
  about?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  spaceCount: number
  unreadNotifications: number
}

export interface UserSafeObject {
  id: string
  username: string
  email: string
  role: string
  designation?: string
  avatarUrl?: string
  about?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Space Types
export interface Space {
  id: string
  name: string
  description?: string
  mapImageUrl?: string
  adminUserId: string
  isPublic: boolean
  maxUsers: number
  currentUsers: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  objects: SpaceObject[]
}

export interface SpaceObject {
  id: string
  type: string
  position: { x: number, y: number }
  properties?: Record<string, any>
}

export interface SpaceSafeObject extends Omit<Space, 'objects'> {
  objects: SpaceObject[]
}

// Notification Types
export interface Notification {
  id: string
  userId: string
  type: 'updates' | 'invites'
  title: string
  message: string
  data?: any
  status: 'unread' | 'read' | 'dismissed'
  isActive: boolean
  createdAt: string
  updatedAt: string
  expiresAt?: string
  isExpired: boolean
}

// Authentication Types
export interface LoginRequest {
  email: string
  password: string
  user_level: 'admin' | 'participant'
}

export interface LoginResponse {
  success: boolean
  message: string
  token?: string
  user?: UserSafeObject
}

export interface SignupRequest {
  user_name: string
  email: string
  password: string
  user_level?: 'participant'
}

export interface SignupResponse {
  success: boolean
  message: string
  user?: UserSafeObject
  token?: string
}

// Space Management Types
export interface CreateSpaceRequest {
  name: string
  description?: string
  isPublic?: boolean
  maxUsers?: number
  mapType?: string
}

export interface CreateSpaceResponse {
  success: boolean
  message: string
  space?: SpaceSafeObject
}

export interface UpdateSpaceRequest {
  name?: string
  description?: string
  isPublic?: boolean
  maxUsers?: number
  mapType?: string
}

export interface SpaceListResponse {
  success: boolean
  spaces: SpaceSafeObject[]
  pagination: {
    limit: number
    offset: number
    total: number
  }
}

export interface MySpacesResponse {
  success: boolean
  spaces: SpaceSafeObject[]
  total: number
}

export interface SpaceDetailsResponse {
  success: boolean
  space: SpaceSafeObject
  users?: Array<{
    id: string
    username: string
    isAdmin: boolean
    joinedAt: string | null
  }>
}

export interface JoinSpaceResponse {
  success: boolean
  message: string
  space?: SpaceSafeObject
  user?: UserSafeObject
}

// Dashboard Types
export interface DashboardResponse {
  message: string
  user_notifications: Notification[]
  user_spaces: SpaceSafeObject[]
}

// User Status Types
export interface UserStatus {
  user_id: string
  username: string
  email: string
  role: string
  is_active: boolean
  is_admin: boolean
  account_status: string
  spaces: {
    total_count: number
    active_count: number
    admin_spaces_count: number
  }
  notifications: {
    unread_count: number
    total_count: number
    active_count: number
  }
  account: {
    created_at: string
    updated_at: string
    avatar_url: string
    designation?: string
    about?: string
  }
  session: {
    last_activity: string
    is_authenticated: boolean
  }
}

export interface UserStatusResponse {
  success: boolean
  status: UserStatus
  retrieved_at: string
}

// Internal API Types
export interface UserSpacesResponse {
  success: boolean
  user_id: string
  spaces: SpaceSafeObject[]
  total_count: number
  active_count: number
}

export interface UserNotificationsResponse {
  success: boolean
  user_id: string
  notifications: Notification[]
  pagination: {
    total_count: number
    returned_count: number
    limit: number
    offset: number
    has_more: boolean
  }
  summary: {
    unread_count: number
    total_active: number
  }
}

export interface SystemStatsResponse {
  success: boolean
  statistics: {
    users: {
      total: number
      active: number
      admins: number
      participants: number
    }
    spaces: {
      total: number
      active: number
      public: number
      private: number
    }
    notifications: {
      total_unread: number
      total_notifications: number
    }
    system: {
      generated_at: string
      uptime: number
      memory_usage: any
    }
  }
}

// Protected API Types
export interface ProfileResponse {
  message: string
  user: {
    id: string
    email: string
    username: string
    role: string
  }
}

export interface GameStatusResponse {
  message: string
  game_status: string
  user_role: string
  online_players: number
}

export interface AdminUsersResponse {
  success: boolean
  users: UserSafeObject[]
}

// Health Check Types
export interface HealthCheckResponse {
  success: boolean
  message: string
  timestamp: string
  uptime: number
}

// WebSocket Types
export interface WebSocketMessage {
  type: string
  payload: any
}

export interface WebSocketResponse {
  status: 'success' | 'failed'
  message?: string
  error?: string
  data?: any
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

export interface LeaveSpacePayload {
  spaceId: string
  userId: string
}

export interface MovePayload {
  spaceId: string
  userId: string
  position: {
    x: number
    y: number
    direction: string
  }
}

export interface ChatPayload {
  spaceId: string
  userId: string
  message: string
}

export interface ActionPayload {
  spaceId: string
  userId: string
  action: string
  target?: any
}

// Broadcast Event Types
export interface UserJoinedEvent {
  type: 'USER_JOINED'
  spaceId: string
  userId: string
  username: string
  position: {
    x: number
    y: number
    direction: string
  }
}

export interface UserLeftEvent {
  type: 'USER_LEFT'
  spaceId: string
  userId: string
  username: string
}

export interface UserMovedEvent {
  type: 'USER_MOVED'
  spaceId: string
  userId: string
  position: {
    x: number
    y: number
    direction: string
  }
}

export interface ChatMessageEvent {
  type: 'CHAT_MESSAGE'
  id: string
  spaceId: string
  userId: string
  username: string
  message: string
  timestamp: string
}

// Error Types
export interface ApiError {
  message: string
  status?: number
  code?: string
  details?: any
}

// Pagination Types
export interface PaginationParams {
  limit?: number
  offset?: number
}

export interface PaginationResponse {
  limit: number
  offset: number
  total: number
  has_more?: boolean
}

// Query Options Types
export interface SpaceQueryOptions extends PaginationParams {
  isPublic?: boolean
  search?: string
  adminUserId?: string
}

export interface NotificationQueryOptions extends PaginationParams {
  type?: 'updates' | 'invites'
  status?: 'unread' | 'read' | 'dismissed'
  includeExpired?: boolean
}

// Form Validation Types
export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

// Avatar Types
export interface AvatarUpdateRequest {
  avatarUrl: string
}

export interface AvatarUpdateResponse {
  success: boolean
  message: string
  user?: UserSafeObject
}
