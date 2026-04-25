const express = require('express');
const router = express.Router();
const logger = require('../lib/logger');

const requireAuth = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Authentication required' });
  req.userId = userId;
  next();
};

// POST /api/history - record a play
router.post('/', requireAuth, async (req, res) => {
  const { trackId } = req.body;
  if (!trackId) return res.status(400).json({ error: 'trackId required' });

  try {
    await req.prisma.history.create({
      data: { userId: req.userId, trackId },
    });
    res.json({ success: true });
  } catch (error) {
    logger.error('Record history error:', error);
    res.status(500).json({ error: 'Failed to record history' });
  }
});

// GET /api/history - get user's play history
router.get('/', requireAuth, async (req, res) => {
  const { limit = '50' } = req.query;

  try {
    const history = await req.prisma.history.findMany({
      where: { userId: req.userId },
      include: { track: true },
      orderBy: { playedAt: 'desc' },
      take: Math.min(parseInt(limit, 10) || 50, 100),
    });
    res.json({ history });
  } catch (error) {
    logger.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;
