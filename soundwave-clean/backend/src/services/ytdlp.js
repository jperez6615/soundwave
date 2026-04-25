const { spawn } = require('child_process');
const NodeCache = require('node-cache');
const logger = require('../lib/logger');

// Cache YouTube audio URLs for 10 minutes to avoid repeated yt-dlp calls
const urlCache = new NodeCache({ stdTTL: 600, checkperiod: 60 });

// Find yt-dlp binary path
function getYtDlpPath() {
  return process.env.YTDLP_PATH || 'yt-dlp';
}

function getFfmpegPath() {
  return process.env.FFMPEG_PATH || 'ffmpeg';
}

/**
 * Extract direct audio stream URL from YouTube video ID
 * Returns the audio-only stream URL that can be piped or redirected
 */
async function extractAudioUrl(videoId) {
  const cached = urlCache.get(videoId);
  if (cached) {
    logger.info(`Cache hit for videoId: ${videoId}`);
    return cached;
  }

  return new Promise((resolve, reject) => {
    const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const ytdlp = getYtDlpPath();
    
    // Extract best audio-only URL without downloading
    const args = [
      '--no-playlist',
      '--format', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio',
      '--get-url',
      '--no-warnings',
      '--quiet',
      ytUrl,
    ];

    logger.info(`Extracting audio URL for ${videoId}`);
    const proc = spawn(ytdlp, args, { timeout: 30000 });
    
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        logger.error(`yt-dlp failed for ${videoId}: ${stderr}`);
        return reject(new Error(`yt-dlp failed: ${stderr.trim() || 'Unknown error'}`));
      }

      const url = stdout.trim().split('\n')[0];
      if (!url || !url.startsWith('http')) {
        return reject(new Error('No valid URL extracted'));
      }

      urlCache.set(videoId, url);
      logger.info(`Extracted URL for ${videoId} (cached)`);
      resolve(url);
    });

    proc.on('error', (err) => {
      logger.error(`Failed to spawn yt-dlp: ${err.message}`);
      reject(new Error(`Failed to run yt-dlp: ${err.message}. Make sure yt-dlp is installed.`));
    });
  });
}

/**
 * Stream audio directly using yt-dlp piped through ffmpeg
 * This converts to MP3 on-the-fly for maximum browser compatibility
 */
function createAudioStream(videoId, options = {}) {
  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const ytdlp = getYtDlpPath();
  const ffmpeg = getFfmpegPath();
  const { startTime = 0, quality = '128k' } = options;

  // yt-dlp process: downloads best audio and pipes raw stream
  const ytdlpArgs = [
    '--no-playlist',
    '--format', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best',
    '--no-warnings',
    '--quiet',
    '-o', '-', // output to stdout
    ytUrl,
  ];

  // ffmpeg process: receives raw stream, converts to MP3
  const ffmpegArgs = [
    '-i', 'pipe:0',          // read from stdin
    '-vn',                    // no video
    '-acodec', 'libmp3lame', // encode as MP3
    '-ab', quality,          // audio bitrate
    '-ar', '44100',          // sample rate
    ...(startTime > 0 ? ['-ss', String(startTime)] : []),
    '-f', 'mp3',             // output format
    'pipe:1',                // output to stdout
  ];

  logger.info(`Starting stream for ${videoId} (quality: ${quality}, start: ${startTime}s)`);

  const ytdlpProc = spawn(ytdlp, ytdlpArgs);
  const ffmpegProc = spawn(ffmpeg, ffmpegArgs);

  // Pipe yt-dlp output into ffmpeg input
  ytdlpProc.stdout.pipe(ffmpegProc.stdin);

  // Handle yt-dlp errors
  ytdlpProc.stderr.on('data', (data) => {
    const msg = data.toString();
    if (!msg.includes('WARNING') && !msg.trim() === '') {
      logger.warn(`yt-dlp stderr [${videoId}]: ${msg}`);
    }
  });

  ytdlpProc.on('error', (err) => {
    logger.error(`yt-dlp process error [${videoId}]: ${err.message}`);
    ffmpegProc.stdin.destroy();
  });

  ffmpegProc.stderr.on('data', (data) => {
    // ffmpeg logs to stderr even for normal operation, only log errors
    const msg = data.toString();
    if (msg.includes('Error') || msg.includes('error')) {
      logger.warn(`ffmpeg stderr [${videoId}]: ${msg}`);
    }
  });

  return {
    stream: ffmpegProc.stdout,
    cleanup: () => {
      try {
        ytdlpProc.kill('SIGKILL');
        ffmpegProc.kill('SIGKILL');
      } catch (e) {
        // Already dead
      }
    },
    onError: (callback) => {
      ytdlpProc.on('error', callback);
      ffmpegProc.on('error', callback);
    },
  };
}

/**
 * Get video metadata (title, duration, thumbnail)
 */
async function getVideoInfo(videoId) {
  return new Promise((resolve, reject) => {
    const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const ytdlp = getYtDlpPath();

    const args = [
      '--no-playlist',
      '--skip-download',
      '--print-json',
      '--no-warnings',
      ytUrl,
    ];

    const proc = spawn(ytdlp, args, { timeout: 20000 });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`yt-dlp info failed: ${stderr}`));
      }
      try {
        const info = JSON.parse(stdout);
        resolve({
          title: info.title,
          uploader: info.uploader || info.channel,
          duration: info.duration,
          thumbnail: info.thumbnail,
          viewCount: info.view_count,
        });
      } catch (e) {
        reject(new Error('Failed to parse video info'));
      }
    });

    proc.on('error', (err) => reject(err));
  });
}

module.exports = { extractAudioUrl, createAudioStream, getVideoInfo };
