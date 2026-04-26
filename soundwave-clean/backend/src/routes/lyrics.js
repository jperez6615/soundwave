const express = require('express');
const router = express.Router();
const axios = require('axios');
const NodeCache = require('node-cache');
const logger = require('../lib/logger');

const lyricsCache = new NodeCache({ stdTTL: 3600 });

router.get('/', async (req, res) => {
  const { title, artist } = req.query;
  if (!title) return res.status(400).json({ error: 'Title required' });

  const cacheKey = `lrc_${title}_${artist}`.toLowerCase().replace(/\s+/g, '_').slice(0, 100);
  const cached = lyricsCache.get(cacheKey);
  if (cached) return res.json(cached);

  let syncedLyrics = null;
  let plainLyrics = null;

  // Try lrclib.net - returns synced LRC lyrics with timestamps
  try {
    const r = await axios.get('https://lrclib.net/api/search', {
      params: { track_name: title, artist_name: artist || '' },
      timeout: 8000,
    });

    const hits = r.data || [];
    // Prefer synced lyrics
    const synced = hits.find(h => h.syncedLyrics);
    const plain = hits.find(h => h.plainLyrics);

    if (synced?.syncedLyrics) syncedLyrics = synced.syncedLyrics;
    if (plain?.plainLyrics) plainLyrics = plain.plainLyrics;
  } catch (e) {
    logger.warn(`lrclib failed: ${e.message}`);
  }

  if (syncedLyrics) {
    // Parse LRC format: [mm:ss.xx] lyric line
    const lines = syncedLyrics.split('\n')
      .map(line => {
        const match = line.match(/\[(\d+):(\d+\.\d+)\](.*)/);
        if (!match) return null;
        const minutes = parseInt(match[1]);
        const seconds = parseFloat(match[2]);
        return {
          time: minutes * 60 + seconds,
          text: match[3].trim(),
        };
      })
      .filter(l => l && l.text);

    const result = { found: true, title, artist, synced: true, lines, lyrics: plainLyrics };
    lyricsCache.set(cacheKey, result);
    return res.json(result);
  }

  if (plainLyrics) {
    const result = { found: true, title, artist, synced: false, lyrics: plainLyrics, lines: [] };
    lyricsCache.set(cacheKey, result);
    return res.json(result);
  }

  // Fallback: lyrics.ovh
  if (artist) {
    try {
      const r = await axios.get(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
        { timeout: 5000 }
      );
      if (r.data?.lyrics) {
        const result = { found: true, title, artist, synced: false, lyrics: r.data.lyrics, lines: [] };
        lyricsCache.set(cacheKey, result);
        return res.json(result);
      }
    } catch {}
  }

  res.json({ found: false, message: 'Lyrics not found' });
});

module.exports = router;
