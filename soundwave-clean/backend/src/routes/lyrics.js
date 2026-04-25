const express = require('express');
const router = express.Router();
const axios = require('axios');
const NodeCache = require('node-cache');
const logger = require('../lib/logger');

const lyricsCache = new NodeCache({ stdTTL: 3600 });

router.get('/', async (req, res) => {
  const { title, artist } = req.query;
  if (!title) return res.status(400).json({ error: 'Title required' });

  const cacheKey = `lyrics_${title}_${artist}`.toLowerCase().replace(/\s+/g, '_').slice(0, 100);
  const cached = lyricsCache.get(cacheKey);
  if (cached) return res.json(cached);

  let lyrics = null;

  // Try lrclib.net (free, no key, fast)
  try {
    const r = await axios.get('https://lrclib.net/api/search', {
      params: { track_name: title, artist_name: artist || '' },
      timeout: 6000,
    });
    const hit = r.data?.[0];
    if (hit?.plainLyrics) {
      lyrics = hit.plainLyrics;
    }
  } catch (e) {
    logger.warn(`lrclib failed: ${e.message}`);
  }

  // Try lyrics.ovh as fallback
  if (!lyrics && artist) {
    try {
      const r = await axios.get(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
        { timeout: 6000 }
      );
      if (r.data?.lyrics) lyrics = r.data.lyrics;
    } catch (e) {
      logger.warn(`lyrics.ovh failed: ${e.message}`);
    }
  }

  if (lyrics) {
    const result = { found: true, title, artist, lyrics: lyrics.trim(), synced: false };
    lyricsCache.set(cacheKey, result);
    return res.json(result);
  }

  res.json({ found: false, message: 'Lyrics not found' });
});

module.exports = router;
