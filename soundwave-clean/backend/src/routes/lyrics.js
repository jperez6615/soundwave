const express = require('express');
const router = express.Router();
const axios = require('axios');
const NodeCache = require('node-cache');
const logger = require('../lib/logger');

const lyricsCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

/**
 * GET /api/lyrics?title=&artist=
 */
router.get('/', async (req, res) => {
  const { title, artist } = req.query;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const cacheKey = `lyrics_${title}_${artist}`.toLowerCase().replace(/\s+/g, '_');
  const cached = lyricsCache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    // Try Lyrics.ovh (free, no key needed)
    const query = `${artist || ''} ${title}`.trim();
    const encoded = encodeURIComponent(query);
    
    let lyrics = null;

    // Try lyrics.ovh
    try {
      const ovhRes = await axios.get(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(artist || 'unknown')}/${encodeURIComponent(title)}`,
        { timeout: 5000 }
      );
      if (ovhRes.data?.lyrics) {
        lyrics = ovhRes.data.lyrics;
      }
    } catch (e) {
      logger.warn(`lyrics.ovh failed: ${e.message}`);
    }

    // Try Genius if API key is available
    if (!lyrics && process.env.GENIUS_API_KEY) {
      try {
        const searchRes = await axios.get('https://api.genius.com/search', {
          headers: { Authorization: `Bearer ${process.env.GENIUS_API_KEY}` },
          params: { q: query },
          timeout: 5000,
        });

        const hit = searchRes.data?.response?.hits?.[0]?.result;
        if (hit) {
          lyrics = null; // Genius requires scraping for full lyrics
          // Return song info at least
          const result = {
            found: true,
            title: hit.title,
            artist: hit.primary_artist?.name,
            geniusUrl: hit.url,
            thumbnail: hit.song_art_image_thumbnail_url,
            lyrics: null,
            message: 'Full lyrics available at Genius.com',
          };
          lyricsCache.set(cacheKey, result);
          return res.json(result);
        }
      } catch (e) {
        logger.warn(`Genius API failed: ${e.message}`);
      }
    }

    if (lyrics) {
      const result = {
        found: true,
        title,
        artist,
        lyrics: lyrics.trim(),
        synced: false,
      };
      lyricsCache.set(cacheKey, result);
      return res.json(result);
    }

    res.json({ found: false, message: 'Lyrics not found' });
  } catch (error) {
    logger.error('Lyrics fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch lyrics' });
  }
});

module.exports = router;
