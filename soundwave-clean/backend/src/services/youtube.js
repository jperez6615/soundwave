const axios = require('axios');
const { spawn } = require('child_process');
const NodeCache = require('node-cache');
const logger = require('../lib/logger');

const searchCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

/**
 * Search YouTube using official Data API v3
 */
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
      videoCategoryId: '10', // Music category
      maxResults,
      key: apiKey,
      fields: 'items(id/videoId,snippet(title,channelTitle,thumbnails/medium/url,publishedAt))',
    },
    timeout: 10000,
  });

  const results = response.data.items.map((item) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    artist: item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails?.medium?.url,
    publishedAt: item.snippet.publishedAt,
    source: 'youtube',
  }));

  searchCache.set(cacheKey, results);
  return results;
}

/**
 * Search YouTube using yt-dlp as fallback (no API key needed)
 */
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
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (code !== 0 && !stdout) {
        return reject(new Error(`yt-dlp search failed: ${stderr}`));
      }

      const results = stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          try {
            const item = JSON.parse(line);
            return {
              id: item.id,
              title: item.title,
              artist: item.uploader || item.channel || 'Unknown Artist',
              thumbnail: item.thumbnail,
              duration: item.duration,
              viewCount: item.view_count,
              source: 'youtube',
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      searchCache.set(cacheKey, results);
      resolve(results);
    });

    proc.on('error', (err) => reject(err));
  });
}

/**
 * Smart search: tries API first, falls back to yt-dlp
 */
async function searchYouTube(query, maxResults = 10) {
  try {
    if (process.env.YOUTUBE_API_KEY) {
      return await searchYouTubeAPI(query, maxResults);
    }
  } catch (err) {
    logger.warn(`YouTube API search failed, falling back to yt-dlp: ${err.message}`);
  }

  return searchYouTubeYtDlp(query, maxResults);
}

/**
 * Find best YouTube match for a Spotify track
 */
async function findYouTubeMatch(spotifyTrack) {
  const query = `${spotifyTrack.name} ${spotifyTrack.artists?.[0]?.name} official audio`;
  const results = await searchYouTube(query, 5);
  
  if (!results.length) return null;
  
  // Score results by title similarity and duration match
  const scored = results.map((result) => {
    let score = 0;
    const titleLower = result.title.toLowerCase();
    const trackName = spotifyTrack.name.toLowerCase();
    const artistName = spotifyTrack.artists?.[0]?.name?.toLowerCase() || '';

    if (titleLower.includes(trackName)) score += 30;
    if (titleLower.includes(artistName)) score += 20;
    if (titleLower.includes('official')) score += 10;
    if (titleLower.includes('audio')) score += 5;
    if (titleLower.includes('lyrics')) score -= 5;
    if (titleLower.includes('cover')) score -= 10;
    if (titleLower.includes('live')) score -= 5;

    // Duration match (if available)
    if (result.duration && spotifyTrack.duration_ms) {
      const ytSec = result.duration;
      const spSec = Math.floor(spotifyTrack.duration_ms / 1000);
      const diff = Math.abs(ytSec - spSec);
      if (diff < 5) score += 20;
      else if (diff < 15) score += 10;
      else if (diff > 60) score -= 10;
    }

    return { ...result, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}

module.exports = { searchYouTube, findYouTubeMatch, searchYouTubeAPI, searchYouTubeYtDlp };
