# Metaverse 2D - Real-time Collaborative Virtual Spaces

A full-stack 2D metaverse platform that enables users to create, join, and interact within virtual spaces. The platform provides real-time multiplayer capabilities, text and voice/video communication, and interactive 2D environments built with modern web technologies.

## Overview

Metaverse 2D is a collaborative virtual space platform where users can:
- Create and customize virtual spaces with different maps
- Interact with other users in real-time through avatars
- Communicate via text chat (space-wide and private messaging)
- Stream audio and video using WebRTC peer-to-peer connections
- Manage spaces, users, and notifications through a comprehensive admin system

The platform is designed with a microservices architecture, separating REST API operations from real-time WebSocket communication for optimal performance and scalability.

## Features

- **2D Virtual Spaces**: Interactive tile-based maps rendered with Phaser.js game engine
- **Real-time Multiplayer**: WebSocket-based position synchronization for smooth avatar movement
- **Chat System**: Space-wide and private messaging with message persistence and delivery pipeline
- **WebRTC Media Streaming**: Direct peer-to-peer audio/video communication with signaling server
- **Authentication & Authorization**: JWT-based authentication with role-based access control (Admin/Participant)
- **Notification System**: Real-time notifications for invites, updates, and space events
- **Space Management**: Create, join, leave, and manage virtual spaces with custom configurations
- **User Profiles**: Customizable avatars, user information, and profile management
- **Interactive Objects**: Map objects like chairs that users can interact with (sit, stand)

## Architecture

### System Overview

The platform consists of three main components:

1. **REST API Server (Node.js/Express)**: Handles HTTP requests for authentication, space management, user operations, and notifications
2. **WebSocket Server (Python/FastAPI)**: Manages real-time communication, chat, position updates, and WebRTC signaling
3. **Frontend Client (Next.js/React)**: Provides the user interface with 2D game rendering using Phaser.js

### Technology Stack

**Backend (REST API)**
- Node.js with Express.js framework
- PostgreSQL for persistent data storage
- Redis for caching and token blacklisting
- JWT for authentication tokens
- Winston for structured logging

**WebSocket Layer**
- Python 3.9+ with FastAPI framework
- Async WebSocket connections using FastAPI WebSocket
- AsyncPG for asynchronous database operations
- Pydantic for data validation
- Custom message pipeline for chat persistence

**Frontend**
- Next.js 14 with React and TypeScript
- Phaser.js 3.70 for 2D game rendering
- Tailwind CSS for styling
- WebRTC API for media streaming
- Axios for HTTP requests
- Framer Motion for animations

###  Architecture Diagram

```
                    ┌─────────────────┐
                    │   Web Browser   │
                    │   (Next.js)     │
                    └────────┬────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
                │            │            │
        ┌───────▼──────┐     │     ┌──────▼──────┐
        │   Express    │     │     │  FastAPI    │
        │   Server     │     │     │  WebSocket  │
        │  (Port 3000) │     │     │  (Port 8003)│
        └───────┬──────┘     │     └──────┬──────┘
                │            │            │
                │            │            │
        ┌───────▼────────────▼────────────▼──────┐
        │         PostgreSQL Database            │
        │  (Users, Spaces, Messages, Notifications)│
        └────────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Redis Cache    │
                    │  (Optional)     │
                    └─────────────────┘
```

### Component Interaction

**REST API Flow:**
```
Client Request → Express Middleware (Auth, Validation) → Controller → Service → Repository → PostgreSQL
```

**WebSocket Flow:**
```
Client Connection → FastAPI Route → Space Broadcaster → Message Parser → Chat/Media Manager → Broadcast Loop → All Clients
```

**WebRTC Flow:**
```
User A → WebSocket (Offer) → MediaManager → User B → WebSocket (Answer) → User A → Direct P2P Connection
```

## Project Structure

