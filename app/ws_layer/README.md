# WebSocket Layer Documentation

## Overview

The Python WebSocket layer provides real-time communication capabilities for the metaverse application, including user invitations, space management, and real-time interactions.

## Architecture

The WebSocket layer is built with Python and integrates with the Node.js backend through:
- Shared PostgreSQL database
- REST API integration
- Real-time event broadcasting

## Setup

### 1. Install Dependencies

```bash
cd /path/to/metaverse-v1/metaverse/app/ws_layer
pip install -r requirements.txt
```

### 2. Environment Variables

Ensure your `.env` file in the parent directory contains:

```env
DB_HOST=localhost
DB_PORT=5433
DB_USER=postgres
DB_PASSWORD=your_password
DATABASE=postgres
WS_HOST=localhost
WS_PORT=5001
```

### 3. Run the WebSocket Server

```bash
python -m ws_layer.main
```

Or from the ws_layer directory:
```bash
python main.py
```

## Components

### 1. `db_pylayer.py` - Database Connection Manager
- Manages PostgreSQL connection pool using `asyncpg`
- Provides async database connections
- Handles connection lifecycle

**Key Class:**
- `DatabaseManager`: Manages connection pool and provides connections

### 2. `base.py` - Data Fetcher
- Fetches user and space data from database
- Validates user access to spaces
- Retrieves space members

**Key Class:**
- `DataFetcher`: Provides methods for database queries
  - `fetch_user_data(user_id)`: Get user information
  - `fetch_space_data(space_id)`: Get space information
  - `fetch_space_users(space_id)`: Get users in a space
  - `validate_user_space_access(user_id, space_id)`: Check access permissions
  - `get_user_spaces(user_id)`: Get all spaces for a user

### 3. `config.py` - Configuration
- WebSocket event types
- Broadcast event types
- Server configuration
- Invite settings (24-hour expiry)

**Key Configuration:**
```python
WS_EVENTS = {
    'JOIN_SPACE', 'LEAVE_SPACE', 'MOVE', 'ACTION', 'CHAT',
    'SEND_INVITE', 'ACCEPT_INVITE', 'DECLINE_INVITE', 
    'GET_USERS', 'GET_INVITES'
}

INVITE_EXPIRY_HOURS = 24
```

### 4. `invite.py` - Invite Management
- Handles space invitation logic
- Manages invite lifecycle (send, accept, decline)
- Validates invitations and space capacity

**Key Class:**
- `InviteManager`: Manages all invite operations
  - `send_invite(from_user_id, to_user_id, space_id)`: Send an invite
  - `accept_invite(user_id, notification_id)`: Accept an invite
  - `decline_invite(user_id, notification_id)`: Decline an invite
  - `get_user_invites(user_id)`: Get user's invites
  - `get_all_users(user_id, space_id)`: Get invitable users

### 5. `handlers.py` - Message Handlers
- Routes WebSocket messages to appropriate handlers
- Processes different event types
- Returns responses to clients

**Key Class:**
- `MessageHandler`: Handles all message types
  - `handle_join_space()`: User joins a space
  - `handle_leave_space()`: User leaves a space
  - `handle_send_invite()`: Send invite to user
  - `handle_accept_invite()`: Accept invite
  - `handle_decline_invite()`: Decline invite
  - `handle_get_users()`: Get list of users
  - And more...

### 6. `manager.py` - WebSocket Manager
- Manages WebSocket connections
- Handles client connections and disconnections
- Broadcasts messages to space members

**Key Class:**
- `WSManager`: Main WebSocket server manager
  - Tracks active connections
  - Maps users to spaces
  - Broadcasts events to relevant users

### 7. `main.py` - Server Entry Point
- Initializes WebSocket server
- Manages server lifecycle
- Handles graceful shutdown

## WebSocket Event Protocol

### Client to Server Events

#### 1. SEND_INVITE
Send an invitation to a user for a space.

```json
{
  "type": "SEND_INVITE",
  "payload": {
    "toUserId": "user-uuid",
    "spaceId": "space-uuid"
  }
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Invite sent successfully",
  "data": {
    "invite": {
      "id": "notification-uuid",
      "toUser": { "id": "...", "username": "..." },
      "fromUser": { "id": "...", "username": "..." },
      "space": { "id": "...", "name": "..." },
      "expiresAt": "2024-01-02T00:00:00Z"
    }
  }
}
```

#### 2. ACCEPT_INVITE
Accept a space invitation.

```json
{
  "type": "ACCEPT_INVITE",
  "payload": {
    "notificationId": "notification-uuid"
  }
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Invite accepted successfully",
  "data": {
    "space": {
      "id": "space-uuid",
      "name": "Space Name"
    }
  }
}
```

#### 3. DECLINE_INVITE
Decline a space invitation.

```json
{
  "type": "DECLINE_INVITE",
  "payload": {
    "notificationId": "notification-uuid"
  }
}
```

#### 4. GET_USERS
Get list of users that can be invited to a space.

```json
{
  "type": "GET_USERS",
  "payload": {
    "spaceId": "space-uuid"
  }
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "users": [
      {
        "id": "user-uuid",
        "username": "john_doe",
        "email": "john@example.com",
        "role": "participant",
        "avatarUrl": "..."
      }
    ],
    "count": 1
  }
}
```

#### 5. JOIN_SPACE
Join a space for real-time interaction.

```json
{
  "type": "JOIN_SPACE",
  "payload": {
    "userId": "user-uuid",
    "spaceId": "space-uuid",
    "initialPosition": {
      "x": 100,
      "y": 200,
      "direction": "down"
    }
  }
}
```

### Server to Client Broadcasts

