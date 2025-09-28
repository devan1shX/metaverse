# JWT Authentication Implementation

This document explains the JWT (JSON Web Token) authentication system implemented in the Metaverse backend.

## Overview

JWT tokens are used to authenticate users and protect API endpoints. When a user logs in or signs up, they receive a JWT token that must be included in subsequent requests to protected routes.

## Environment Variables

Create a `.env` file in the `app/` directory with the following variables:

```env
# Database Configuration
DATABASE=postgres

# Admin Credentials
ADMIN_EMAIL=admin@metaverse.com
ADMIN_PASSWORD=admin123

# JWT Secret Key (use a strong, random string in production)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Environment
NODE_ENV=development
```

## API Endpoints

### Public Endpoints (No Authentication Required)

#### 1. User Signup
- **URL**: `POST /metaverse/v1/signup`
- **Body**:
```json
{
  "user_name": "john_doe",
  "email": "john@example.com",
  "password": "password123"
}
```
- **Response**:
```json
{
  "message": "User created successfully",
  "user": {
    "id": "uuid",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "participant"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 2. User Login
- **URL**: `POST /metaverse/v1/login`
- **Body**:
```json
{
  "user_level": "participant",
  "email": "john@example.com",
  "password": "password123"
}
```
- **Response**:
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "participant"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 3. Admin Login
- **URL**: `POST /metaverse/v1/login`
- **Body**:
```json
{
  "user_level": "admin",
  "email": "admin@metaverse.com",
  "password": "admin123"
}
```

### Authentication Required Endpoints

For all protected endpoints, include the JWT token in the Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 4. User Logout
- **URL**: `POST /metaverse/v1/logout`
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
```json
{
  "message": "Logout successful",
  "note": "Please delete the JWT token from client storage"
}
```

#### 5. Get User Profile
- **URL**: `GET /metaverse/v1/protected/profile`
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
```json
{
  "message": "Profile data retrieved successfully",
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "username": "john_doe",
    "role": "participant"
  }
}
```

#### 6. Admin Only - Get Users List
- **URL**: `GET /metaverse/v1/protected/admin/users`
- **Headers**: `Authorization: Bearer <admin_token>`
- **Response**:
```json
{
  "message": "Users list retrieved successfully",
  "note": "This is an admin-only endpoint",
  "admin": "admin"
}
```

#### 7. Game Status (Participant/Admin)
- **URL**: `GET /metaverse/v1/protected/game/status`
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
```json
{
  "message": "Game status retrieved successfully",
  "game_status": "active",
  "user_role": "participant",
  "online_players": 42
}
```

## JWT Token Structure

The JWT token contains the following payload:

```json
{
  "user_id": "uuid or 'admin'",
  "email": "user@example.com",
  "username": "username",
  "role": "participant or admin",
  "iat": 1234567890,
  "exp": 1234567890
}
```

## Middleware Functions

### 1. `authenticateToken`
- Verifies JWT token validity
- Adds user information to `req.user`
- Returns 401 if token is missing or invalid

### 2. `requireAdmin`
- Must be used after `authenticateToken`
- Ensures user has admin role
- Returns 403 if user is not admin

### 3. `requireParticipant`
- Must be used after `authenticateToken`
- Ensures user has participant or admin role
- Returns 403 if user doesn't have required role

## Usage Examples

### Frontend JavaScript Example

```javascript
// Store token after login/signup
localStorage.setItem('token', response.data.token);

// Make authenticated requests
const token = localStorage.getItem('token');
const response = await fetch('/metaverse/v1/protected/profile', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Handle token expiration
if (response.status === 401) {
  // Token expired or invalid - redirect to login
  localStorage.removeItem('token');
  window.location.href = '/login';
}
```

### cURL Examples

```bash
# Signup
curl -X POST http://localhost:3000/metaverse/v1/signup \
  -H "Content-Type: application/json" \
  -d '{"user_name":"john_doe","email":"john@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/metaverse/v1/login \
  -H "Content-Type: application/json" \
  -d '{"user_level":"participant","email":"john@example.com","password":"password123"}'

# Access protected route
curl -X GET http://localhost:3000/metaverse/v1/protected/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"

# Logout
curl -X POST http://localhost:3000/metaverse/v1/logout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

## Security Considerations

1. **JWT Secret**: Use a strong, random secret key in production
2. **Token Expiration**: Tokens expire in 24 hours by default
3. **HTTPS**: Always use HTTPS in production
4. **Token Storage**: Store tokens securely on the client side
5. **Token Revocation**: Consider implementing a token blacklist for logout

## Error Responses

### 401 Unauthorized
```json
{
  "message": "Access denied. No token provided."
}
```

### 401 Token Expired
```json
{
  "message": "Token expired. Please login again."
}
```

### 403 Forbidden
```json
{
  "message": "Admin access required."
}
```

## Testing the Implementation

1. Start the backend server: `npm start`
2. Test signup: Create a new user account
3. Test login: Login with the created account
4. Test protected routes: Use the received token to access protected endpoints
5. Test admin routes: Login as admin and access admin-only endpoints
6. Test logout: Logout and verify token handling

The JWT authentication system is now fully integrated and ready for use in your Metaverse application!
