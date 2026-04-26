'use client';
import { useEffect, useRef, useMemo } from 'react';
import { X } from 'lucide-react';
import { usePlayerStore } from '../../store';
import clsx from 'clsx';

export default function LyricsPanel({ lyrics, lines = [], synced = false, currentTime }) {
  const { toggleLyrics, currentTrack } = usePlayerStore();
  const containerRef = useRef(null);
  const activeRef = useRef(null);

  // Find active line based on currentTime
  const activeIndex = useMemo(() => {
    if (!synced || !lines.length) return -1;
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].time <= currentTime) idx = i;
      else break;
    }
    return idx;
  }, [lines, currentTime, synced]);

  // Auto-scroll to active line
  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex]);

  const plainLines = useMemo(() => {
    if (!lyrics) return [];
    return lyrics.split('\n').filter(l => l.trim());
  }, [lyrics]);

  const displayLines = synced && lines.length > 0 ? lines : plainLines.map(text => ({ text, time: -1 }));

  return (
    <div className="glass border-t border-white/5" style={{ maxHeight: '220px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-2 flex-shrink-0 border-b border-white/5">
        <div>
          <span className="text-xs font-semibold text-accent uppercase tracking-widest">
            {synced ? '♪ Synced Lyrics' : 'Lyrics'}
          </span>
          <span className="text-xs text-text-muted ml-2">
            {currentTrack?.title}
          </span>
        </div>
        <button onClick={toggleLyrics} className="text-text-muted hover:text-text-primary transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Scrollable lyrics */}
      <div
        ref={containerRef}
        className="overflow-y-auto flex-1 px-6 py-3 space-y-1"
        style={{ scrollBehavior: 'smooth' }}
      >
        {displayLines.map((line, i) => {
          const isActive = synced ? i === activeIndex : false;
          const isPast = synced ? i < activeIndex : false;

          return (
            <p
              key={i}
              ref={isActive ? activeRef : null}
              className={clsx(
                'transition-all duration-300 leading-relaxed cursor-default select-none',
                isActive
                  ? 'text-text-primary font-semibold text-base scale-105 origin-left'
                  : isPast
                    ? 'text-text-muted text-sm'
                    : synced
                      ? 'text-text-secondary text-sm'
                      : 'text-text-secondary text-sm'
              )}
              style={{
                transform: isActive ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.3s ease',
                opacity: isActive ? 1 : isPast ? 0.4 : synced ? 0.7 : 0.8,
              }}
              onClick={() => {
                // Click on lyric line to seek to that time
                if (synced && line.time >= 0) {
                  const audio = document.querySelector('audio');
                  if (audio) audio.currentTime = line.time;
                }
              }}
            >
              {line.text || '\u00A0'}
            </p>
          );
        })}

        {displayLines.length === 0 && (
          <p className="text-text-muted text-sm text-center py-4">No lyrics found</p>
        )}
      </div>
    </div>
  );
}
