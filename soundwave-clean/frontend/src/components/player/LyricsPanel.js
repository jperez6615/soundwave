'use client';
import { useMemo } from 'react';
import { X } from 'lucide-react';
import { usePlayerStore } from '../../store';

export default function LyricsPanel({ lyrics, currentTime }) {
  const { toggleLyrics, currentTrack } = usePlayerStore();

  const lines = useMemo(() => {
    if (!lyrics) return [];
    return lyrics.split('\n').filter((l) => l.trim());
  }, [lyrics]);

  return (
    <div className="glass border-t border-white/5 max-h-48 overflow-y-auto">
      <div className="px-6 py-3 flex items-center justify-between sticky top-0 bg-surface-1/80 backdrop-blur-sm">
        <div>
          <p className="text-xs font-semibold text-accent uppercase tracking-widest">Lyrics</p>
          <p className="text-xs text-text-muted">
            {currentTrack?.title} — {currentTrack?.artist}
          </p>
        </div>
        <button
          onClick={toggleLyrics}
          className="text-text-muted hover:text-text-primary"
        >
          <X size={14} />
        </button>
      </div>
      <div className="px-6 pb-4 space-y-1">
        {lines.map((line, i) => (
          <p
            key={i}
            className="text-sm text-text-secondary leading-relaxed lyric-line"
          >
            {line || '\u00A0'}
          </p>
        ))}
      </div>
    </div>
  );
}
