const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables with flexible precedence:
// 1) AI-VideoGen/.env (when working inside this package)
// 2) project root .env
// 3) AI-VideoGen/config.env (legacy fallback)
const path = require('path');
const localEnvPath = path.join(__dirname, '../.env');
const rootEnvPath = path.join(__dirname, '../../.env');
const legacyConfigPath = path.join(__dirname, '../config.env');

let loadedFrom = null;
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
  loadedFrom = localEnvPath;
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
  loadedFrom = rootEnvPath;
} else if (fs.existsSync(legacyConfigPath)) {
  dotenv.config({ path: legacyConfigPath });
  loadedFrom = legacyConfigPath;
}

console.log('Loaded config from:', loadedFrom || 'no .env found');

// Debug environment variables
console.log('Environment variables loaded:');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('RUNWAY_API_KEY:', process.env.RUNWAY_API_KEY ? '***' + process.env.RUNWAY_API_KEY.slice(-4) : 'NOT SET');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '***' + process.env.MONGODB_URI.slice(-20) : 'NOT SET');

// Now import routes after environment variables are loaded
const { weamSessionMiddleware } = require('./middleware/weamSession');
const dbConnect = require('./lib/db'); // Import database connection
const videoRoutes = require('./routes/videoRoutes');
const chatRoutes = require('./routes/chatRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.BACKEND_PORT || process.env.PORT || 5000;

// Middleware
// Allow credentialed requests from the frontend so cookies are sent
const allowedOrigin = process.env.CLIENT_ORIGIN || process.env.NEXT_PUBLIC_APP_ORIGIN;
app.use(cors({
  origin: allowedOrigin || true,
  credentials: true
}));
app.use(express.json());
app.use(express.static('public'));
// Weam session (shares cookie with AI Doc Editor)
app.use(weamSessionMiddleware());

// Connect to MongoDB using our db connection utility
dbConnect()
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  console.error('Please check your MONGODB_URI in your .env');
  process.exit(1);
});

// Routes
app.use('/api/videos', videoRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Test endpoint for debugging
app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Test endpoint working',
    timestamp: new Date().toISOString(),
    headers: req.headers
  });
});

// Serve client build for SPA under a base path (e.g. /ai-video)
const clientBuildPath = path.join(__dirname, '../client/build');
if (fs.existsSync(clientBuildPath)) {
  const basePath = process.env.NEXT_PUBLIC_API_BASE_PATH || process.env.REACT_APP_API_BASE_PATH || '/ai-video';
  console.log('Serving client from', clientBuildPath, 'at base path', basePath);

  // Static assets
  app.use(basePath, express.static(clientBuildPath));

  // SPA fallback for nested routes under the base path
  app.get(`${basePath}/*`, (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Auth/session check for clients to confirm Weam session
app.get('/api/auth/me', (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ authenticated: true, user: req.session.user });
  }
  return res.status(401).json({ authenticated: false, error: 'No Weam session' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
