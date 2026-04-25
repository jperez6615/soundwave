const express = require('express');
const router = express.Router();
const logger = require('../lib/logger');

// Simple auth middleware - in production use JWT
const requireAuth = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.userId = userId;
  next();
};

// GET /api/playlists - get user's playlists
router.get('/', requireAuth, async (req, res) => {
  try {
    const playlists = await req.prisma.playlist.findMany({
      where: { userId: req.userId },
      include: {
        tracks: {
          include: { track: true },
          orderBy: { position: 'asc' },
          take: 4, // For cover thumbnails
        },
        _count: { select: { tracks: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ playlists });
  } catch (error) {
    logger.error('Get playlists error:', error);
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});

// GET /api/playlists/:id - get single playlist with all tracks
router.get('/:id', async (req, res) => {
  try {
    const playlist = await req.prisma.playlist.findUnique({
      where: { id: req.params.id },
      include: {
        tracks: {
          include: { track: true },
          orderBy: { position: 'asc' },
        },
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    res.json({ playlist });
  } catch (error) {
    logger.error('Get playlist error:', error);
    res.status(500).json({ error: 'Failed to fetch playlist' });
  }
});

// POST /api/playlists - create playlist
router.post('/', requireAuth, async (req, res) => {
  const { name, description, isPublic = false } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Playlist name is required' });
  }

  try {
    const playlist = await req.prisma.playlist.create({
      data: {
        name: name.trim(),
        description: description?.trim(),
        isPublic,
        userId: req.userId,
      },
    });
    res.status(201).json({ playlist });
  } catch (error) {
    logger.error('Create playlist error:', error);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

// PUT /api/playlists/:id - update playlist
router.put('/:id', requireAuth, async (req, res) => {
  const { name, description, isPublic, coverUrl } = req.body;

  try {
    const existing = await req.prisma.playlist.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const updated = await req.prisma.playlist.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description }),
        ...(isPublic !== undefined && { isPublic }),
        ...(coverUrl && { coverUrl }),
      },
    });

    res.json({ playlist: updated });
  } catch (error) {
    logger.error('Update playlist error:', error);
    res.status(500).json({ error: 'Failed to update playlist' });
  }
});

// DELETE /api/playlists/:id - delete playlist
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await req.prisma.playlist.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    await req.prisma.playlist.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    logger.error('Delete playlist error:', error);
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

// POST /api/playlists/:id/tracks - add track to playlist
router.post('/:id/tracks', requireAuth, async (req, res) => {
  const { track } = req.body;
  // track: { youtubeId, title, artist, album, duration, thumbnailUrl }

  if (!track?.youtubeId) {
    return res.status(400).json({ error: 'Track YouTube ID is required' });
  }

  try {
    const playlist = await req.prisma.playlist.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    // Upsert track in tracks table
    const dbTrack = await req.prisma.track.upsert({
      where: { youtubeId: track.youtubeId },
      update: {},
      create: {
        youtubeId: track.youtubeId,
        title: track.title || 'Unknown Title',
        artist: track.artist || 'Unknown Artist',
        album: track.album,
        duration: track.duration,
        thumbnailUrl: track.thumbnailUrl,
      },
    });

    // Get current max position
    const maxPos = await req.prisma.playlistTrack.aggregate({
      where: { playlistId: req.params.id },
      _max: { position: true },
    });

    const position = (maxPos._max.position ?? -1) + 1;

    // Add to playlist (ignore if already exists)
    try {
      await req.prisma.playlistTrack.create({
        data: {
          playlistId: req.params.id,
          trackId: dbTrack.id,
          position,
        },
      });
    } catch (e) {
      if (e.code === 'P2002') {
        return res.status(409).json({ error: 'Track already in playlist' });
      }
      throw e;
    }

    // Update playlist updatedAt
    await req.prisma.playlist.update({
      where: { id: req.params.id },
      data: { updatedAt: new Date() },
    });

    res.status(201).json({ success: true, track: dbTrack });
  } catch (error) {
    logger.error('Add track error:', error);
    res.status(500).json({ error: 'Failed to add track' });
  }
});

// DELETE /api/playlists/:id/tracks/:trackId - remove track from playlist
router.delete('/:id/tracks/:trackId', requireAuth, async (req, res) => {
  try {
    const playlist = await req.prisma.playlist.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    await req.prisma.playlistTrack.deleteMany({
      where: { playlistId: req.params.id, trackId: req.params.trackId },
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Remove track error:', error);
    res.status(500).json({ error: 'Failed to remove track' });
  }
});

module.exports = router;
