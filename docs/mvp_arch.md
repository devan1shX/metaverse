# Gather.town Clone - MVP Design & Architecture

## 1. Product Overview

### Core Concept
A virtual office/social space platform where users can move avatars in a 2D environment, interact through proximity-based video/audio chat, and collaborate in shared spaces.

### Key Value Propositions
- Spatial audio/video communication
- Customizable virtual environments
- Screen sharing and collaboration tools
- Persistent virtual spaces
- Real-time multiplayer interaction

## 2. MVP Feature Set

### Core Features (Must-Have)
1. **Avatar Movement & Navigation**
   - 2D top-down character movement
   - Real-time position synchronization
   - Basic collision detection

2. **Proximity-Based Communication**
   - Auto-enable audio/video when users are close
   - Spatial audio (volume based on distance)
   - Mute/unmute controls

3. **Room/Space Management**
   - Create and join virtual rooms
   - Basic room templates (office, meeting room, social space)
   - Room persistence

4. **User Management**
   - User registration/authentication
   - Avatar customization (basic)
   - User presence status

### Secondary Features (Nice-to-Have)
1. **Screen Sharing**
   - Share screen in designated areas
   - Basic presentation mode

2. **Text Chat**
   - Proximity-based text chat
   - Global room chat

3. **Interactive Objects**
   - Whiteboards
   - Presentation screens
   - Meeting tables

### Future Features (Post-MVP)
- Advanced avatar customization
- Custom room building tools
- Games and mini-apps
- Mobile app
- Advanced admin controls

## 3. System Architecture

### High-Level Architecture

```

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (React/Vue)   │◄──►│   (Node.js)     │◄──►│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WebRTC        │    │   Socket.io     │    │   Redis Cache   │
│   (P2P A/V)     │    │   (Real-time)   │    │   (Sessions)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack

#### Frontend
- **Framework**: React.js with TypeScript
- **Game Engine**: Phaser.js or PixiJS for 2D rendering
- **WebRTC**: Simple-peer or native WebRTC for video/audio
- **State Management**: Redux Toolkit or Zustand
- **Styling**: Tailwind CSS
- **Build Tool**: Vite

#### Backend
- **Runtime**: Node.js with Express.js
- **Real-time**: Socket.io for websockets
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis for sessions and real-time data
- **Authentication**: JWT with bcrypt
- **Media Server**: Mediasoup for advanced WebRTC handling (optional)

#### Infrastructure
- **Hosting**: AWS/GCP/Azure
- **CDN**: CloudFlare for static assets
- **Container**: Docker
- **Orchestration**: Kubernetes (for scaling)
- **Monitoring**: DataDog or New Relic

## 4. Database Schema

### Core Tables

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_config JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Rooms table
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES users(id),
    max_capacity INTEGER DEFAULT 50,
    room_config JSONB, -- map layout, objects, etc.
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User sessions in rooms
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    room_id UUID REFERENCES rooms(id),
    position_x FLOAT DEFAULT 0,
    position_y FLOAT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMP DEFAULT NOW(),
    last_active TIMESTAMP DEFAULT NOW()
);

-- Room objects (whiteboards, screens, etc.)
CREATE TABLE room_objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id),
    object_type VARCHAR(50) NOT NULL, -- 'whiteboard', 'screen', 'table'
    position_x FLOAT NOT NULL,
    position_y FLOAT NOT NULL,
    width FLOAT NOT NULL,
    height FLOAT NOT NULL,
    config JSONB, -- object-specific configuration
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 5. Real-time Communication Architecture

### WebSocket Events

```javascript
// Client to Server
{
  'user:move': { x: number, y: number, roomId: string },
  'user:join-room': { roomId: string },
  'user:leave-room': { roomId: string },
  'audio:toggle': { enabled: boolean },
  'video:toggle': { enabled: boolean },
  'chat:message': { message: string, roomId: string }
}

// Server to Client
{
  'room:user-moved': { userId: string, x: number, y: number },
  'room:user-joined': { user: UserData },
  'room:user-left': { userId: string },
  'room:users-update': { users: UserData[] },
  'chat:new-message': { userId: string, message: string, timestamp: Date }
}
```

### WebRTC Architecture

```
User A ←→ Signaling Server ←→ User B
  │                           │
  └─── Direct P2P Connection ──┘
       (Audio/Video Stream)
