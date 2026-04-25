'use client';
import { useState, useEffect } from 'react';
import { Home, Search, Heart, Clock, Plus, Music, Download, ChevronRight } from 'lucide-react';
import { useUIStore, usePlayerStore } from '../../store';
import { getPlaylists, createPlaylist, getSpotifyLoginUrl } from '../../lib/api';
import clsx from 'clsx';

const NAV_ITEMS = [
  { icon: Home, label: 'Home', view: 'home' },
  { icon: Search, label: 'Search', view: 'search' },
  { icon: Heart, label: 'Liked Songs', view: 'liked' },
  { icon: Clock, label: 'History', view: 'history' },
];

export default function Sidebar() {
  const { activeView, setView, showNotification } = useUIStore();
  const { userName } = usePlayerStore();
  const [playlists, setPlaylists] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    loadPlaylists();
  }, []);

  async function loadPlaylists() {
    try {
      const data = await getPlaylists();
      setPlaylists(data.playlists || []);
    } catch (err) {
      console.error('Failed to load playlists:', err);
    }
  }

  async function handleCreatePlaylist() {
    if (!newName.trim()) return;
    try {
      const data = await createPlaylist({ name: newName.trim() });
      setPlaylists((prev) => [data.playlist, ...prev]);
      setNewName('');
      setCreating(false);
      showNotification('Playlist created!', 'success');
    } catch (err) {
      showNotification('Failed to create playlist', 'error');
    }
  }

  async function handleSpotifyImport() {
    try {
      const { url } = await getSpotifyLoginUrl();
      window.location.href = url;
    } catch (err) {
      showNotification('Spotify import not configured', 'error');
    }
  }

  return (
    <div className="w-64 flex flex-col bg-surface-1 border-r border-white/5 h-full">
      {/* Logo */}
      <div className="px-6 py-5 flex items-center gap-2">
        <div className="flex gap-0.5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="eq-bar"
              style={{ height: '18px', animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <span
          className="text-lg font-bold text-text-primary tracking-tight"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          SoundWave
        </span>
      </div>

      {/* Nav Items */}
      <nav className="px-3 space-y-1">
        {NAV_ITEMS.map(({ icon: Icon, label, view }) => (
          <button
            key={view}
            onClick={() => setView(view)}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              activeView === view
                ? 'bg-accent/15 text-accent'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-3'
            )}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>

      <div className="mx-3 my-3 border-t border-white/5" />

      {/* Playlists section */}
      <div className="flex-1 overflow-y-auto px-3">
        <div className="flex items-center justify-between px-3 mb-2">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Playlists
          </span>
          <button
            onClick={() => setCreating(true)}
            className="text-text-muted hover:text-accent transition-colors"
            title="New playlist"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Create playlist input */}
        {creating && (
          <div className="mb-2 px-1">
            <input
              autoFocus
              type="text"
              placeholder="Playlist name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreatePlaylist();
                if (e.key === 'Escape') { setCreating(false); setNewName(''); }
              }}
              onBlur={() => { if (!newName) setCreating(false); }}
              className="w-full bg-surface-3 text-text-primary text-sm px-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-accent placeholder:text-text-muted"
            />
          </div>
        )}

        {/* Playlist list */}
        <div className="space-y-0.5">
          {playlists.map((playlist) => (
            <button
              key={playlist.id}
              onClick={() => setView('playlist', playlist.id)}
              className={clsx(
                'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all',
                activeView === 'playlist' && useUIStore.getState().activePlaylistId === playlist.id
                  ? 'bg-accent/15 text-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-3'
              )}
            >
              <div className="w-8 h-8 rounded bg-surface-3 flex-shrink-0 flex items-center justify-center overflow-hidden">
                {playlist.coverUrl ? (
                  <img src={playlist.coverUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Music size={14} className="text-text-muted" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{playlist.name}</p>
                <p className="text-xs text-text-muted">
                  {playlist._count?.tracks || 0} tracks
                </p>
              </div>
            </button>
          ))}

          {playlists.length === 0 && !creating && (
            <p className="text-xs text-text-muted px-3 py-2">
              No playlists yet. Create one!
            </p>
          )}
        </div>
      </div>

      {/* Bottom: Spotify import + user */}
      <div className="p-3 border-t border-white/5 space-y-2">
        <button
          onClick={handleSpotifyImport}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#1DB954]/10 text-[#1DB954] text-sm font-medium hover:bg-[#1DB954]/20 transition-colors"
        >
          <Download size={16} />
          Import from Spotify
        </button>
        <div className="flex items-center gap-2 px-3 py-1">
          <div className="w-6 h-6 rounded-full bg-accent/30 flex items-center justify-center flex-shrink-0">
            <span className="text-xs text-accent font-semibold">
              {(userName || 'G')[0].toUpperCase()}
            </span>
          </div>
          <span className="text-xs text-text-muted truncate">{userName || 'Guest'}</span>
        </div>
      </div>
    </div>
  );
}
