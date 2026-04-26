const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const axios = require('axios');
const logger = require('../lib/logger');

// Cache direct URLs for 5 minutes
const urlCache = new Map();

async function getDirectUrl(videoId) {
  if (urlCache.has(videoId)) {
    const { url, expires } = urlCache.get(videoId);
    if (Date.now() < expires) return url;
  }

  const ytdlp = process.env.YTDLP_PATH || 'yt-dlp';
  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;

  return new Promise((resolve, reject) => {
    const proc = spawn(ytdlp, [
      '--no-playlist',
      '--format', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best',
      '--get-url',
      '--no-warnings',
      '--quiet',
      // Use Android client to avoid bot detection
      '--extractor-args', 'youtube:player_client=android',
      ytUrl,
    ], { timeout: 30000 });

    let url = '';
    let err = '';
    proc.stdout.on('data', d => url += d.toString());
    proc.stderr.on('data', d => err += d.toString());

    proc.on('close', code => {
      const directUrl = url.trim().split('\n')[0];
      if (!directUrl.startsWith('http')) {
        return reject(new Error(`yt-dlp failed: ${err.trim()}`));
      }
      // Cache for 4 minutes (URLs expire after 6h but let's be safe)
      urlCache.set(videoId, { url: directUrl, expires: Date.now() + 4 * 60 * 1000 });
      resolve(directUrl);
    });

    proc.on('error', reject);
  });
}

// GET /api/stream/:videoId/url - return direct URL for client-side playback
router.get('/:videoId/url', async (req, res) => {
  const { videoId } = req.params;
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: 'Invalid video ID' });
  }

  try {
    const url = await getDirectUrl(videoId);
    res.json({ url, videoId });
  } catch (err) {
    logger.error(`URL extraction failed for ${videoId}: ${err.message}`);
    res.status(500).json({ error: 'Failed to get URL', message: err.message });
  }
});

// GET /api/stream/:videoId - proxy stream
router.get('/:videoId', async (req, res) => {
  const { videoId } = req.params;
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: 'Invalid video ID' });
  }

  try {
    const directUrl = await getDirectUrl(videoId);
    logger.info(`Proxying stream for ${videoId}`);

    const response = await axios({
      method: 'GET',
      url: directUrl,
      responseType: 'stream',
      timeout: 60000,
      headers: {
        'User-Agent': 'com.google.android.youtube/19.09.37 (Linux; U; Android 11)',
        'Range': req.headers.range || 'bytes=0-',
        'Accept': '*/*',
      },
      maxRedirects: 5,
    });

    const contentType = response.headers['content-type'] || 'audio/webm';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');

    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }
    if (response.headers['content-range']) {
      res.setHeader('Content-Range', response.headers['content-range']);
    }

    res.status(response.status === 206 ? 206 : 200);
    response.data.pipe(res);

    req.on('close', () => {
      response.data.destroy();
      logger.info(`Client disconnected: ${videoId}`);
    });

  } catch (err) {
    logger.error(`Stream failed for ${videoId}: ${err.message}`);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Stream failed', message: err.message });
    }
  }
});

module.exports = router;
