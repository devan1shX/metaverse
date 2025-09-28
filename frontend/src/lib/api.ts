import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('metaverse_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('metaverse_user')
      localStorage.removeItem('metaverse_token')
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)

// Types
export interface User {
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
  spaceCount: number
  unreadNotifications: number
}

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
  objects: any[]
}

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

// Authentication APIs
export const authAPI = {
  login: (email: string, password: string, userLevel: string) =>
    api.post('/metaverse/login', { email, password, user_level: userLevel }),
  
  signup: (userName: string, email: string, password: string) =>
    api.post('/metaverse/signup', { user_name: userName, email, password }),
  
  logout: () =>
    api.post('/metaverse/logout'),
}

// Dashboard APIs
export const dashboardAPI = {
  getDashboard: () =>
    api.get('/metaverse/dashboard'),
}

// User Management APIs
export const userAPI = {
  updateAvatar: (userId: string, avatarUrl: string) =>
    api.patch(`/metaverse/users/${userId}/avatar`, { avatarUrl }),
  
  getProfile: () =>
    api.get('/metaverse/protected/profile'),
}

// Internal APIs
export const internalAPI = {
  getUserSpaces: (userId: string, includeInactive = false) =>
    api.get(`/int/api/users/${userId}/spaces`, { 
      params: { includeInactive } 
    }),
  
  getUserNotifications: (
    userId: string, 
    options: {
      type?: 'updates' | 'invites'
      status?: 'unread' | 'read' | 'dismissed'
      limit?: number
      offset?: number
      includeExpired?: boolean
    } = {}
  ) =>
    api.get(`/int/api/users/${userId}/notifications`, { params: options }),
  
  getUserStatus: (userId: string) =>
    api.get(`/int/api/users/${userId}/status`),
  
  getSpaceDetails: (spaceId: string, includeUsers = false) =>
    api.get(`/int/api/spaces/${spaceId}`, { 
      params: { includeUsers } 
    }),
  
  getSystemStats: () =>
    api.get('/int/api/stats'),
  
  healthCheck: () =>
    api.get('/int/api/health'),
}

// Space Management APIs
export const spaceAPI = {
  // Create a new space
  createSpace: (spaceData: {
    name: string
    description?: string
    isPublic?: boolean
    maxUsers?: number
    mapType?: string
  }) =>
    api.post('/metaverse/spaces', spaceData),

  // Get all spaces with filtering
  getAllSpaces: (options: {
    isPublic?: boolean
    limit?: number
    offset?: number
    search?: string
    adminUserId?: string
  } = {}) =>
    api.get('/metaverse/spaces', { params: options }),

  // Get current user's spaces
  getMySpaces: (includeInactive = false) =>
    api.get('/metaverse/spaces/my-spaces', { 
      params: { includeInactive } 
    }),

  // Get space by ID
  getSpaceById: (spaceId: string, includeUsers = false) =>
    api.get(`/metaverse/spaces/${spaceId}`, { 
      params: { includeUsers } 
    }),

  // Update space (admin only)
  updateSpace: (spaceId: string, updateData: {
    name?: string
    description?: string
    isPublic?: boolean
    maxUsers?: number
    mapType?: string
  }) =>
    api.put(`/metaverse/spaces/${spaceId}`, updateData),

  // Delete space (admin only)
  deleteSpace: (spaceId: string) =>
    api.delete(`/metaverse/spaces/${spaceId}`),

  // Join a space
  joinSpace: (spaceId: string) =>
    api.post(`/metaverse/spaces/${spaceId}/join`),

  // Leave a space
  leaveSpace: (spaceId: string) =>
    api.post(`/metaverse/spaces/${spaceId}/leave`),

  // Admin: Get all spaces including inactive
  adminGetAllSpaces: () =>
    api.get('/metaverse/spaces/admin/all'),

  // Admin: Deactivate a space
  adminDeactivateSpace: (spaceId: string) =>
    api.post(`/metaverse/spaces/${spaceId}/admin/deactivate`),

  // Health check for spaces API
  healthCheck: () =>
    api.get('/metaverse/spaces/health/check'),
}

// Protected APIs
export const protectedAPI = {
  getProfile: () =>
    api.get('/metaverse/protected/profile'),
  
  getGameStatus: () =>
    api.get('/metaverse/protected/game/status'),
  
  getAdminUsers: () =>
    api.get('/metaverse/protected/admin/users'),
}

// Legacy function for backward compatibility
export const updateAvatar = (userId: string, avatarUrl: string) => {
  return userAPI.updateAvatar(userId, avatarUrl)
}