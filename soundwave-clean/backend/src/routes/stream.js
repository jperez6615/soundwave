const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const logger = require('../lib/logger');

router.get('/:videoId', async (req, res) => {
  const { videoId } = req.params;

  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: 'Invalid video ID' });
  }

  const ytdlp = process.env.YTDLP_PATH || 'yt-dlp';
  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;

  logger.info(`Stream: ${videoId}`);

  // Stream directly as opus/webm - no ffmpeg needed, browser supports it natively
  const ytProc = spawn(ytdlp, [
    '--no-playlist',
    '--format', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best',
    '--no-warnings',
    '-o', '-',
    ytUrl,
  ]);

  let headersSent = false;

  ytProc.stdout.once('data', (chunk) => {
    if (!headersSent) {
      headersSent = true;
      // Detect format from first bytes
      const isWebm = chunk[0] === 0x1a && chunk[1] === 0x45;
      const contentType = isWebm ? 'audio/webm' : 'audio/mp4';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('X-Accel-Buffering', 'no');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.write(chunk);
    }
  });

  ytProc.stdout.on('data', (chunk) => {
    if (headersSent) res.write(chunk);
  });

  ytProc.stdout.on('end', () => {
    logger.info(`Stream done: ${videoId}`);
    res.end();
  });

  const cleanup = () => {
    try { ytProc.kill('SIGKILL'); } catch {}
  };

  req.on('close', () => { logger.info(`Client left: ${videoId}`); cleanup(); });

  ytProc.on('error', (e) => {
    logger.error(`yt-dlp error: ${e.message}`);
    if (!res.headersSent) res.status(500).end();
  });

  ytProc.stderr.on('data', (d) => {
    const msg = d.toString().trim();
    if (msg && !msg.includes('WARNING')) logger.warn(`yt-dlp [${videoId}]: ${msg}`);
  });
});

router.head('/:videoId', (req, res) => {
  res.setHeader('Content-Type', 'audio/webm');
  res.status(200).end();
});

module.exports = router;
