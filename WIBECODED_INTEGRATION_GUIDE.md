# Wibecoded Solutions Integration Guide for Weam

This guide provides a comprehensive approach to integrating Wibecoded solutions into the Weam ecosystem, following the patterns established with AI-VideoGen.

## Table of Contents

1. [Overview](#overview)
2. [Architecture Patterns](#architecture-patterns)
3. [Authentication & Session Management](#authentication--session-management)
4. [Base Path Configuration](#base-path-configuration)
5. [API Integration](#api-integration)
6. [Frontend Integration](#frontend-integration)
7. [Deployment Configuration](#deployment-configuration)
8. [Security Considerations](#security-considerations)
9. [Testing Strategy](#testing-strategy)
10. [Troubleshooting](#troubleshooting)

## Overview

Wibecoded solutions should integrate seamlessly with Weam's existing infrastructure while maintaining:
- **Unified Authentication**: Shared session management across all Weam applications
- **Consistent API Patterns**: Standardized endpoints and response formats
- **Base Path Support**: Ability to host under subpaths like `/wibecoded-solution`
- **Cross-Origin Compatibility**: Proper CORS and cookie handling

## Architecture Patterns

### 1. Project Structure

```
wibecoded-solution/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # React context providers
│   │   ├── services/       # API service layers
│   │   └── utils/          # Utility functions
│   ├── public/
│   └── package.json
├── server/                 # Node.js backend
│   ├── routes/             # API route handlers
│   ├── middleware/         # Custom middleware
│   ├── models/             # Database models
│   ├── services/           # Business logic services
│   └── lib/                # Utility libraries
├── docker-compose.yml      # Container orchestration
├── Dockerfile             # Container definition
└── config.env             # Environment configuration
```

### 2. Shared Middleware Pattern

Create a shared middleware package for Weam session management:

```javascript
// server/middleware/weamSession.js
const { withIronSessionApiRoute, withIronSessionSsr } = require('iron-session/next');
const { ironOptions } = require('../config/ironOption');

// Middleware for API routes
const weamSessionMiddleware = () => {
  return (req, res, next) => {
    // Session handling logic
    if (!req.session) {
      req.session = {};
    }
    next();
  };
};

// Session validation for protected routes
const requireWeamAuth = (req, res, next) => {
  if (!req.session?.user) {
    return res.status(401).json({ 
      authenticated: false, 
      error: 'No Weam session found' 
    });
  }
  next();
};

module.exports = {
  weamSessionMiddleware,
  requireWeamAuth,
  withIronSessionApiRoute,
  withIronSessionSsr
};
```

## Authentication & Session Management

### 1. Session Configuration

```javascript
// server/config/ironOption.js
const ironOptions = {
  cookieName: 'weam_session',
  password: process.env.IRON_SESSION_PASSWORD || 'your-secret-password',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    domain: process.env.COOKIE_DOMAIN || undefined, // Set to .weam.ai for subdomain sharing
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

module.exports = { ironOptions };
```

### 2. Session Validation Endpoint

```javascript
// server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { requireWeamAuth } = require('../middleware/weamSession');

// Session validation endpoint
router.get('/me', (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ 
      authenticated: true, 
      user: req.session.user 
    });
  }
  return res.status(401).json({ 
    authenticated: false, 
    error: 'No Weam session' 
  });
});

// Access control endpoint
router.post('/check-access', requireWeamAuth, async (req, res) => {
  try {
    const { userId, urlPath } = req.body;
    
    // Validate access through Weam's access control system
    const hasAccess = await validateUserAccess(userId, urlPath);
    
    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'User does not have access to this resource'
      });
    }
    
    res.json({ access: true });
  } catch (error) {
    console.error('Access check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
```

## Base Path Configuration

### 1. Server Configuration

```javascript
// server/index.js
const express = require('express');
const cors = require('cors');
const { weamSessionMiddleware } = require('./middleware/weamSession');

const app = express();

// Dynamic base path configuration
const rawBasePath = process.env.NEXT_PUBLIC_API_BASE_PATH || 
                   process.env.REACT_APP_API_BASE_PATH || 
                   '/wibecoded-solution';
const basePath = rawBasePath.startsWith('/') 
  ? rawBasePath.replace(/\/$/, '') 
  : `/${rawBasePath.replace(/\/$/, '')}`;

// CORS configuration
const allowedOrigin = process.env.CLIENT_ORIGIN || 
                     process.env.NEXT_PUBLIC_APP_ORIGIN;
app.use(cors({
  origin: allowedOrigin || true,
  credentials: true
}));

// Session middleware
app.use(weamSessionMiddleware());

// API routes with base path
app.use(`${basePath}/api/auth`, authRoutes);
app.use(`${basePath}/api/wibecoded`, wibecodedRoutes);

// Health check
app.get(`${basePath}/api/health`, (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Wibecoded service is running',
    basePath: basePath
  });
});

// Serve client build under base path
const clientBuildPath = path.join(__dirname, '../client/build');
if (fs.existsSync(clientBuildPath)) {
  app.use(basePath, express.static(clientBuildPath));
  
  // SPA fallback
  app.get(`${basePath}/*`, (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}
```

### 2. Frontend Configuration

```javascript
// client/src/config/api.js
const getApiBaseUrl = () => {
  // In production, use relative paths for base path support
  if (process.env.NODE_ENV === 'production') {
    return process.env.REACT_APP_API_BASE_PATH || '/wibecoded-solution/api';
  }
  
  // In development, use environment variable or default
  return process.env.REACT_APP_API_BASE_URL || 'http://localhost:3009/api';
};

export const API_BASE_URL = getApiBaseUrl();

// API service with base path support
export class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }
  
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      credentials: 'include', // Include cookies for session
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };
    
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  // Session validation
  async validateSession() {
    return this.request('/auth/me');
  }
  
  // Wibecoded-specific API calls
  async getWibecodedData(params) {
    return this.request('/wibecoded/data', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }
}
```

## API Integration

### 1. Standardized Response Format

```javascript
// server/lib/responseFormat.js
class ApiResponse {
  static success(data, message = 'Success') {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }
  
  static error(message, code = 500, details = null) {
    return {
      success: false,
      message,
      code,
      details,
      timestamp: new Date().toISOString(),
    };
  }
  
  static validationError(errors) {
    return {
      success: false,
      message: 'Validation failed',
      code: 400,
      errors,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = ApiResponse;
```

### 2. Wibecoded Service Integration

```javascript
// server/services/wibecodedService.js
const ApiResponse = require('../lib/responseFormat');

class WibecodedService {
  constructor() {
    this.apiKey = process.env.WIBECODED_API_KEY;
    this.baseUrl = process.env.WIBECODED_API_URL;
  }
  
  async processRequest(userId, requestData) {
    try {
      // Validate user access
      const hasAccess = await this.validateUserAccess(userId);
      if (!hasAccess) {
        throw new Error('User does not have access to Wibecoded services');
      }
      
      // Process with Wibecoded API
      const result = await this.callWibecodedAPI(requestData);
      
      return ApiResponse.success(result, 'Wibecoded request processed successfully');
    } catch (error) {
      console.error('Wibecoded service error:', error);
      return ApiResponse.error(error.message, 500, error.stack);
    }
  }
  
  async callWibecodedAPI(data) {
    const response = await fetch(`${this.baseUrl}/api/process`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Wibecoded API error: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  async validateUserAccess(userId) {
    // Integration with Weam's access control system
    // This would typically call Weam's user management API
    return true; // Simplified for example
  }
}

module.exports = new WibecodedService();
```

## Frontend Integration

### 1. Session Context Provider

```javascript
// client/src/context/SessionContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import { ApiService } from '../config/api';

const SessionContext = createContext();

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

export const SessionProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  
  const apiService = new ApiService();
  
  useEffect(() => {
    validateSession();
  }, []);
  
  const validateSession = async () => {
    try {
      setLoading(true);
      const response = await apiService.validateSession();
      
      if (response.authenticated) {
        setUser(response.user);
        setAuthenticated(true);
      } else {
        setUser(null);
        setAuthenticated(false);
      }
    } catch (error) {
      console.error('Session validation failed:', error);
      setUser(null);
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };
  
  const logout = () => {
    setUser(null);
    setAuthenticated(false);
    // Redirect to Weam login
    window.location.href = '/login';
  };
  
  const value = {
    user,
    authenticated,
    loading,
    validateSession,
    logout,
  };
  
  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};
```

### 2. Protected Route Component

```javascript
// client/src/components/ProtectedRoute.js
import React from 'react';
import { useSession } from '../context/SessionContext';

const ProtectedRoute = ({ children, fallback = null }) => {
  const { authenticated, loading } = useSession();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!authenticated) {
    return fallback || (
      <div>
        <h2>Authentication Required</h2>
        <p>Please log in to access this feature.</p>
        <a href="/login">Go to Login</a>
      </div>
    );
  }
  
  return children;
};

export default ProtectedRoute;
```

### 3. Wibecoded Component Integration

```javascript
// client/src/components/WibecodedInterface.js
import React, { useState, useEffect } from 'react';
import { useSession } from '../context/SessionContext';
import { ApiService } from '../config/api';
import ProtectedRoute from './ProtectedRoute';

const WibecodedInterface = () => {
  const { user } = useSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const apiService = new ApiService();
  
  const handleWibecodedRequest = async (requestData) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await apiService.getWibecodedData({
        userId: user.id,
        ...requestData,
      });
      
      setData(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <ProtectedRoute>
      <div className="wibecoded-interface">
        <h1>Wibecoded Solution</h1>
        <p>Welcome, {user?.name || user?.email}</p>
        
        {loading && <div>Processing...</div>}
        {error && <div className="error">Error: {error}</div>}
        {data && <div className="result">{JSON.stringify(data, null, 2)}</div>}
        
        <button 
          onClick={() => handleWibecodedRequest({ action: 'test' })}
          disabled={loading}
        >
          Test Wibecoded Integration
        </button>
      </div>
    </ProtectedRoute>
  );
};

export default WibecodedInterface;
```

## Deployment Configuration

### 1. Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

# Build client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --only=production
COPY client/ ./
RUN npm run build

# Build server
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/ ./

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S appuser -u 1001

# Copy built application
COPY --from=builder /app/server ./
COPY --from=builder /app/client/build ./client/build

# Set ownership
RUN chown -R appuser:nodejs /app
USER appuser

# Environment configuration
ENV NODE_ENV=production
ENV BACKEND_PORT=3009
ENV FRONTEND_PORT=3008
ENV PORT=3009

# Expose ports
EXPOSE 3009 3008

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${BACKEND_PORT}/wibecoded-solution/api/health || exit 1

CMD ["node", "index.js"]
```

### 2. Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  wibecoded-solution:
    build: .
    ports:
      - "3009:3009"
      - "3008:3008"
    environment:
      - NODE_ENV=production
      - BACKEND_PORT=3009
      - FRONTEND_PORT=3008
      - NEXT_PUBLIC_API_BASE_PATH=/wibecoded-solution
      - CLIENT_ORIGIN=https://dev.weam.ai
      - COOKIE_DOMAIN=.weam.ai
      - WIBECODED_API_KEY=${WIBECODED_API_KEY}
      - WIBECODED_API_URL=${WIBECODED_API_URL}
      - IRON_SESSION_PASSWORD=${IRON_SESSION_PASSWORD}
      - MONGODB_URI=${MONGODB_URI}
    volumes:
      - ./.env:/app/.env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3009/wibecoded-solution/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 3. Nginx Configuration

```nginx
# nginx.conf
server {
    listen 80;
    server_name dev.weam.ai;
    
    # Wibecoded solution
    location /wibecoded-solution {
        proxy_pass http://localhost:3009;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Preserve base path
        proxy_redirect off;
    }
    
    # API routes
    location /wibecoded-solution/api/ {
        proxy_pass http://localhost:3009;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' 'https://dev.weam.ai' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' 'https://dev.weam.ai';
            add_header 'Access-Control-Allow-Credentials' 'true';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
}
```

## Security Considerations

### 1. Environment Variables

```bash
# .env
# Application
NODE_ENV=production
BACKEND_PORT=3009
FRONTEND_PORT=3008

# Base path configuration
NEXT_PUBLIC_API_BASE_PATH=/wibecoded-solution
CLIENT_ORIGIN=https://dev.weam.ai
COOKIE_DOMAIN=.weam.ai

# Session security
IRON_SESSION_PASSWORD=your-very-secure-session-password-here

# External API integration
WIBECODED_API_KEY=your-wibecoded-api-key
WIBECODED_API_URL=https://api.wibecoded.com

# Database
MONGODB_URI=mongodb://localhost:27017/wibecoded-solution

# Weam integration
WEAM_API_URL=https://dev.weam.ai/api
API_BASIC_AUTH_USERNAME=your-basic-auth-username
API_BASIC_AUTH_PASSWORD=your-basic-auth-password
```

### 2. Security Middleware

```javascript
// server/middleware/security.js
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Rate limiting
const createRateLimit = (windowMs, max) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests',
      message: 'Please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Security headers
const securityMiddleware = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://dev.weam.ai"],
      },
    },
    crossOriginEmbedderPolicy: false,
  });
};

module.exports = {
  createRateLimit,
  securityMiddleware,
};
```

## Testing Strategy

### 1. Unit Tests

```javascript
// server/tests/wibecodedService.test.js
const WibecodedService = require('../services/wibecodedService');

describe('WibecodedService', () => {
  test('should process request successfully', async () => {
    const mockUserId = 'test-user-123';
    const mockRequestData = { action: 'test' };
    
    const result = await WibecodedService.processRequest(mockUserId, mockRequestData);
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });
  
  test('should handle API errors gracefully', async () => {
    const mockUserId = 'test-user-123';
    const mockRequestData = { action: 'invalid' };
    
    const result = await WibecodedService.processRequest(mockUserId, mockRequestData);
    
    expect(result.success).toBe(false);
    expect(result.message).toContain('error');
  });
});
```

### 2. Integration Tests

```javascript
// server/tests/integration/auth.test.js
const request = require('supertest');
const app = require('../index');

describe('Authentication Integration', () => {
  test('should validate session endpoint', async () => {
    const response = await request(app)
      .get('/wibecoded-solution/api/auth/me')
      .expect(401);
    
    expect(response.body.authenticated).toBe(false);
  });
  
  test('should handle CORS properly', async () => {
    const response = await request(app)
      .options('/wibecoded-solution/api/auth/me')
      .set('Origin', 'https://dev.weam.ai')
      .expect(204);
    
    expect(response.headers['access-control-allow-origin']).toBe('https://dev.weam.ai');
  });
});
```

### 3. Frontend Tests

```javascript
// client/src/tests/WibecodedInterface.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionProvider } from '../context/SessionContext';
import WibecodedInterface from '../components/WibecodedInterface';

const mockUser = {
  id: 'test-user-123',
  name: 'Test User',
  email: 'test@example.com'
};

const MockedWibecodedInterface = () => (
  <SessionProvider>
    <WibecodedInterface />
  </SessionProvider>
);

describe('WibecodedInterface', () => {
  test('should render for authenticated user', async () => {
    render(<MockedWibecodedInterface />);
    
    await waitFor(() => {
      expect(screen.getByText('Wibecoded Solution')).toBeInTheDocument();
    });
  });
  
  test('should show authentication required for unauthenticated user', () => {
    // Mock unauthenticated state
    render(<MockedWibecodedInterface />);
    
    expect(screen.getByText('Authentication Required')).toBeInTheDocument();
  });
});
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Session Not Persisting

**Problem**: User session is not maintained across requests.

**Solutions**:
- Verify `COOKIE_DOMAIN` is set to `.weam.ai` for subdomain sharing
- Check that `sameSite` is set to `lax` or `none`
- Ensure `credentials: 'include'` is set in frontend requests
- Verify CORS configuration allows credentials

#### 2. Base Path Issues

**Problem**: API calls fail when deployed under subpath.

**Solutions**:
- Set `NEXT_PUBLIC_API_BASE_PATH` environment variable
- Update frontend API service to use relative paths
- Verify nginx/proxy configuration preserves base path
- Check that server routes are properly prefixed

#### 3. CORS Errors

**Problem**: Cross-origin requests are blocked.

**Solutions**:
- Set `CLIENT_ORIGIN` to the correct frontend URL
- Verify CORS middleware configuration
- Check preflight OPTIONS requests are handled
- Ensure credentials are properly configured

#### 4. Authentication Failures

**Problem**: Users cannot access protected resources.

**Solutions**:
- Verify session middleware is properly configured
- Check that Weam session cookies are being sent
- Validate user access through Weam's access control
- Ensure proper error handling and user feedback

### Debugging Tools

#### 1. Session Debugging

```javascript
// server/middleware/debugSession.js
const debugSession = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Session Debug:', {
      session: req.session,
      cookies: req.cookies,
      headers: {
        cookie: req.headers.cookie,
        origin: req.headers.origin,
        referer: req.headers.referer,
      }
    });
  }
  next();
};

module.exports = debugSession;
```

#### 2. API Request Logging

```javascript
// server/middleware/requestLogger.js
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
};

module.exports = requestLogger;
```

### Performance Monitoring

#### 1. Health Check Endpoint

```javascript
// server/routes/health.js
const express = require('express');
const router = express.Router();

router.get('/health', async (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
  };
  
  // Add service-specific health checks
  try {
    // Check database connection
    await checkDatabaseConnection();
    health.database = 'OK';
  } catch (error) {
    health.database = 'ERROR';
    health.status = 'DEGRADED';
  }
  
  try {
    // Check external API
    await checkWibecodedAPI();
    health.wibecoded = 'OK';
  } catch (error) {
    health.wibecoded = 'ERROR';
    health.status = 'DEGRADED';
  }
  
  const statusCode = health.status === 'OK' ? 200 : 503;
  res.status(statusCode).json(health);
});

module.exports = router;
```

## Conclusion

This guide provides a comprehensive framework for integrating Wibecoded solutions into the Weam ecosystem. Key success factors include:

1. **Consistent Authentication**: Leverage Weam's existing session management
2. **Base Path Support**: Enable deployment under subpaths
3. **Standardized APIs**: Follow established patterns for consistency
4. **Security First**: Implement proper CORS, rate limiting, and validation
5. **Comprehensive Testing**: Cover unit, integration, and end-to-end scenarios
6. **Monitoring**: Implement health checks and logging for production

By following these patterns, Wibecoded solutions can integrate seamlessly with Weam while maintaining security, scalability, and user experience standards.
