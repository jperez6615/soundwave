const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const axios = require('axios');
const logger = require('../lib/logger');

/**
 * GET /api/stream/:videoId/url
 * Returns the direct audio URL from YouTube (no proxying)
 */
router.get('/:videoId/url', async (req, res) => {
  const { videoId } = req.params;

  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: 'Invalid video ID' });
  }

  const ytdlp = process.env.YTDLP_PATH || 'yt-dlp';
  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;

  logger.info(`Getting URL for: ${videoId}`);

  const proc = spawn(ytdlp, [
    '--no-playlist',
    '--format', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best',
    '--get-url',
    '--no-warnings',
    '--quiet',
    ytUrl,
  ], { timeout: 30000 });

  let url = '';
  let error = '';

  proc.stdout.on('data', (d) => { url += d.toString(); });
  proc.stderr.on('data', (d) => { error += d.toString(); });

  proc.on('close', (code) => {
    const directUrl = url.trim().split('\n')[0];
    if (code !== 0 || !directUrl.startsWith('http')) {
      logger.error(`yt-dlp failed for ${videoId}: ${error}`);
      return res.status(500).json({ error: 'Failed to get stream URL', details: error });
    }
    logger.info(`Got URL for ${videoId}`);
    res.json({ url: directUrl, videoId });
  });

  proc.on('error', (e) => {
    logger.error(`yt-dlp spawn error: ${e.message}`);
    res.status(500).json({ error: e.message });
  });
});

/**
 * GET /api/stream/:videoId  
 * Proxy stream (fallback)
 */
router.get('/:videoId', async (req, res) => {
  const { videoId } = req.params;

  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: 'Invalid video ID' });
  }

  const ytdlp = process.env.YTDLP_PATH || 'yt-dlp';
  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // First get the direct URL
  const getUrl = () => new Promise((resolve, reject) => {
    const proc = spawn(ytdlp, [
      '--no-playlist',
      '--format', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best',
      '--get-url', '--no-warnings', '--quiet', ytUrl,
    ], { timeout: 30000 });

    let url = '';
    proc.stdout.on('data', (d) => { url += d.toString(); });
    proc.on('close', (code) => {
      const u = url.trim().split('\n')[0];
      if (u.startsWith('http')) resolve(u);
      else reject(new Error('No URL'));
    });
    proc.on('error', reject);
  });

  try {
    const directUrl = await getUrl();

    // Proxy the request
    const response = await axios({
      method: 'GET',
      url: directUrl,
      responseType: 'stream',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Range': req.headers.range || 'bytes=0-',
      },
    });

    res.setHeader('Content-Type', response.headers['content-type'] || 'audio/webm');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache');
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }
    res.status(response.status === 206 ? 206 : 200);

    response.data.pipe(res);

    req.on('close', () => response.data.destroy());

  } catch (err) {
    logger.error(`Stream error for ${videoId}: ${err.message}`);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Stream failed', message: err.message });
    }
  }
});

module.exports = router;
