# Frontend API Integration Guide

This document explains how the frontend is wired up with the backend API routes.

## 🔗 API Integration Overview

### Base Configuration
- **API Base URL**: `http://localhost:3000` (configurable via `NEXT_PUBLIC_API_URL`)
- **Authentication**: JWT tokens stored in `localStorage` as `metaverse_token`
- **Request Interceptor**: Automatically adds `Authorization: Bearer <token>` header
- **Response Interceptor**: Handles 401 errors by clearing auth data and redirecting

## 📁 File Structure

```
src/
├── lib/
│   └── api.ts              # Main API client and endpoint definitions
├── hooks/
│   └── useApi.ts           # React hooks for API calls
├── contexts/
│   └── AuthContext.tsx     # Authentication context with API integration
└── components/
    ├── DashboardContent.tsx    # Uses spaces and notifications APIs
    ├── NotificationDropdown.tsx # Real-time notifications
    ├── AdminDashboard.tsx      # System stats for admins
    └── DashboardHeader.tsx     # Header with notifications
```

## 🔌 API Endpoints Integration

### Authentication APIs (`authAPI`)
```typescript
// Login
POST /metaverse/v1/login
Body: { email, password, user_level }
Response: { message, user_level, user, token }

// Signup  
POST /metaverse/v1/signup
Body: { user_name, email, password }
Response: { message, user, token }

// Logout
POST /metaverse/v1/logout
Headers: Authorization: Bearer <token>
Response: { message, user_id, logged_out_at }
```

**Used in**: `AuthContext.tsx` - login, signup, logout functions

### Dashboard APIs (`dashboardAPI`)
```typescript
// Get Dashboard Data
GET /metaverse/dashboard
Headers: Authorization: Bearer <token>
Response: { message, user_notifications, user_spaces }
```

**Used in**: `DashboardContent.tsx` - displays user spaces and notifications

### Internal APIs (`internalAPI`)
```typescript
// Get User Spaces
GET /int/api/users/:userId/spaces?includeInactive=false
Response: { success, user_id, spaces[], total_count, active_count }

// Get User Notifications  
GET /int/api/users/:userId/notifications?type&status&limit&offset
Response: { success, notifications[], pagination, summary }

// Get User Status
GET /int/api/users/:userId/status
Response: { success, status: UserStatus }

// Get Space Details
GET /int/api/spaces/:spaceId?includeUsers=false
Response: { success, space, users?, retrieved_at }

// Get System Stats (Admin Only)
GET /int/api/stats
Response: { success, statistics }

// Health Check
GET /int/api/health
Response: { success, message, timestamp, uptime }
```

**Used in**: 
- `useApi.ts` hooks - `useUserSpaces`, `useUserNotifications`, etc.
- `DashboardContent.tsx` - space management
- `NotificationDropdown.tsx` - notification management  
- `AdminDashboard.tsx` - system statistics

### User Management APIs (`userAPI`)
```typescript
// Update Avatar
PATCH /metaverse/users/:userId/avatar
Body: { avatarUrl }
Response: { success, message, user }
```

**Used in**: `AuthContext.tsx` - updateUserAvatar function

### Protected APIs (`protectedAPI`)
```typescript
// Get Profile
GET /metaverse/protected/profile
Response: { message, user }

// Get Game Status
GET /metaverse/protected/game/status  
Response: { message, game_status, user_role, online_players }

// Get Admin Users (Admin Only)
GET /metaverse/protected/admin/users
Response: { message, note, admin }
```

**Used in**: Available via hooks but not currently implemented in UI

## 🎣 React Hooks

### Custom API Hooks (`useApi.ts`)