#### USER_JOINED
Broadcast when a user joins a space.

```json
{
  "type": "USER_JOINED",
  "spaceId": "space-uuid",
  "userId": "user-uuid",
  "username": "john_doe",
  "position": { "x": 100, "y": 200, "direction": "down" }
}
```

#### INVITE_RECEIVED
Broadcast to a specific user when they receive an invite.

```json
{
  "type": "INVITE_RECEIVED",
  "invite": {
    "id": "notification-uuid",
    "fromUser": { "id": "...", "username": "..." },
    "space": { "id": "...", "name": "..." },
    "expiresAt": "2024-01-02T00:00:00Z"
  }
}
```

## Node.js Backend Integration

### REST API Endpoints

The Node.js backend provides REST endpoints for invite functionality:

#### POST `/metaverse/invites/send`
Send an invitation to a user for a space.

**Body:**
```json
{
  "toUserId": "user-uuid",
  "spaceId": "space-uuid"
}
```

#### POST `/metaverse/invites/:notificationId/accept`
Accept a space invitation.

#### POST `/metaverse/invites/:notificationId/decline`
Decline a space invitation.

#### GET `/metaverse/invites/users/:spaceId`
Get users that can be invited to a space.

#### GET `/metaverse/invites/my-invites`
Get current user's invites.

**Query Params:**
- `includeExpired` (boolean): Include expired invites

### Database Schema

#### Notifications Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type VARCHAR(50), -- 'invites' or 'updates'
  title VARCHAR(255),
  message TEXT,
  data JSONB, -- Contains spaceId, fromUserId, etc.
  status VARCHAR(50), -- 'unread', 'read', 'dismissed'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);
```

## Frontend Integration

### Components

#### InviteModal
Modal component for inviting users to a space.

**Usage:**
```tsx
<InviteModal
  isOpen={isOpen}
  onClose={handleClose}
  spaceId="space-uuid"
  spaceName="My Space"
/>
```

#### Dashboard Integration
The invite button appears on each space card:
- Visible to space admins
- Visible to members if space is not full
- Opens the InviteModal when clicked

### API Client

```typescript
import { inviteAPI } from '@/lib/api';

// Send invite
await inviteAPI.sendInvite(toUserId, spaceId);

// Accept invite
await inviteAPI.acceptInvite(notificationId);

// Get invitable users
const users = await inviteAPI.getInvitableUsers(spaceId);

// Get my invites
const invites = await inviteAPI.getMyInvites();
```

## Features

### 1. User Invitation System
- Users can invite others to join their spaces
- Invitations expire after 24 hours
- Only non-members can be invited
- Space capacity is enforced

### 2. Real-time Notifications
- Instant notification when receiving an invite
- Real-time updates on invite status
- WebSocket broadcast for live updates

### 3. Access Control
- Only space admins and members can send invites
- Users must have space access to invite others
- Validation of space capacity before accepting

### 4. User Discovery
- List all users in the system
- Filter users already in the space
- Search functionality in the frontend

## Error Handling

### Common Errors

1. **Space Not Found**
   - Status: `failed`
   - Error: `Space not found`

2. **User Already Member**
   - Status: `failed`
   - Error: `User is already a member of this space`

3. **Space Full**
   - Status: `failed`
   - Error: `Space is full`

4. **Invite Expired**
   - Status: `failed`
   - Error: `Invite has expired`

5. **No Access**
   - Status: `failed`
   - Error: `You do not have access to this space`

## Testing

### Test WebSocket Connection

```python
import asyncio
import websockets
import json

async def test_invite():
    uri = "ws://localhost:5001"
    async with websockets.connect(uri) as websocket:
        # Send invite
        message = {
            "type": "SEND_INVITE",
            "payload": {
                "toUserId": "user-uuid",
                "spaceId": "space-uuid"
            }
        }
        await websocket.send(json.dumps(message))
        
        # Receive response
        response = await websocket.recv()
        print(f"Response: {response}")

asyncio.run(test_invite())
```

### Test REST API

```bash
# Send invite
curl -X POST http://localhost:3000/metaverse/invites/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"toUserId": "user-uuid", "spaceId": "space-uuid"}'

# Get invitable users
curl -X GET http://localhost:3000/metaverse/invites/users/space-uuid \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Deployment

### Production Considerations

1. **Environment Variables**
   - Use secure credentials in production
   - Configure proper database connection settings
   - Set appropriate WS_PORT

2. **Scaling**
   - Use a load balancer for multiple WS instances
   - Implement Redis for cross-instance broadcasting
   - Monitor connection counts and performance

3. **Security**
   - Implement rate limiting for invite actions
   - Validate all user inputs
   - Use SSL/TLS for WebSocket connections (wss://)

4. **Monitoring**
   - Log all invite actions
   - Track WebSocket connection metrics
   - Monitor database query performance

## Troubleshooting

### WebSocket Server Won't Start
- Check if port 5001 is already in use
- Verify database connection settings
- Check Python dependencies are installed

### Invites Not Being Sent
- Verify user has access to the space
- Check space is not full
- Ensure notification table exists in database

### Frontend Not Connecting
- Check WebSocket URL in frontend config
- Verify CORS settings
- Check network connectivity

## Future Enhancements

1. **Bulk Invites**: Invite multiple users at once
2. **Invite Templates**: Pre-defined invite messages
3. **Invite History**: Track all sent/received invites
4. **Invite Reminders**: Notify users of pending invites
5. **Custom Expiry**: Allow custom expiration times

## Support

For issues or questions:
1. Check the logs in `ws_server.log`
2. Review database queries in the logger output
3. Test WebSocket connection independently
4. Verify Node.js backend is running

## License

This project is part of the metaverse application.

