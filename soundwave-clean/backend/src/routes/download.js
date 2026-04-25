const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const logger = require('../lib/logger');

/**
 * GET /api/download/:videoId?title=SongName
 * Downloads audio as MP3 file directly to client
 */
router.get('/:videoId', async (req, res) => {
  const { videoId } = req.params;
  const { title = 'audio', quality = '192k' } = req.query;

  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: 'Invalid video ID' });
  }

  const safeTitle = title.replace(/[^a-zA-Z0-9\s\-_áéíóúñ]/g, '').trim() || 'audio';
  const ytdlp = process.env.YTDLP_PATH || 'yt-dlp';
  const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;

  logger.info(`Download request: ${videoId} - ${safeTitle}`);

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp3"`);
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const ytdlpArgs = [
    '--no-playlist', '--format', 'bestaudio', '--no-warnings', '--quiet', '-o', '-', ytUrl,
  ];
  const ffmpegArgs = [
    '-i', 'pipe:0', '-vn', '-acodec', 'libmp3lame', '-ab', quality, '-ar', '44100', '-f', 'mp3', 'pipe:1',
  ];

  const ytProc = spawn(ytdlp, ytdlpArgs);
  const ffProc = spawn(ffmpeg, ffmpegArgs);

  ytProc.stdout.pipe(ffProc.stdin);
  ffProc.stdout.pipe(res);

  req.on('close', () => { ytProc.kill(); ffProc.kill(); });
  ytProc.on('error', (e) => { logger.error('yt-dlp error:', e); res.destroy(); });
  ffProc.on('error', (e) => { logger.error('ffmpeg error:', e); res.destroy(); });
});

module.exports = router;
