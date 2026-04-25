'use client';
import { Play, Plus, MoreHorizontal, Heart } from 'lucide-react';
import { usePlayerStore, useUIStore } from '../../../store';
import { addTrackToPlaylist, getPlaylists, likeTrack } from '../../../lib/api';
import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';

function formatDuration(seconds) {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function TrackCard({ track, queue = [], index = 0, onPlay }) {
  const { currentTrack, isPlaying, setQueue, setIsPlaying } = usePlayerStore();
  const { showNotification } = useUIStore();
  const [showMenu, setShowMenu] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [liked, setLiked] = useState(false);
  const menuRef = useRef(null);

  const isActive = currentTrack?.youtubeId === track.youtubeId;

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  function handlePlay() {
    if (onPlay) return onPlay(track, index);

    if (isActive) {
      setIsPlaying(!isPlaying);
    } else {
      const q = queue.length > 0 ? queue : [track];
      const idx = queue.findIndex((t) => t.youtubeId === track.youtubeId);
      setQueue(q, idx >= 0 ? idx : 0);
      setIsPlaying(true);
    }
  }

  async function handleAddToPlaylist(playlistId) {
    try {
      await addTrackToPlaylist(playlistId, track);
      showNotification('Added to playlist!', 'success');
      setShowMenu(false);
    } catch (err) {
      showNotification(err.response?.data?.error || 'Failed to add track', 'error');
    }
  }

  async function loadPlaylists() {
    try {
      const data = await getPlaylists();
      setPlaylists(data.playlists || []);
    } catch {}
  }

  async function handleLike() {
    try {
      await likeTrack(track.id);
      setLiked(true);
      showNotification('Added to Liked Songs', 'success');
    } catch {}
  }

  return (
    <div
      className={clsx(
        'track-card group flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer relative',
        isActive && 'bg-accent/10'
      )}
      onDoubleClick={handlePlay}
    >
      {/* Index / Play button */}
      <div className="w-8 flex-shrink-0 flex items-center justify-center">
        {isActive && isPlaying ? (
          <div className="flex gap-0.5">
            <div className="eq-bar" style={{ height: '14px' }} />
            <div className="eq-bar" style={{ height: '14px', animationDelay: '0.2s' }} />
            <div className="eq-bar" style={{ height: '14px', animationDelay: '0.4s' }} />
          </div>
        ) : (
          <>
            <span className={clsx(
              'text-sm text-text-muted group-hover:hidden',
              isActive && 'text-accent'
            )}>
              {index + 1}
            </span>
            <button
              onClick={handlePlay}
              className="hidden group-hover:flex items-center justify-center text-text-primary"
            >
              <Play size={16} fill="currentColor" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail */}
      <div className="w-10 h-10 rounded flex-shrink-0 overflow-hidden bg-surface-3">
        {track.thumbnailUrl ? (
          <img
            src={track.thumbnailUrl}
            alt={track.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted text-lg">
            ♪
          </div>
        )}
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <p className={clsx(
          'text-sm font-medium truncate',
          isActive ? 'text-accent' : 'text-text-primary'
        )}>
          {track.title}
        </p>
        <p className="text-xs text-text-secondary truncate">{track.artist}</p>
      </div>

      {/* Album */}
      <p className="hidden md:block text-xs text-text-muted truncate max-w-[140px]">
        {track.album}
      </p>

      {/* Duration + actions */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          onClick={handleLike}
          className={clsx(
            'opacity-0 group-hover:opacity-100 transition-opacity',
            liked ? 'text-pink-accent opacity-100' : 'text-text-muted hover:text-text-primary'
          )}
        >
          <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
        </button>

        <span className="text-xs text-text-muted w-8 text-right">
          {formatDuration(track.duration)}
        </span>

        {/* More menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!showMenu) loadPlaylists();
              setShowMenu(!showMenu);
            }}
            className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary transition-opacity"
          >
            <MoreHorizontal size={16} />
          </button>

          {showMenu && (
            <div className="absolute right-0 bottom-8 w-52 bg-surface-3 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
              <button
                onClick={handlePlay}
                className="w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-4 transition-colors"
              >
                Play now
              </button>
              <div className="border-t border-white/5 my-1" />
              <p className="px-4 py-1.5 text-xs text-text-muted font-semibold uppercase tracking-wider">
                Add to playlist
              </p>
              {playlists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => handleAddToPlaylist(pl.id)}
                  className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-4 transition-colors flex items-center gap-2"
                >
                  <Plus size={12} />
                  <span className="truncate">{pl.name}</span>
                </button>
              ))}
              {playlists.length === 0 && (
                <p className="px-4 py-2 text-xs text-text-muted">No playlists</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
