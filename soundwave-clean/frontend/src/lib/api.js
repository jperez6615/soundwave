import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://soundwave-production-4bb6.up.railway.app';

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 30000,
});

// Add user ID to all requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const userId = localStorage.getItem('soundwave_user_id');
    if (userId) {
      config.headers['x-user-id'] = userId;
    }
  }
  return config;
});

export const searchMusic = (query, limit = 10) =>
  api.get('/search', { params: { q: query, limit } }).then((r) => r.data);

export const getPlaylists = () =>
  api.get('/playlists').then((r) => r.data);

export const getPlaylist = (id) =>
  api.get(`/playlists/${id}`).then((r) => r.data);

export const createPlaylist = (data) =>
  api.post('/playlists', data).then((r) => r.data);

export const updatePlaylist = (id, data) =>
  api.put(`/playlists/${id}`, data).then((r) => r.data);

export const deletePlaylist = (id) =>
  api.delete(`/playlists/${id}`).then((r) => r.data);

export const addTrackToPlaylist = (playlistId, track) =>
  api.post(`/playlists/${playlistId}/tracks`, { track }).then((r) => r.data);

export const removeTrackFromPlaylist = (playlistId, trackId) =>
  api.delete(`/playlists/${playlistId}/tracks/${trackId}`).then((r) => r.data);

export const getLyrics = (title, artist) =>
  api.get('/lyrics', { params: { title, artist } }).then((r) => r.data);

export const getHistory = (limit = 50) =>
  api.get('/history', { params: { limit } }).then((r) => r.data);

export const recordPlay = (trackId) =>
  api.post('/history', { trackId });

export const getLikedTracks = () =>
  api.get('/users/liked').then((r) => r.data);

export const likeTrack = (trackId) =>
  api.post('/users/liked', { trackId }).then((r) => r.data);

export const unlikeTrack = (trackId) =>
  api.delete(`/users/liked/${trackId}`).then((r) => r.data);

export const createGuestUser = (name) =>
  api.post('/users/guest', { name }).then((r) => r.data);

export const getSpotifyLoginUrl = () =>
  api.get('/spotify/login').then((r) => r.data);

export const getSpotifyPlaylists = () =>
  api.get('/spotify/playlists').then((r) => r.data);

export const getStreamUrl = (videoId, quality = '128k', startTime = 0) => {
  const params = new URLSearchParams({ quality });
  if (startTime > 0) params.set('t', String(startTime));
  return `${API_BASE}/api/stream/${videoId}?${params}`;
};