```
metaverse/
├── app/                          # Backend REST API (Node.js/Express)
│   ├── config/                   # Configuration and database setup
│   │   ├── config.js            # Main configuration
│   │   ├── db_conn.js           # Database connection
│   │   ├── init_db.js           # Database initialization
│   │   └── redis_config.js      # Redis configuration
│   ├── controllers/             # Request handlers
│   │   ├── login.js             # Authentication
│   │   ├── signup.js            # User registration
│   │   ├── spaceController.js   # Space operations
│   │   ├── userController.js    # User management
│   │   └── notificationController.js
│   ├── services/                 # Business logic layer
│   │   ├── UserService.js
│   │   ├── SpaceService.js
│   │   ├── NotificationService.js
│   │   └── InviteService.js
│   ├── repositories/             # Data access layer
│   │   ├── UserRepository.js
│   │   ├── SpaceRepository.js
│   │   └── NotificationRepository.js
│   ├── models/                   # Domain models
│   │   ├── User.js
│   │   ├── Space.js
│   │   └── Notification.js
│   ├── routes/                   # API route definitions
│   │   └── rest/                # REST endpoints
│   ├── middleware/               # Express middleware
│   │   ├── auth.js              # JWT authentication
│   │   ├── authValidation.js
│   │   └── spaceValidation.js
│   ├── utils/                    # Utility functions
│   │   ├── logger.js            # Winston logger
│   │   └── database/
│   └── ws_layer/                 # WebSocket server (Python)
│       ├── main.py               # FastAPI application entry
│       ├── routes.py             # WebSocket route handlers
│       ├── space_broadcaster.py  # Space-specific broadcaster
│       ├── chat.py               # Chat message pipeline
│       ├── media.py              # WebRTC media management
│       ├── ws_manager.py         # WebSocket connection manager
│       ├── db_layer.py           # Database operations
│       └── config.py             # Configuration
│
├── frontend/                     # Frontend application (Next.js)
│   ├── src/
│   │   ├── app/                 # Next.js app router pages
│   │   │   ├── login/           # Login page
│   │   │   ├── signup/          # Signup page
│   │   │   ├── dashboard/       # User dashboard
│   │   │   ├── space/           # Space view
│   │   │   └── game/            # Game scene
│   │   ├── components/          # React components
│   │   │   ├── MetaverseGame.tsx    # Main game component
│   │   │   ├── ChatBox.tsx          # Chat interface
│   │   │   ├── Player.ts            # Player avatar
│   │   │   └── PhaserGameWrapper.tsx
│   │   ├── scenes/              # Phaser game scenes
│   │   │   └── GameScene.ts     # Main game scene
│   │   ├── hooks/               # Custom React hooks
│   │   │   ├── useSpaceWebSocket.ts
│   │   │   ├── useMediaStream.ts
│   │   │   └── useApi.ts
│   │   ├── contexts/           # React contexts
│   │   │   ├── AuthContext.tsx
│   │   │   └── SpacesContext.tsx
│   │   └── lib/                # Utilities
│   │       ├── api.ts           # API client
│   │       ├── websocket.ts     # WebSocket client
│   │       └── GameEventEmitter.ts
│   └── public/
│       ├── maps/                # Tiled map files (JSON + assets)
│       │   ├── map1/            # office-01 map
│       │   └── map2/            # office-02 map
│       ├── sprites/             # Avatar spritesheets
│       └── avatars/             # Avatar images
│
└── docs/                        # Documentation
    ├── api-design.md            # REST API documentation
    ├── ws_design.md             # WebSocket API documentation
    ├── db_design.md             # Database schema
    └── auth/
        └── JWT_AUTHENTICATION.md
```

## Prerequisites

- Node.js >= 18.x
- Python >= 3.9
- PostgreSQL >= 14
- Redis (optional, for caching and token blacklisting)
- npm or yarn package manager

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd metaverse
```

### 2. Database Setup

Start PostgreSQL database:

```bash
# Option 1: Using Docker (recommended)
cd app
docker-compose -f docker-compose.db.yml up -d

# Option 2: Use existing PostgreSQL instance
# Ensure PostgreSQL is running and accessible on port 5433
# Create a database named 'postgres' (or update config)
```

### 3. Backend Setup

```bash
cd app
npm install

# Copy environment template
cp env.example .env

# Edit .env with your configuration:
# - Database credentials (DB_USER, DB_PASSWORD, DB_HOST, DB_PORT)
# - JWT secret key
# - Admin credentials
# - Redis configuration (if using)
```

### 4. WebSocket Layer Setup

```bash
cd app/ws_layer

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Run database migrations (creates messages table, etc.)
python run_migration.py
```

### 5. Frontend Setup

```bash
cd frontend
npm install

# Copy environment template
cp env.example .env.local

# Edit .env.local:
# NEXT_PUBLIC_API_URL=http://localhost:3000
# NEXT_PUBLIC_WS_URL=ws://localhost:5001
```

## Running the Project

### Option 1: Run All Services (Recommended)

From the project root directory:

```bash
./rs.sh
```

This script starts all three services:
- Backend REST API (Express) on port 3000
- Frontend application (Next.js) on port 8002
- WebSocket server (FastAPI) on port 8003

Press Ctrl+C to stop all services.

### Option 2: Run Services Individually

**Backend REST API:**
```bash
cd app
npm run start        # Development mode with nodemon (auto-restart)
npm run reset        # Reset database (drops all tables) and start
npm run start:prod   # Production mode
```

**WebSocket Server:**
```bash
cd app/ws_layer
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8003 --reload
```

**Frontend:**
```bash
cd frontend
npm run dev          # Development server on port 8002
npm run build        # Production build
npm run start        # Production server
```

## Configuration

### Backend Environment Variables

Create `app/.env` file:

```env
NODE_ENV=development
PORT=3000

