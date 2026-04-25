'use client';
import { useState, useEffect } from 'react';
import { Heart, Play, Shuffle } from 'lucide-react';
import { getLikedTracks } from '../../lib/api';
import { usePlayerStore } from '../../store';
import TrackCard from '../ui/TrackCard';

export default function LikedView() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setQueue, setIsPlaying } = usePlayerStore();

  useEffect(() => {
    getLikedTracks()
      .then((data) => setTracks(data.tracks || []))
      .catch(() => setTracks([]))
      .finally(() => setLoading(false));
  }, []);

  function playAll(shuffle = false) {
    if (!tracks.length) return;
    const q = shuffle ? [...tracks].sort(() => Math.random() - 0.5) : tracks;
    setQueue(q, 0);
    setIsPlaying(true);
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-end gap-6 mb-8">
        <div className="w-36 h-36 rounded-2xl bg-gradient-to-br from-pink-accent/30 to-accent/30 flex items-center justify-center flex-shrink-0">
          <Heart size={56} className="text-pink-accent" fill="currentColor" />
        </div>
        <div>
          <p className="text-xs text-text-muted uppercase tracking-widest mb-1">Playlist</p>
          <h1 className="text-4xl font-bold text-text-primary mb-2"
            style={{ fontFamily: "'Playfair Display', serif" }}>
            Liked Songs
          </h1>
          <p className="text-text-secondary text-sm">{tracks.length} tracks</p>

          {tracks.length > 0 && (
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => playAll(false)}
                className="flex items-center gap-2 bg-accent text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-accent-dim transition-colors"
              >
                <Play size={16} fill="white" />
                Play all
              </button>
              <button
                onClick={() => playAll(true)}
                className="flex items-center gap-2 bg-surface-3 text-text-secondary px-5 py-2.5 rounded-full text-sm font-medium hover:bg-surface-4 transition-colors"
              >
                <Shuffle size={16} />
                Shuffle
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Track list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-surface-2 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : tracks.length === 0 ? (
        <div className="text-center py-20">
          <Heart size={48} className="text-text-muted mx-auto mb-4" />
          <p className="text-text-secondary text-lg">No liked songs yet</p>
          <p className="text-text-muted text-sm mt-1">
            Click the heart icon on any track to save it here
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {tracks.map((track, i) => (
            <TrackCard key={track.id} track={track} queue={tracks} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
