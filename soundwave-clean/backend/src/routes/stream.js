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
  const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;

  logger.info(`Stream: ${videoId}`);

  // Set headers before streaming
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');

  // yt-dlp: extract best audio and pipe to stdout
  const ytProc = spawn(ytdlp, [
    '--no-playlist',
    '--format', 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best',
    '--no-warnings',
    '-o', '-',
    ytUrl,
  ]);

  // ffmpeg: convert to MP3 and pipe to response
  const ffProc = spawn(ffmpeg, [
    '-loglevel', 'error',
    '-i', 'pipe:0',
    '-vn',
    '-acodec', 'libmp3lame',
    '-ab', '128k',
    '-ar', '44100',
    '-f', 'mp3',
    'pipe:1',
  ]);

  ytProc.stdout.pipe(ffProc.stdin);
  ffProc.stdout.pipe(res);

  // Cleanup on client disconnect
  const cleanup = () => {
    try { ytProc.kill('SIGKILL'); } catch {}
    try { ffProc.kill('SIGKILL'); } catch {}
  };

  req.on('close', cleanup);
  req.on('abort', cleanup);

  ytProc.on('error', (e) => {
    logger.error(`yt-dlp error: ${e.message}`);
    cleanup();
    if (!res.headersSent) res.status(500).end();
  });

  ffProc.on('error', (e) => {
    logger.error(`ffmpeg error: ${e.message}`);
    cleanup();
  });

  ffProc.on('close', (code) => {
    logger.info(`Stream done: ${videoId} (code ${code})`);
    res.end();
  });

  ytProc.stderr.on('data', (d) => {
    const msg = d.toString();
    if (msg.includes('ERROR')) logger.error(`yt-dlp: ${msg}`);
  });
});

router.head('/:videoId', (req, res) => {
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Accept-Ranges', 'bytes');
  res.status(200).end();
});

module.exports = router;