# Database Configuration
DATABASE=postgres
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5433

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Admin User
ADMIN_EMAIL=admin@metaverse.com
ADMIN_PASSWORD=admin123

# WebSocket Configuration
WS_PORT=5001

# Redis Configuration (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# CORS
CORS_ORIGIN=http://localhost:8002
```

### Frontend Environment Variables

Create `frontend/.env.local` file:

```env
# Backend REST API URL
NEXT_PUBLIC_API_URL=http://localhost:3000

# WebSocket Server URL (FastAPI)
NEXT_PUBLIC_WS_URL=ws://localhost:5001

# Debug Mode
NEXT_PUBLIC_DEBUG=false
```

### WebSocket Layer Configuration

The WebSocket server configuration is in `app/ws_layer/config.py`. Default settings:
- Host: 0.0.0.0
- Port: 5001 (configurable via WS_PORT environment variable)
- Database connection uses same credentials as backend

## API Documentation

- **REST API Design**: `docs/api-design.md`
- **WebSocket API Design**: `docs/ws_design.md`
- **JWT Authentication**: `docs/auth/JWT_AUTHENTICATION.md`
- **Database Schema**: `docs/db_design.md`

## Usage Guide

1. **User Registration**: Create a new account via the signup page
2. **Authentication**: Login with email and password to receive JWT token
3. **Dashboard**: View available spaces, create new spaces, or join existing ones
4. **Space Creation**: Create a space with custom name, description, and map selection
5. **Entering a Space**: Click on a space to enter the 2D virtual environment
6. **Movement**: Use WASD keys or arrow keys to move your avatar
7. **Chat**: Type messages in the chat box to communicate with other users in the space
8. **Media Streaming**: Enable microphone/camera to stream audio/video to other users
9. **Interactive Objects**: Stand near chairs and remain idle to sit down
10. **Notifications**: Receive real-time notifications for invites and space updates

## Development

### Database Management

**Reset Database (Drops All Tables):**
```bash
cd app
npm run reset
```

**Run Migrations:**
```bash
cd app/ws_layer
python run_migration.py
```

**Manual Database Initialization:**
```bash
cd app
node -e "require('./config/init_db').init_db(false)"
```

### Helper Scripts

- `./rs.sh` - Run all services (backend, frontend, websocket)
- `./rb.sh` - Run backend only
- `./rf.sh` - Run frontend only
- `./rw.sh` - Run websocket server only

### Development Workflow

1. Start database: `docker-compose -f app/docker-compose.db.yml up -d`
2. Start backend: `cd app && npm run start`
3. Start websocket: `cd app/ws_layer && source venv/bin/activate && uvicorn main:app --reload`
4. Start frontend: `cd frontend && npm run dev`
5. Access application: `http://localhost:8002`

## Troubleshooting

**Database Connection Errors:**
- Verify PostgreSQL is running: `pg_isready -h localhost -p 5433`
- Check database credentials in `app/.env`
- Ensure database exists and user has proper permissions
- Check firewall settings if using remote database

**WebSocket Connection Failures:**
- Verify FastAPI server is running: Check port 8003 (or 5001) is accessible
- Confirm `NEXT_PUBLIC_WS_URL` in `frontend/.env.local` matches server port
- Check browser console for WebSocket connection errors
- Verify CORS settings allow WebSocket connections

**Messages Not Persisting:**
- Ensure `messages` table exists: Run `python app/ws_layer/run_migration.py`
- Check database connection in WebSocket layer logs
- Verify message pipeline is processing correctly

**Frontend Build Errors:**
- Clear Next.js cache: `rm -rf frontend/.next`
- Reinstall dependencies: `cd frontend && rm -rf node_modules && npm install`
- Check TypeScript errors: `cd frontend && npm run type-check`

**Port Already in Use:**
- Backend (3000): `lsof -ti:3000 | xargs kill -9`
- Frontend (8002): `lsof -ti:8002 | xargs kill -9`
- WebSocket (8003/5001): `lsof -ti:8003 | xargs kill -9`

## License

ISC


---

Built with Node.js, Python, Next.js, and Phaser.js
