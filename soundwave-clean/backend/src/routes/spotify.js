const express = require('express');
const router = express.Router();
const SpotifyWebApi = require('spotify-web-api-node');
const { findYouTubeMatch } = require('../services/youtube');
const logger = require('../lib/logger');

function getSpotifyApi() {
  return new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI,
  });
}

// GET /api/spotify/login - redirect to Spotify OAuth
router.get('/login', (req, res) => {
  if (!process.env.SPOTIFY_CLIENT_ID) {
    return res.status(503).json({ error: 'Spotify integration not configured' });
  }

  const spotifyApi = getSpotifyApi();
  const scopes = [
    'user-read-private',
    'user-read-email',
    'playlist-read-private',
    'playlist-read-collaborative',
    'user-library-read',
    'user-top-read',
  ];

  const state = Math.random().toString(36).substring(7);
  const authUrl = spotifyApi.createAuthorizeURL(scopes, state);
  res.json({ url: authUrl });
});

// GET /api/spotify/callback - handle OAuth callback
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(`${process.env.FRONTEND_URL}?spotify_error=${error}`);
  }

  try {
    const spotifyApi = getSpotifyApi();
    const data = await spotifyApi.authorizationCodeGrant(code);
    
    const { access_token, refresh_token, expires_in } = data.body;
    spotifyApi.setAccessToken(access_token);

    const me = await spotifyApi.getMe();
    const spotifyUser = me.body;

    // Upsert user in database
    const user = await req.prisma.user.upsert({
      where: { spotifyId: spotifyUser.id },
      update: {
        name: spotifyUser.display_name,
        email: spotifyUser.email,
        avatarUrl: spotifyUser.images?.[0]?.url,
        spotifyToken: access_token,
        spotifyRefresh: refresh_token,
      },
      create: {
        spotifyId: spotifyUser.id,
        name: spotifyUser.display_name || 'Spotify User',
        email: spotifyUser.email,
        avatarUrl: spotifyUser.images?.[0]?.url,
        spotifyToken: access_token,
        spotifyRefresh: refresh_token,
      },
    });

    // Redirect to frontend with user ID
    res.redirect(`${process.env.FRONTEND_URL}/callback?userId=${user.id}&name=${encodeURIComponent(user.name)}`);
  } catch (err) {
    logger.error('Spotify callback error:', err);
    res.redirect(`${process.env.FRONTEND_URL}?spotify_error=auth_failed`);
  }
});

// GET /api/spotify/playlists - get user's Spotify playlists
router.get('/playlists', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const user = await req.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.spotifyToken) {
      return res.status(401).json({ error: 'No Spotify token' });
    }

    const spotifyApi = getSpotifyApi();
    spotifyApi.setAccessToken(user.spotifyToken);

    const data = await spotifyApi.getUserPlaylists({ limit: 50 });
    const playlists = data.body.items.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      trackCount: p.tracks?.total || 0,
      coverUrl: p.images?.[0]?.url,
      owner: p.owner?.display_name,
    }));

    res.json({ playlists });
  } catch (err) {
    logger.error('Get Spotify playlists error:', err);
    res.status(500).json({ error: 'Failed to fetch Spotify playlists' });
  }
});

// POST /api/spotify/import/:spotifyPlaylistId - import Spotify playlist to local
router.post('/import/:spotifyPlaylistId', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const user = await req.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.spotifyToken) {
      return res.status(401).json({ error: 'No Spotify token' });
    }

    const spotifyApi = getSpotifyApi();
    spotifyApi.setAccessToken(user.spotifyToken);

    // Get Spotify playlist details
    const playlistData = await spotifyApi.getPlaylist(req.params.spotifyPlaylistId);
    const spPlaylist = playlistData.body;

    // Create local playlist
    const localPlaylist = await req.prisma.playlist.create({
      data: {
        name: spPlaylist.name,
        description: spPlaylist.description || '',
        coverUrl: spPlaylist.images?.[0]?.url,
        spotifyId: spPlaylist.id,
        userId,
      },
    });

    // Stream response for progress updates
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Transfer-Encoding', 'chunked');

    const tracks = spPlaylist.tracks.items
      .filter((item) => item.track && !item.track.is_local)
      .map((item) => item.track);

    let matched = 0;
    let failed = 0;

    for (let i = 0; i < tracks.length; i++) {
      const spTrack = tracks[i];

      res.write(JSON.stringify({
        type: 'progress',
        current: i + 1,
        total: tracks.length,
        track: spTrack.name,
      }) + '\n');

      try {
        const ytMatch = await findYouTubeMatch(spTrack);
        
        if (ytMatch) {
          const dbTrack = await req.prisma.track.upsert({
            where: { youtubeId: ytMatch.id },
            update: {},
            create: {
              youtubeId: ytMatch.id,
              title: spTrack.name,
              artist: spTrack.artists?.map((a) => a.name).join(', ') || ytMatch.artist,
              album: spTrack.album?.name,
              duration: Math.floor(spTrack.duration_ms / 1000),
              thumbnailUrl: ytMatch.thumbnail || spTrack.album?.images?.[0]?.url,
              spotifyId: spTrack.id,
            },
          });

          await req.prisma.playlistTrack.upsert({
            where: { playlistId_trackId: { playlistId: localPlaylist.id, trackId: dbTrack.id } },
            update: {},
            create: { playlistId: localPlaylist.id, trackId: dbTrack.id, position: i },
          });

          matched++;
        } else {
          failed++;
        }
      } catch (err) {
        logger.warn(`Failed to match track "${spTrack.name}": ${err.message}`);
        failed++;
      }

      // Small delay to avoid rate limiting
      if (i < tracks.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    res.write(JSON.stringify({
      type: 'complete',
      playlistId: localPlaylist.id,
      matched,
      failed,
      total: tracks.length,
    }) + '\n');

    res.end();
  } catch (err) {
    logger.error('Import Spotify playlist error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Import failed', message: err.message });
    }
  }
});

module.exports = router;
