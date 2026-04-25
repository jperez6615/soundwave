'use client';
import { Play, Plus, Heart, Download, Pause } from 'lucide-react';
import { usePlayerStore, useUIStore } from '../../store';
import { addTrackToPlaylist, getPlaylists, likeTrack, unlikeTrack, getStreamUrl } from '../../lib/api';
import { useState } from 'react';
import clsx from 'clsx';

function formatDuration(seconds) {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://soundwave-production-4bb6.up.railway.app';

export default function TrackCard({ track, index, queue = [], showIndex = true }) {
  const { currentTrack, isPlaying, setQueue, setIsPlaying } = usePlayerStore();
  const { showNotification } = useUIStore();
  const [liked, setLiked] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [playlists, setPlaylists] = useState([]);

  const isCurrentTrack = currentTrack?.youtubeId === track.youtubeId;

  const handlePlay = () => {
    if (isCurrentTrack) {
      setIsPlaying(!isPlaying);
    } else {
      const startIndex = queue.findIndex(t => t.youtubeId === track.youtubeId);
      setQueue(queue.length > 0 ? queue : [track], startIndex >= 0 ? startIndex : 0);
      setIsPlaying(true);
    }
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    try {
      if (liked) {
        await unlikeTrack(track.id);
        setLiked(false);
      } else {
        await likeTrack(track.id);
        setLiked(true);
      }
    } catch {
      showNotification('Failed to update like', 'error');
    }
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    if (downloading) return;
    setDownloading(true);
    showNotification('Preparing download...', 'info');

    try {
      const title = encodeURIComponent(track.title + ' - ' + track.artist);
      const url = `${API_BASE}/api/download/${track.youtubeId}?title=${title}&quality=192k`;
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${track.title} - ${track.artist}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showNotification('Download started! 🎵', 'success');
    } catch {
      showNotification('Download failed', 'error');
    } finally {
      setTimeout(() => setDownloading(false), 3000);
    }
  };

  const handleAddToPlaylist = async (e) => {
    e.stopPropagation();
    try {
      const data = await getPlaylists();
      setPlaylists(data.playlists || []);
      setShowPlaylists(true);
    } catch {
      showNotification('Failed to load playlists', 'error');
    }
  };

  const addToPlaylist = async (playlistId) => {
    try {
      await addTrackToPlaylist(playlistId, track);
      showNotification('Added to playlist!', 'success');
      setShowPlaylists(false);
    } catch (err) {
      showNotification(err.response?.data?.error || 'Failed to add', 'error');
    }
  };

  return (
    <>
      <div
        className={clsx(
          'group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all',
          isCurrentTrack ? 'bg-accent/10' : 'hover:bg-surface-3'
        )}
        onClick={handlePlay}
      >
        {/* Index / play button */}
        {showIndex && (
          <div className="w-6 text-center flex-shrink-0">
            {isCurrentTrack && isPlaying ? (
              <div className="flex gap-0.5 justify-center">
                <div className="eq-bar" style={{ height: '12px' }} />
                <div className="eq-bar" style={{ height: '12px', animationDelay: '0.2s' }} />
                <div className="eq-bar" style={{ height: '12px', animationDelay: '0.4s' }} />
              </div>
            ) : (
              <>
                <span className="text-text-muted text-sm group-hover:hidden">{index + 1}</span>
                <Play className="hidden group-hover:block text-text-primary mx-auto" size={14} fill="currentColor" />
              </>
            )}
          </div>
        )}

        {/* Thumbnail */}
        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-surface-3 relative">
          {track.thumbnailUrl || track.thumbnail ? (
            <img
              src={track.thumbnailUrl || track.thumbnail}
              alt={track.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted">♪</div>
          )}
          {/* Play overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
            {isCurrentTrack && isPlaying
              ? <Pause size={14} fill="white" className="text-white" />
              : <Play size={14} fill="white" className="text-white ml-0.5" />
            }
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className={clsx('text-sm font-medium truncate', isCurrentTrack ? 'text-accent' : 'text-text-primary')}>
            {track.title}
          </p>
          <p className="text-text-secondary text-xs truncate">{track.artist}</p>
        </div>

        {/* Duration */}
        {track.duration && (
          <span className="text-text-muted text-xs flex-shrink-0 hidden md:block">
            {formatDuration(track.duration)}
          </span>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={handleLike}
            className={clsx('p-1.5 rounded-lg transition-colors', liked ? 'text-pink-400' : 'text-text-muted hover:text-text-primary')}
            title="Like"
          >
            <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={handleDownload}
            className={clsx('p-1.5 rounded-lg transition-colors', downloading ? 'text-accent animate-pulse' : 'text-text-muted hover:text-accent')}
            title="Download MP3"
          >
            <Download size={15} />
          </button>
          <button
            onClick={handleAddToPlaylist}
            className="p-1.5 rounded-lg text-text-muted hover:text-accent transition-colors"
            title="Add to playlist"
          >
            <Plus size={15} />
          </button>
        </div>
      </div>

      {/* Playlist picker modal */}
      {showPlaylists && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4"
          onClick={() => setShowPlaylists(false)}
        >
          <div className="bg-surface-2 rounded-2xl p-4 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-text-primary font-semibold mb-3">Add to playlist</h3>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {playlists.length === 0 && (
                <p className="text-text-muted text-sm text-center py-4">No playlists yet</p>
              )}
              {playlists.map(pl => (
                <button
                  key={pl.id}
                  onClick={() => addToPlaylist(pl.id)}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-surface-3 text-text-primary text-sm transition-colors"
                >
                  {pl.name}
                  <span className="text-text-muted ml-2 text-xs">{pl._count?.tracks || 0} tracks</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowPlaylists(false)} className="w-full mt-3 py-2 text-text-muted text-sm">Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}