```typescript
// Generic API hook
useApiCall<T>(apiCall, dependencies) 
// Returns: { data, loading, error, refetch }

// Specific hooks
useUserSpaces(userId, includeInactive)
useUserNotifications(userId, options)  
useUserStatus(userId)
useSpaceDetails(spaceId, includeUsers)
useDashboard()
useSystemStats() // Admin only
useProfile()
useGameStatus()
useHealthCheck()

// Management hooks with actions
useNotificationManager(userId)
// Returns: { notifications, summary, markAsRead, markAllAsRead, ... }

useSpaceManager(userId)  
// Returns: { spaces, createSpace, joinSpace, leaveSpace, ... }
```

### Usage Examples

```typescript
// In a component
const { user } = useAuth();
const { data: spaces, loading, error } = useUserSpaces(user?.id || "");
const { notifications, markAsRead } = useNotificationManager(user?.id || "");
```

## 🔐 Authentication Flow

1. **Login/Signup**: User credentials → API → JWT token stored in localStorage
2. **Token Storage**: `metaverse_token` and `metaverse_user` in localStorage
3. **Request Interceptor**: Automatically adds token to all API requests
4. **Token Validation**: Backend validates and checks blacklist
5. **Logout**: API call to blacklist token + clear localStorage

## 🎨 UI Components Integration

### DashboardContent.tsx
- **Fetches**: User spaces and notifications via hooks
- **Displays**: Space cards with real-time data
- **Features**: Search, filtering, tab switching
- **Actions**: Enter space, manage spaces (admin)

### NotificationDropdown.tsx  
- **Fetches**: User notifications with real-time updates
- **Displays**: Notification bell with unread count
- **Features**: Mark as read, mark all read, notification actions
- **UI**: Dropdown with notification list and actions

### AdminDashboard.tsx
- **Fetches**: System statistics and health status
- **Displays**: User stats, space stats, notification stats, system info
- **Features**: Real-time system monitoring
- **Access**: Admin users only

### DashboardHeader.tsx
- **Integrates**: NotificationDropdown component
- **Features**: User avatar, logout, create space button
- **Responsive**: Mobile-friendly navigation

## 🔄 Real-time Updates

### Automatic Refetching
- Hooks automatically refetch data on mount
- Manual refetch available via `refetch()` function
- Error handling with retry functionality

### State Management
- React hooks for local state
- AuthContext for global auth state
- localStorage for persistence

## 🛠️ Development Setup

1. **Environment Variables**:
   ```bash
   # Create .env.local
   NEXT_PUBLIC_API_URL=http://localhost:3000
   NEXT_PUBLIC_WS_URL=ws://localhost:3000
   ```

2. **Start Backend**: Ensure backend is running on port 3000
3. **Start Frontend**: `npm run dev` (runs on port 8002)

## 🔍 Error Handling

### API Error Responses
- **401 Unauthorized**: Auto-logout and redirect to login
- **403 Forbidden**: Show permission error
- **404 Not Found**: Show not found message
- **500 Server Error**: Show generic error message

### Loading States
- Skeleton loaders for data fetching
- Spinner components for actions
- Error boundaries for component errors

## 📱 Responsive Design

- Mobile-first approach
- Responsive navigation
- Touch-friendly interactions
- Optimized for all screen sizes

## 🚀 Performance Optimizations

- **React.memo** for component optimization
- **useMemo** for expensive calculations  
- **useCallback** for function memoization
- **Lazy loading** for images and components
- **Pagination** for large data sets

## 🔮 Future Enhancements

- **WebSocket Integration**: Real-time notifications and space updates
- **Offline Support**: Service worker and caching
- **Push Notifications**: Browser notifications for important events
- **Advanced Filtering**: More sophisticated search and filtering
- **Bulk Actions**: Multi-select and bulk operations

## 📝 API Response Types

All API responses follow consistent patterns:

```typescript
// Success Response
{
  success: true,
  data: T,
  message?: string
}

// Error Response  
{
  success: false,
  message: string,
  errors?: string[]
}
```

This integration provides a complete, type-safe, and user-friendly interface between the React frontend and Node.js backend!
