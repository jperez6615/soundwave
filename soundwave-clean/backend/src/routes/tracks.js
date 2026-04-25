const express = require('express');
const router = express.Router();
const { getVideoInfo } = require('../services/ytdlp');
const logger = require('../lib/logger');

// GET /api/tracks/:youtubeId/info - get track metadata from YouTube
router.get('/:youtubeId/info', async (req, res) => {
  const { youtubeId } = req.params;

  if (!/^[a-zA-Z0-9_-]{11}$/.test(youtubeId)) {
    return res.status(400).json({ error: 'Invalid video ID' });
  }

  try {
    // Check DB first
    const cached = await req.prisma.track.findUnique({
      where: { youtubeId },
    });

    if (cached) return res.json({ track: cached });

    // Fetch from YouTube
    const info = await getVideoInfo(youtubeId);
    res.json({
      track: {
        youtubeId,
        title: info.title,
        artist: info.uploader,
        duration: info.duration,
        thumbnailUrl: info.thumbnail,
      },
    });
  } catch (error) {
    logger.error(`Track info error for ${youtubeId}: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch track info' });
  }
});

module.exports = router;
