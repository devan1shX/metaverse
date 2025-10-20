"use client"

import { useState, useEffect, useCallback } from 'react'
import { 
  internalAPI, 
  dashboardAPI, 
  protectedAPI, 
  spaceAPI,
  Space, 
  Notification, 
  UserStatus 
} from '@/lib/api'

// Generic hook for API calls
export function useApiCall<T>(
  apiCall: () => Promise<any>,
  dependencies: any[] = [],
  enabled: boolean = true
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiCall()
      setData(response.data)
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, dependencies)

  useEffect(() => {
    if (enabled) { // 2. ADD this condition
      fetchData()
    }
  }, [fetchData, enabled])

  return { data, loading, error, refetch: fetchData }
}

// Hook for user spaces
export function useUserSpaces(userId: string, includeInactive = false) {
  return useApiCall<{ success: boolean; user_id: string; spaces: Space[]; total_count: number; active_count: number }>(
    () => internalAPI.getUserSpaces(userId, includeInactive),
    [userId, includeInactive]
  )
}

// Hook for user notifications
export function useUserNotifications(
  userId: string, 
  options: {
    type?: 'updates' | 'invites'
    status?: 'unread' | 'read' | 'dismissed'
    limit?: number
    offset?: number
    includeExpired?: boolean
  } = {}
) {
  return useApiCall<{
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
  }>(
    () => internalAPI.getUserNotifications(userId, options),
    [userId, JSON.stringify(options)]
  )
}

// Hook for user status
export function useUserStatus(userId: string) {
  return useApiCall<{ success: boolean; status: UserStatus; retrieved_at: string }>(
    () => internalAPI.getUserStatus(userId),
    [userId]
  )
}

// Hook for space details
export function useSpaceDetails(spaceId: string, includeUsers = false) {
  return useApiCall<{
    success: boolean
    space: Space
    users?: any[]
    retrieved_at: string
  }>(
    () => internalAPI.getSpaceDetails(spaceId, includeUsers),
    [spaceId, includeUsers]
  )
}

// Hook for dashboard data
export function useDashboard() {
  return useApiCall<{
    message: string
    user_notifications: Notification[]
    user_spaces: Space[]
  }>(
    () => dashboardAPI.getDashboard(),
    []
  )
}

// Hook for system stats (admin only)
export function useSystemStats() {
  return useApiCall<{
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
  }>(
    () => internalAPI.getSystemStats(),
    []
  )
}

// Hook for user profile
export function useProfile() {
  return useApiCall<{
    message: string
    user: {
      id: string
      email: string
      username: string
      role: string
    }
  }>(
    () => protectedAPI.getProfile(),
    []
  )
}

// Hook for game status
export function useGameStatus() {
  return useApiCall<{
    message: string
    game_status: string
    user_role: string
    online_players: number
  }>(
    () => protectedAPI.getGameStatus(),
    []
  )
}

// Hook for health check
export function useHealthCheck() {
  return useApiCall<{
    success: boolean
    message: string
    timestamp: string
    uptime: number
  }>(
    () => internalAPI.healthCheck(),
    []
  )
}

// Custom hook for managing notifications with actions
export function useNotificationManager(userId: string) {
  const { data, loading, error, refetch } = useUserNotifications(userId)
  
  const markAsRead = useCallback(async (notificationId: string) => {
    // This would need to be implemented in the backend
    // For now, just refetch the data
    await refetch()
  }, [refetch])

  const markAllAsRead = useCallback(async () => {
    // This would need to be implemented in the backend
    // For now, just refetch the data
    await refetch()
  }, [refetch])

  return {
    notifications: data?.notifications || [],
    summary: data?.summary,
    pagination: data?.pagination,
    loading,
    error,
    refetch,
    markAsRead,
    markAllAsRead
  }
}

// Hook for all spaces (public listing)
export function useAllSpaces(options: {
  isPublic?: boolean
  limit?: number
  offset?: number
  search?: string
  adminUserId?: string
  
} = {}, enabled: boolean) {
  return useApiCall<{
    success: boolean
    spaces: Space[]
    pagination: {
      limit: number
      offset: number
      total: number
    }
  }>(
    () => spaceAPI.getAllSpaces(options),
    [JSON.stringify(options)],
    enabled
  )
}

// Hook for my spaces
export function useMySpaces(includeInactive = false, enabled: boolean) {
  return useApiCall<{
    success: boolean
    spaces: Space[]
    total: number
  }>(
    () => spaceAPI.getMySpaces(includeInactive),
    [includeInactive],
    enabled
  )
}

// Hook for single space details
export function useSpace(spaceId: string, includeUsers = false) {
  return useApiCall<{
    success: boolean
    space: Space
    users?: Array<{
      id: string
      username: string
      isAdmin: boolean
      joinedAt: string | null
    }>
  }>(
    () => spaceAPI.getSpaceById(spaceId, includeUsers),
    [spaceId, includeUsers]
  )
}

// Custom hook for managing spaces with actions
export function useSpaceManager() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const createSpace = useCallback(async (spaceData: {
    name: string
    description?: string
    isPublic?: boolean
    maxUsers?: number
    mapType?: string
  }) => {
    try {
      setLoading(true)
      setError(null)
      const response = await spaceAPI.createSpace(spaceData)
      return response.data
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to create space'
      setError(errorMsg)
      throw new Error(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [])

  const updateSpace = useCallback(async (spaceId: string, updateData: {
    name?: string
    description?: string
    isPublic?: boolean
    maxUsers?: number
    mapType?: string
  }) => {
    try {
      setLoading(true)
      setError(null)
      const response = await spaceAPI.updateSpace(spaceId, updateData)
      return response.data
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to update space'
      setError(errorMsg)
      throw new Error(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteSpace = useCallback(async (spaceId: string) => {
    try {
      setLoading(true)
      setError(null)
      const response = await spaceAPI.deleteSpace(spaceId)
      return response.data
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to delete space'
      setError(errorMsg)
      throw new Error(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [])

  const joinSpace = useCallback(async (spaceId: string) => {
    try {
      setLoading(true)
      setError(null)
      const response = await spaceAPI.joinSpace(spaceId)
      return response.data
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to join space'
      setError(errorMsg)
      throw new Error(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [])

  const leaveSpace = useCallback(async (spaceId: string) => {
    try {
      setLoading(true)
      setError(null)
      const response = await spaceAPI.leaveSpace(spaceId)
      return response.data
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to leave space'
      setError(errorMsg)
      throw new Error(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    createSpace,
    updateSpace,
    deleteSpace,
    joinSpace,
    leaveSpace
  }
}
