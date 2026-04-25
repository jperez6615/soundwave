const express = require('express');
const router = express.Router();
const { createAudioStream } = require('../services/ytdlp');
const logger = require('../lib/logger');

/**
 * GET /api/stream/:videoId
 * Streams audio from YouTube video ID as MP3
 * Supports partial content (seeking) via Range header
 */
router.get('/:videoId', async (req, res) => {
  const { videoId } = req.params;
  const { quality = '128k', t = '0' } = req.query;
  const startTime = parseInt(t, 10) || 0;

  // Validate video ID (YouTube IDs are 11 chars, alphanumeric + - _)
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: 'Invalid video ID' });
  }

  // Validate quality parameter
  const allowedQualities = ['64k', '128k', '192k', '256k'];
  const safeQuality = allowedQualities.includes(quality) ? quality : '128k';

  logger.info(`Stream request: ${videoId} (quality: ${safeQuality}, start: ${startTime}s)`);

  // Set streaming headers
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Cache-Control', 'no-cache, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  
  // Allow audio seeking in browsers
  res.setHeader('Accept-Ranges', 'bytes');

  let cleanup = null;

  try {
    const { stream, cleanup: cleanupFn, onError } = createAudioStream(videoId, {
      startTime,
      quality: safeQuality,
    });

    cleanup = cleanupFn;

    // Handle stream errors
    onError((err) => {
      logger.error(`Stream error for ${videoId}: ${err.message}`);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream failed' });
      } else {
        res.destroy();
      }
      cleanup?.();
    });

    // Handle stream ending
    stream.on('end', () => {
      logger.info(`Stream completed: ${videoId}`);
    });

    stream.on('error', (err) => {
      logger.error(`Audio stream error [${videoId}]: ${err.message}`);
      cleanup?.();
    });

    // Client disconnected - kill ffmpeg processes to free resources
    req.on('close', () => {
      logger.info(`Client disconnected: ${videoId}`);
      cleanup?.();
    });

    req.on('abort', () => {
      cleanup?.();
    });

    // Pipe audio stream to HTTP response
    stream.pipe(res);

  } catch (error) {
    logger.error(`Failed to start stream for ${videoId}: ${error.message}`);
    cleanup?.();
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to start stream',
        message: error.message,
      });
    }
  }
});

/**
 * HEAD /api/stream/:videoId
 * Returns headers only (for checking if stream is available)
 */
router.head('/:videoId', (req, res) => {
  const { videoId } = req.params;
  
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).end();
  }

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Accept-Ranges', 'bytes');
  res.status(200).end();
});

module.exports = router;
