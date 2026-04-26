const express = require('express');
const router = express.Router();
const { spawn, execSync } = require('child_process');
const axios = require('axios');
const logger = require('../lib/logger');

const urlCache = new Map();

async function getDirectUrl(videoId) {
  const cached = urlCache.get(videoId);
  if (cached && Date.now() < cached.expires) {
    logger.info(`Cache hit for ${videoId}`);
    return cached.url;
  }

  const ytdlp = process.env.YTDLP_PATH || 'yt-dlp';
  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // Update yt-dlp before trying (ensures latest version)
  try {
    execSync(`${ytdlp} -U --quiet`, { timeout: 30000 });
    logger.info('yt-dlp updated');
  } catch (e) {
    logger.warn('yt-dlp update skipped: ' + e.message);
  }

  const clients = ['tv_embedded', 'android_vr', 'android', 'mweb'];

  for (const client of clients) {
    try {
      logger.info(`Trying client: ${client} for ${videoId}`);
      const url = await new Promise((resolve, reject) => {
        const args = [
          '--no-playlist',
          '--format', 'bestaudio',
          '--get-url',
          '--no-warnings',
          '--extractor-args', `youtube:player_client=${client}`,
          '--socket-timeout', '15',
          ytUrl,
        ];

        logger.info(`Running: yt-dlp ${args.join(' ')}`);
        const proc = spawn(ytdlp, args, { timeout: 20000 });

        let out = '', err = '';
        proc.stdout.on('data', d => out += d);
        proc.stderr.on('data', d => err += d);
        proc.on('close', code => {
          logger.info(`yt-dlp exit ${code}, out: ${out.slice(0, 100)}, err: ${err.slice(0, 200)}`);
          const u = out.trim().split('\n')[0];
          if (u?.startsWith('http')) resolve(u);
          else reject(new Error(`${client}: ${err.trim().slice(0, 100) || 'No URL (exit ' + code + ')'}`));
        });
        proc.on('error', e => reject(new Error(`spawn: ${e.message}`)));
      });

      urlCache.set(videoId, { url, expires: Date.now() + 5 * 60 * 1000 });
      return url;
    } catch (e) {
      logger.error(`Client ${client} failed: ${e.message}`);
    }
  }

  throw new Error(`All YouTube clients failed for ${videoId}`);
}

router.get('/:videoId/url', async (req, res) => {
  const { videoId } = req.params;
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return res.status(400).json({ error: 'Invalid video ID' });
  try {
    const url = await getDirectUrl(videoId);
    res.json({ url, videoId });
  } catch (err) {
    logger.error(`/url failed ${videoId}: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:videoId', async (req, res) => {
  const { videoId } = req.params;
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return res.status(400).json({ error: 'Invalid video ID' });

  try {
    const directUrl = await getDirectUrl(videoId);
    logger.info(`Proxying ${videoId} → ${directUrl.slice(0, 80)}...`);

    const response = await axios({
      method: 'GET',
      url: directUrl,
      responseType: 'stream',
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36',
        'Range': req.headers.range || 'bytes=0-',
        'Referer': 'https://www.youtube.com/',
        'Origin': 'https://www.youtube.com',
      },
    });

    const ct = response.headers['content-type'] || 'audio/webm';
    logger.info(`Streaming ${videoId}: ${ct}, status ${response.status}`);

    res.setHeader('Content-Type', ct);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Accept-Ranges', 'bytes');
    if (response.headers['content-length']) res.setHeader('Content-Length', response.headers['content-length']);
    if (response.headers['content-range']) res.setHeader('Content-Range', response.headers['content-range']);
    res.status(response.status === 206 ? 206 : 200);

    response.data.pipe(res);
    req.on('close', () => { response.data.destroy(); logger.info(`Client left: ${videoId}`); });

  } catch (err) {
    logger.error(`Stream failed ${videoId}: ${err.message}`);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

module.exports = router;
