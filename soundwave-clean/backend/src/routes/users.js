const express = require('express');
const router = express.Router();
const logger = require('../lib/logger');
const { v4: uuidv4 } = require('uuid');

const requireAuth = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Authentication required' });
  req.userId = userId;
  next();
};

// POST /api/users/guest - create a guest user session
router.post('/guest', async (req, res) => {
  const { name = 'Guest' } = req.body;
  try {
    const guestId = uuidv4();
    const user = await req.prisma.user.create({
      data: {
        id: guestId,
        name,
        email: `guest_${guestId}@soundwave.local`,
      },
    });
    res.status(201).json({ user: { id: user.id, name: user.name } });
  } catch (error) {
    logger.error('Create guest error:', error);
    res.status(500).json({ error: 'Failed to create guest session' });
  }
});

// GET /api/users/me - get current user
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, avatarUrl: true, spotifyId: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/users/liked - like a track
router.post('/liked', requireAuth, async (req, res) => {
  const { trackId } = req.body;
  if (!trackId) return res.status(400).json({ error: 'trackId required' });

  try {
    await req.prisma.likedTrack.upsert({
      where: { userId_trackId: { userId: req.userId, trackId } },
      update: {},
      create: { userId: req.userId, trackId },
    });
    res.json({ liked: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to like track' });
  }
});

// DELETE /api/users/liked/:trackId - unlike a track
router.delete('/liked/:trackId', requireAuth, async (req, res) => {
  try {
    await req.prisma.likedTrack.deleteMany({
      where: { userId: req.userId, trackId: req.params.trackId },
    });
    res.json({ liked: false });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unlike track' });
  }
});

// GET /api/users/liked - get liked tracks
router.get('/liked', requireAuth, async (req, res) => {
  try {
    const liked = await req.prisma.likedTrack.findMany({
      where: { userId: req.userId },
      include: { track: true },
      orderBy: { likedAt: 'desc' },
    });
    res.json({ tracks: liked.map((l) => l.track) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch liked tracks' });
  }
});

module.exports = router;
