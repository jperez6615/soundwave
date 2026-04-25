const express = require('express');
const router = express.Router();
const { searchYouTube } = require('../services/youtube');
const logger = require('../lib/logger');

/**
 * GET /api/search?q=query&limit=10
 * Search for music on YouTube
 */
router.get('/', async (req, res) => {
  const { q, limit = '10' } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' });
  }

  const maxResults = Math.min(parseInt(limit, 10) || 10, 25);

  try {
    const results = await searchYouTube(q.trim(), maxResults);
    res.json({ results, query: q, total: results.length });
  } catch (error) {
    logger.error(`Search failed for "${q}": ${error.message}`);
    res.status(500).json({ error: 'Search failed', message: error.message });
  }
});

module.exports = router;
