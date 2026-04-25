'use client';
import { useState, useEffect } from 'react';
import { Play, Shuffle, MoreHorizontal, Trash2, Music, ArrowLeft, Edit3, Check, X } from 'lucide-react';
import { useUIStore, usePlayerStore } from '../../store';
import { getPlaylist, removeTrackFromPlaylist, deletePlaylist, updatePlaylist } from '../../lib/api';
import TrackCard from '../ui/TrackCard';

export default function PlaylistView() {
  const { activePlaylistId, setView, showNotification } = useUIStore();
  const { setQueue, setIsPlaying, toggleShuffle, isShuffle } = usePlayerStore();

  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  useEffect(() => {
    if (!activePlaylistId) return;
    setLoading(true);

    getPlaylist(activePlaylistId)
      .then((d) => {
        setPlaylist(d.playlist);
        setNameInput(d.playlist.name);
      })
      .catch(() => showNotification('Failed to load playlist', 'error'))
      .finally(() => setLoading(false));
  }, [activePlaylistId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="eq-bar" style={{ height: '24px', animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="px-6 py-8 text-center">
        <p className="text-text-secondary">Playlist not found</p>
        <button onClick={() => setView('home')} className="text-accent text-sm mt-2 hover:underline">
          Go home
        </button>
      </div>
    );
  }

  const tracks = playlist.tracks?.map((pt) => pt.track) || [];

  async function handlePlay(index = 0) {
    if (!tracks.length) return;
    setQueue(tracks, index);
    setIsPlaying(true);
  }

  async function handleShuffle() {
    if (!tracks.length) return;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    setQueue(shuffled, 0);
    setIsPlaying(true);
  }

  async function handleRemoveTrack(trackId) {
    try {
      await removeTrackFromPlaylist(playlist.id, trackId);
      setPlaylist((prev) => ({
        ...prev,
        tracks: prev.tracks.filter((pt) => pt.trackId !== trackId && pt.track?.id !== trackId),
      }));
      showNotification('Track removed');
    } catch {
      showNotification('Failed to remove track', 'error');
    }
  }

  async function handleRename() {
    if (!nameInput.trim() || nameInput === playlist.name) {
      setEditingName(false);
      return;
    }
    try {
      await updatePlaylist(playlist.id, { name: nameInput });
      setPlaylist((prev) => ({ ...prev, name: nameInput }));
      setEditingName(false);
      showNotification('Playlist renamed');
    } catch {
      showNotification('Failed to rename', 'error');
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${playlist.name}"?`)) return;
    try {
      await deletePlaylist(playlist.id);
      showNotification('Playlist deleted');
      setView('home');
    } catch {
      showNotification('Failed to delete', 'error');
    }
  }

  const totalDuration = tracks.reduce((acc, t) => acc + (t?.duration || 0), 0);
  const durationStr = totalDuration > 3600
    ? `${Math.floor(totalDuration / 3600)}h ${Math.floor((totalDuration % 3600) / 60)}m`
    : `${Math.floor(totalDuration / 60)} min`;

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="px-6 py-8 bg-gradient-to-b from-accent/10 to-transparent">
        <button
          onClick={() => setView('home')}
          className="flex items-center gap-1 text-text-muted text-sm mb-6 hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="flex items-end gap-6">
          {/* Playlist cover */}
          <div className="w-36 h-36 md:w-48 md:h-48 rounded-2xl bg-surface-3 flex-shrink-0 flex items-center justify-center overflow-hidden shadow-2xl">
            {playlist.coverUrl ? (
              <img src={playlist.coverUrl} alt="" className="w-full h-full object-cover" />
            ) : tracks[0]?.thumbnailUrl ? (
              <img src={tracks[0].thumbnailUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Music size={48} className="text-text-muted" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-2">Playlist</p>

            {editingName ? (
              <div className="flex items-center gap-2 mb-2">
                <input
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingName(false); }}
                  className="bg-surface-3 text-text-primary text-xl md:text-3xl font-bold px-2 py-1 rounded-lg outline-none focus:ring-1 focus:ring-accent"
                />
                <button onClick={handleRename} className="text-accent hover:text-accent-bright"><Check size={20} /></button>
                <button onClick={() => setEditingName(false)} className="text-text-muted hover:text-text-primary"><X size={20} /></button>
              </div>
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="group flex items-center gap-2 mb-2"
              >
                <h1
                  className="text-2xl md:text-4xl font-bold text-text-primary text-left"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {playlist.name}
                </h1>
                <Edit3 size={16} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}

            <p className="text-text-muted text-sm">
              {tracks.length} songs
              {totalDuration > 0 && ` • ${durationStr}`}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={() => handlePlay(0)}
            disabled={!tracks.length}
            className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-full font-semibold text-sm hover:bg-accent-bright transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-accent/20"
          >
            <Play size={18} fill="white" />
            Play all
          </button>

          <button
            onClick={handleShuffle}
            disabled={!tracks.length}
            className="flex items-center gap-2 px-4 py-3 bg-surface-3 text-text-primary rounded-full text-sm hover:bg-surface-4 transition-colors disabled:opacity-40"
          >
            <Shuffle size={16} />
            Shuffle
          </button>

          <button
            onClick={handleDelete}
            className="ml-auto p-2 text-text-muted hover:text-red-400 transition-colors rounded-lg hover:bg-red-900/20"
            title="Delete playlist"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Track list */}
      <div className="px-6">
        {tracks.length === 0 ? (
          <div className="text-center py-12">
            <Music size={40} className="text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary text-sm">This playlist is empty</p>
            <p className="text-text-muted text-xs mt-1">
              Search for songs and add them here
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Header row */}
            <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-3 py-2 text-xs text-text-muted uppercase tracking-wider border-b border-white/5 mb-2">
              <span className="w-6 text-center">#</span>
              <span>Title</span>
              <span>Duration</span>
            </div>

            {tracks.map((track, i) => (
              track && (
                <TrackCard
                  key={track.id || i}
                  track={track}
                  index={i}
                  onPlay={() => handlePlay(i)}
                  showIndex
                  onRemove={() => handleRemoveTrack(track.id)}
                />
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
