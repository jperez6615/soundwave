const axios = require('axios');
const { spawn } = require('child_process');
const NodeCache = require('node-cache');
const logger = require('../lib/logger');

// Short TTL so new API key takes effect quickly
const searchCache = new NodeCache({ stdTTL: 120, checkperiod: 30 });

async function searchYouTubeAPI(query, maxResults = 10) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('No YouTube API key');

  const cacheKey = `yt_api_${query}_${maxResults}`;
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;

  const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
    params: {
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults,
      key: apiKey,
    },
    timeout: 10000,
  });

  const results = response.data.items.map((item) => ({
    id: item.id.videoId,
    youtubeId: item.id.videoId,
    title: item.snippet.title,
    artist: item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
    thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
    publishedAt: item.snippet.publishedAt,
    source: 'youtube',
  }));

  searchCache.set(cacheKey, results);
  return results;
}

async function searchYouTubeYtDlp(query, maxResults = 10) {
  const cacheKey = `yt_dlp_${query}_${maxResults}`;
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;

  return new Promise((resolve, reject) => {
    const ytdlp = process.env.YTDLP_PATH || 'yt-dlp';

    const args = [
      `ytsearch${maxResults}:${query}`,
      '--print-json',
      '--skip-download',
      '--no-playlist',
      '--no-warnings',
      '--quiet',
      '--flat-playlist',
    ];

    const proc = spawn(ytdlp, args, { timeout: 30000 });
    let stdout = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.on('close', (code) => {
      const results = stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          try {
            const item = JSON.parse(line);
            const thumb = item.thumbnail || item.thumbnails?.[0]?.url || '';
            return {
              id: item.id,
              youtubeId: item.id,
              title: item.title,
              artist: item.uploader || item.channel || 'Unknown Artist',
              thumbnail: thumb,
              thumbnailUrl: thumb,
              duration: item.duration,
              source: 'youtube',
            };
          } catch { return null; }
        })
        .filter(Boolean);

      searchCache.set(cacheKey, results);
      resolve(results);
    });

    proc.on('error', (err) => reject(err));
  });
}

async function searchYouTube(query, maxResults = 10) {
  try {
    if (process.env.YOUTUBE_API_KEY) {
      logger.info(`Searching YouTube API for: ${query}`);
      return await searchYouTubeAPI(query, maxResults);
    }
  } catch (err) {
    logger.warn(`YouTube API failed, using yt-dlp: ${err.message}`);
  }
  return searchYouTubeYtDlp(query, maxResults);
}

async function findYouTubeMatch(spotifyTrack) {
  const query = `${spotifyTrack.name} ${spotifyTrack.artists?.[0]?.name} official audio`;
  const results = await searchYouTube(query, 5);
  if (!results.length) return null;

  const scored = results.map((r) => {
    let score = 0;
    const t = r.title.toLowerCase();
    const name = spotifyTrack.name.toLowerCase();
    const artist = spotifyTrack.artists?.[0]?.name?.toLowerCase() || '';
    if (t.includes(name)) score += 30;
    if (t.includes(artist)) score += 20;
    if (t.includes('official')) score += 10;
    if (t.includes('audio')) score += 5;
    if (t.includes('cover')) score -= 10;
    if (t.includes('live')) score -= 5;
    return { ...r, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}

module.exports = { searchYouTube, findYouTubeMatch, searchYouTubeAPI, searchYouTubeYtDlp };
