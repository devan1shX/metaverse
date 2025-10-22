"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  internalAPI, 
  dashboardAPI, 
  protectedAPI, 
  spaceAPI,
  Space, 
  notificationAPI,
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
// Custom hook for managing notifications with actions
export function useNotificationManager(userId: string | undefined) {
  // Only enable the hook if userId is available
  const enabled = !!userId;

  // Use the actual API endpoint for fetching notifications
  const { data, loading, error, refetch } = useApiCall<{
    success: boolean;
    notifications: Notification[];
    totalCount: number;
    pagination: {
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }>(
    () => notificationAPI.getUserNotifications({ status: 'unread', limit: 50 }), // Fetch more initially, or adjust as needed
    [userId], // Dependency array includes userId
    enabled   // Pass the enabled flag
  );

  const [isUpdating, setIsUpdating] = useState(false);

  const updateNotificationState = (updatedNotification: Notification) => {
    // This part is tricky without a full state management solution like Zustand/Redux
    // For now, we'll just refetch after updates.
    // In a more robust setup, you'd update the local state directly.
    refetch();
  };

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!enabled || isUpdating) return;
    setIsUpdating(true);
    try {
      const response = await notificationAPI.markAsRead(notificationId);
      if (response.data.success) {
        // Optimistic update or refetch
        refetch();
      } else {
        console.error("Failed to mark notification as read:", response.data.message);
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    } finally {
      setIsUpdating(false);
    }
  }, [enabled, isUpdating, refetch]);

   const markAsUnread = useCallback(async (notificationId: string) => {
    if (!enabled || isUpdating) return;
    setIsUpdating(true);
    try {
      const response = await notificationAPI.markAsUnread(notificationId);
      if (response.data.success) {
        refetch();
      } else {
        console.error("Failed to mark notification as unread:", response.data.message);
      }
    } catch (err) {
      console.error("Error marking notification as unread:", err);
    } finally {
      setIsUpdating(false);
    }
  }, [enabled, isUpdating, refetch]);

  const dismissNotification = useCallback(async (notificationId: string) => {
    if (!enabled || isUpdating) return;
    setIsUpdating(true);
    try {
      const response = await notificationAPI.dismissNotification(notificationId);
      if (response.data.success) {
        refetch();
      } else {
        console.error("Failed to dismiss notification:", response.data.message);
      }
    } catch (err) {
      console.error("Error dismissing notification:", err);
    } finally {
      setIsUpdating(false);
    }
  }, [enabled, isUpdating, refetch]);


  // Mark All As Read - NOTE: Backend endpoint needed for this
  const markAllAsRead = useCallback(async () => {
     if (!enabled || isUpdating || !data?.notifications) return;
     const unreadIds = data.notifications
       .filter(n => n.status === 'unread')
       .map(n => n.id);

     if (unreadIds.length === 0) return;

     setIsUpdating(true);
     try {
       // Ideally, you'd have a backend endpoint like:
       // await notificationAPI.markAllAsRead();
       // For now, mark them one by one (less efficient)
       await Promise.all(unreadIds.map(id => notificationAPI.markAsRead(id)));
       refetch(); // Refetch after all updates are done
     } catch (err) {
       console.error("Error marking all notifications as read:", err);
     } finally {
       setIsUpdating(false);
     }
  }, [enabled, isUpdating, refetch, data?.notifications]);

   // Calculate summary locally until backend provides it directly in GET /notifications
   const summary = useMemo(() => {
     const notifications = data?.notifications || [];
     const unreadCount = notifications.filter(n => n.status === 'unread' && !n.isExpired).length;
     return {
       unread_count: unreadCount,
       total_active: notifications.filter(n => n.isActive && !n.isExpired).length
     };
   }, [data?.notifications]);


  return {
    notifications: data?.notifications || [],
    summary: summary, // Use locally calculated summary
    pagination: data?.pagination,
    loading: loading || isUpdating, // Combine loading states
    error,
    refetch,
    markAsRead,
    markAsUnread,
    dismissNotification,
    markAllAsRead // Add the new functions
  };
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
