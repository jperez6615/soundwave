const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const logger = require('../lib/logger');

const urlCache = new Map();

// Write cookies to a temp file if env var is set
function getCookiesFile() {
  const cookiesContent = process.env.YOUTUBE_COOKIES;
  if (!cookiesContent) return null;

  const tmpFile = path.join(os.tmpdir(), 'yt_cookies.txt');
  try {
    fs.writeFileSync(tmpFile, cookiesContent, 'utf8');
    return tmpFile;
  } catch (e) {
    logger.error('Failed to write cookies file: ' + e.message);
    return null;
  }
}

async function getDirectUrl(videoId) {
  const cached = urlCache.get(videoId);
  if (cached && Date.now() < cached.expires) return cached.url;

  const ytdlp = process.env.YTDLP_PATH || 'yt-dlp';
  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const cookiesFile = getCookiesFile();

  const baseArgs = [
    '--no-playlist',
    '--format', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best',
    '--get-url',
    '--no-warnings',
    '--socket-timeout', '15',
  ];

  if (cookiesFile) {
    baseArgs.push('--cookies', cookiesFile);
    logger.info(`Using cookies file for ${videoId}`);
  }

  const clients = ['tv_embedded', 'android', 'web'];

  for (const client of clients) {
    try {
      const url = await new Promise((resolve, reject) => {
        const args = [
          ...baseArgs,
          '--extractor-args', `youtube:player_client=${client}`,
          ytUrl,
        ];

        const proc = spawn(ytdlp, args, { timeout: 20000 });
        let out = '', err = '';
        proc.stdout.on('data', d => out += d);
        proc.stderr.on('data', d => err += d);
        proc.on('close', code => {
          const u = out.trim().split('\n')[0];
          if (u?.startsWith('http')) resolve(u);
          else reject(new Error(`${client}: ${err.slice(0, 150)}`));
        });
        proc.on('error', e => reject(new Error(`spawn: ${e.message}`)));
      });

      logger.info(`Got URL via ${client} for ${videoId}`);
      urlCache.set(videoId, { url, expires: Date.now() + 5 * 60 * 1000 });
      return url;
    } catch (e) {
      logger.warn(`Client ${client} failed: ${e.message.slice(0, 100)}`);
    }
  }

  throw new Error('All YouTube clients failed - cookies may be needed');
}

router.get('/:videoId/url', async (req, res) => {
  const { videoId } = req.params;
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return res.status(400).json({ error: 'Invalid video ID' });
  try {
    const url = await getDirectUrl(videoId);
    res.json({ url, videoId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:videoId', async (req, res) => {
  const { videoId } = req.params;
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return res.status(400).json({ error: 'Invalid video ID' });

  try {
    const directUrl = await getDirectUrl(videoId);

    const response = await axios({
      method: 'GET',
      url: directUrl,
      responseType: 'stream',
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36',
        'Range': req.headers.range || 'bytes=0-',
        'Referer': 'https://www.youtube.com/',
      },
    });

    res.setHeader('Content-Type', response.headers['content-type'] || 'audio/webm');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Accept-Ranges', 'bytes');
    if (response.headers['content-length']) res.setHeader('Content-Length', response.headers['content-length']);
    if (response.headers['content-range']) res.setHeader('Content-Range', response.headers['content-range']);
    res.status(response.status === 206 ? 206 : 200);

    response.data.pipe(res);
    req.on('close', () => response.data.destroy());

  } catch (err) {
    logger.error(`Stream failed ${videoId}: ${err.message}`);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

module.exports = router;
