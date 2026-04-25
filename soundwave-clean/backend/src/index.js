require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const logger = require('./lib/logger');

const streamRoutes = require('./routes/stream');
const downloadRoutes = require('./routes/download');
const searchRoutes = require('./routes/search');
const playlistRoutes = require('./routes/playlists');
const trackRoutes = require('./routes/tracks');
const spotifyRoutes = require('./routes/spotify');
const lyricsRoutes = require('./routes/lyrics');
const historyRoutes = require('./routes/history');
const userRoutes = require('./routes/users');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Trust Railway's proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS - allow frontend domain
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);

// Stream-specific rate limiting (stricter)
const streamLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { error: 'Too many stream requests.' },
});

// Attach prisma to request
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// Routes
app.use('/api/stream', streamLimiter, streamRoutes);
app.use('/api/download', streamLimiter, downloadRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/tracks', trackRoutes);
app.use('/api/spotify', spotifyRoutes);
app.use('/api/lyrics', lyricsRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal server error' 
  });
});

// Start server
async function main() {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected');
    
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🎵 SoundWave backend running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});