```

For MVP, use peer-to-peer connections. For scaling beyond 4-6 users per room, implement SFU (Selective Forwarding Unit) using Mediasoup.

## 6. Component Architecture (Frontend)

### Core Components

```
App
├── AuthProvider
├── SocketProvider
├── WebRTCProvider
└── Router
    ├── LoginPage
    ├── RoomListPage
    └── GameRoom
        ├── GameCanvas (Phaser/Pixi)
        ├── VideoOverlay
        │   ├── LocalVideo
        │   └── RemoteVideos[]
        ├── UI
        │   ├── ChatPanel
        │   ├── UserList
        │   ├── Controls
        │   └── SettingsModal
        └── ObjectInteractions
```

## 7. API Design

### REST Endpoints

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/rooms
POST   /api/rooms
GET    /api/rooms/:id
PUT    /api/rooms/:id
DELETE /api/rooms/:id

GET    /api/rooms/:id/users
POST   /api/rooms/:id/join
POST   /api/rooms/:id/leave

GET    /api/users/:id
PUT    /api/users/:id
```

### WebSocket Namespaces

```
/rooms/:roomId - Room-specific events
/global - System-wide events
```

## 8. Deployment Architecture

### Development Environment
```
docker-compose.yml:
- Frontend (React dev server)
- Backend (Node.js with nodemon)
- PostgreSQL
- Redis
- Nginx (reverse proxy)
```

### Production Environment
```
Kubernetes Cluster:
- Frontend Pods (Nginx serving built React)
- Backend Pods (Node.js app)
- PostgreSQL (managed service)
- Redis (managed service)
- Load Balancer
- SSL/TLS termination
```

## 9. Performance Considerations

### Optimization Strategies
1. **Frontend**
   - Sprite atlasing for avatars and objects
   - Object pooling for game entities
   - Throttle position updates (30-60 FPS)
   - Lazy load room assets

2. **Backend**
   - Rate limiting for socket events
   - Room-based event broadcasting
   - Database connection pooling
   - Redis for session management

3. **Network**
   - Use binary protocols for position updates
   - Compress WebSocket messages
   - CDN for static assets
   - Regional server deployment

## 10. Security Considerations

### Authentication & Authorization
- JWT tokens with refresh mechanism
- Room-based permissions
- Rate limiting on API endpoints
- Input validation and sanitization

### WebRTC Security
- STUN/TURN server authentication
- Encrypted media streams
- Peer connection validation

## 11. Development Timeline (8-12 weeks)

### Phase 1 (Weeks 1-3): Foundation
- Project setup and infrastructure
- User authentication system
- Basic room creation and joining
- Simple avatar movement

### Phase 2 (Weeks 4-6): Core Features
- WebSocket integration
- Real-time avatar synchronization
- Basic WebRTC video/audio
- Proximity-based communication

### Phase 3 (Weeks 7-9): Polish & Features
- Chat system
- Screen sharing
- Basic interactive objects
- UI/UX improvements

### Phase 4 (Weeks 10-12): Testing & Deployment
- Performance optimization
- Bug fixes and testing
- Production deployment
- Documentation

## 12. Success Metrics

### Technical KPIs
- < 100ms latency for movement updates
- Support 20+ concurrent users per room
- < 2s room join time
- 99.9% uptime

### User Experience KPIs
- Audio/video quality score > 4/5
- User retention > 60% after first session
- Average session duration > 15 minutes

## 13. Risk Mitigation

### Technical Risks
- **WebRTC complexity**: Start with simple peer-to-peer, plan for SFU migration
- **Scalability**: Design with horizontal scaling in mind
- **Browser compatibility**: Test across major browsers early

### Business Risks
- **User adoption**: Focus on core UX in MVP
- **Performance**: Regular load testing
- **Security**: Security audit before launch

---

This architecture provides a solid foundation for building a Gather.town clone with room for growth and scaling. The modular design allows for iterative development and feature additions post-MVP.