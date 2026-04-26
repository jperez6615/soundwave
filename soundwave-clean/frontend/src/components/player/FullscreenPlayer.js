'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, SkipBack, SkipForward, Play, Pause, Shuffle, Repeat, Repeat1, Heart, Volume2, MicVocal, List } from 'lucide-react';
import { usePlayerStore } from '../../store';
import clsx from 'clsx';

function formatTime(s) {
  if (!s || !isFinite(s) || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${(Math.floor(s) % 60).toString().padStart(2, '0')}`;
}

export default function FullscreenPlayer({ onClose, lyricsData, seek }) {
  const {
    currentTrack, isPlaying, volume, isMuted, currentTime, duration,
    isBuffering, isShuffle, repeatMode, setIsPlaying, setVolume,
    toggleShuffle, cycleRepeat, playNext, playPrev,
  } = usePlayerStore();

  const [showLyrics, setShowLyrics] = useState(false);
  const [liked, setLiked] = useState(false);
  const lyricsRef = useRef(null);
  const activeLineRef = useRef(null);

  const displayDuration = (isFinite(duration) && duration > 0) ? duration : (currentTrack?.duration || 0);
  const displayProgress = displayDuration > 0 ? Math.min((currentTime / displayDuration) * 100, 100) : 0;

  // Find active lyric line
  const activeIndex = useMemo(() => {
    if (!lyricsData?.synced || !lyricsData?.lines?.length) return -1;
    let idx = -1;
    for (let i = 0; i < lyricsData.lines.length; i++) {
      if (lyricsData.lines[i].time <= currentTime) idx = i;
      else break;
    }
    return idx;
  }, [lyricsData, currentTime]);

  // Auto-scroll lyrics
  useEffect(() => {
    if (activeLineRef.current && lyricsRef.current) {
      activeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeIndex]);

  if (!currentTrack) return null;

  const dominantColor = '#1a1a2e'; // Could be extracted from thumbnail

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{
        background: `linear-gradient(180deg, #2a1a3e 0%, #0a0a0f 60%)`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-12 pb-4">
        <button onClick={onClose} className="text-white/70 hover:text-white p-2">
          <ChevronDown size={28} />
        </button>
        <div className="text-center">
          <p className="text-white/50 text-xs uppercase tracking-widest font-medium">Now Playing</p>
        </div>
        <button className="text-white/70 hover:text-white p-2">
          <List size={22} />
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col px-8 overflow-hidden">
        {!showLyrics ? (
          <>
            {/* Album art - large */}
            <div className="flex-1 flex items-center justify-center py-4">
              <div className={clsx(
                'rounded-2xl overflow-hidden shadow-2xl transition-all duration-300',
                isPlaying ? 'w-72 h-72 md:w-80 md:h-80' : 'w-60 h-60 md:w-72 md:h-72'
              )}>
                {currentTrack.thumbnailUrl ? (
                  <img
                    src={currentTrack.thumbnailUrl}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-surface-3 flex items-center justify-center">
                    <div className="flex gap-1">
                      {[0,1,2].map(i => (
                        <div key={i} className="w-2 bg-accent rounded-full eq-bar"
                          style={{ height: '40px', animationDelay: `${i*0.2}s` }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Track info */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex-1 min-w-0">
                <h2 className="text-white text-xl font-bold truncate"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {currentTrack.title}
                </h2>
                <p className="text-white/60 text-base mt-0.5 truncate">{currentTrack.artist}</p>
              </div>
              <button
                onClick={() => setLiked(!liked)}
                className={clsx('ml-4 p-2', liked ? 'text-pink-400' : 'text-white/40 hover:text-white/70')}
              >
                <Heart size={24} fill={liked ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* Progress bar */}
            <div className="mb-2">
              <input
                type="range" min={0} max={100}
                value={isFinite(displayProgress) ? displayProgress : 0}
                onChange={(e) => seek(Number(e.target.value))}
                className="w-full h-1 rounded-full outline-none cursor-pointer appearance-none"
                style={{
                  background: `linear-gradient(to right, white ${displayProgress}%, rgba(255,255,255,0.2) ${displayProgress}%)`,
                }}
              />
              <div className="flex justify-between mt-1">
                <span className="text-white/50 text-xs">{formatTime(currentTime)}</span>
                <span className="text-white/50 text-xs">-{formatTime(displayDuration - currentTime)}</span>
              </div>
            </div>

            {/* Main controls */}
            <div className="flex items-center justify-between mb-6">
              <button onClick={toggleShuffle}
                className={clsx('p-2', isShuffle ? 'text-accent' : 'text-white/40 hover:text-white/70')}>
                <Shuffle size={22} />
              </button>
              <button onClick={playPrev} className="text-white p-2">
                <SkipBack size={36} fill="white" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              >
                {isBuffering
                  ? <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  : isPlaying
                    ? <Pause size={28} fill="black" className="text-black" />
                    : <Play size={28} fill="black" className="text-black ml-1" />
                }
              </button>
              <button onClick={playNext} className="text-white p-2">
                <SkipForward size={36} fill="white" />
              </button>
              <button onClick={cycleRepeat}
                className={clsx('p-2', repeatMode !== 'none' ? 'text-accent' : 'text-white/40 hover:text-white/70')}>
                {repeatMode === 'one' ? <Repeat1 size={22} /> : <Repeat size={22} />}
              </button>
            </div>

            {/* Volume + Lyrics button */}
            <div className="flex items-center gap-3 mb-8">
              <Volume2 size={16} className="text-white/40 flex-shrink-0" />
              <input
                type="range" min={0} max={1} step={0.01}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="flex-1 h-1 rounded-full outline-none cursor-pointer appearance-none"
                style={{
                  background: `linear-gradient(to right, white ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) ${(isMuted ? 0 : volume) * 100}%)`,
                }}
              />
              {lyricsData?.found && (
                <button
                  onClick={() => setShowLyrics(true)}
                  className="text-white/40 hover:text-accent flex-shrink-0 ml-2"
                  title="Show lyrics"
                >
                  <MicVocal size={20} />
                </button>
              )}
            </div>
          </>
        ) : (
          /* LYRICS VIEW */
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center gap-3 mb-6 flex-shrink-0">
              <img
                src={currentTrack.thumbnailUrl}
                alt=""
                className="w-12 h-12 rounded-xl object-cover"
              />
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm truncate">{currentTrack.title}</p>
                <p className="text-white/50 text-xs truncate">{currentTrack.artist}</p>
              </div>
              <button onClick={() => setShowLyrics(false)} className="ml-auto text-white/50 hover:text-white">
                <MicVocal size={20} className="text-accent" />
              </button>
            </div>

            <div
              ref={lyricsRef}
              className="flex-1 overflow-y-auto space-y-4 pb-8"
              style={{ scrollbarWidth: 'none' }}
            >
              {lyricsData?.synced && lyricsData.lines?.length > 0 ? (
                lyricsData.lines.map((line, i) => {
                  const isActive = i === activeIndex;
                  const isPast = i < activeIndex;
                  return (
                    <p
                      key={i}
                      ref={isActive ? activeLineRef : null}
                      onClick={() => { if (line.time >= 0) seek((line.time / displayDuration) * 100); }}
                      className="cursor-pointer transition-all duration-300 leading-snug"
                      style={{
                        fontSize: isActive ? '1.5rem' : '1.25rem',
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? 'white' : isPast ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.5)',
                        fontFamily: "'DM Sans', sans-serif",
                        transform: isActive ? 'scale(1.02)' : 'scale(1)',
                        transformOrigin: 'left',
                      }}
                    >
                      {line.text}
                    </p>
                  );
                })
              ) : (
                lyricsData?.lyrics?.split('\n').filter(l => l.trim()).map((line, i) => (
                  <p key={i} className="text-white/70 text-xl font-medium leading-snug"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {line}
                  </p>
                ))
              )}
            </div>

            {/* Mini controls in lyrics view */}
            <div className="flex-shrink-0 pb-8">
              <input
                type="range" min={0} max={100}
                value={isFinite(displayProgress) ? displayProgress : 0}
                onChange={(e) => seek(Number(e.target.value))}
                className="w-full h-1 rounded-full outline-none cursor-pointer appearance-none mb-2"
                style={{
                  background: `linear-gradient(to right, white ${displayProgress}%, rgba(255,255,255,0.2) ${displayProgress}%)`,
                }}
              />
              <div className="flex justify-between text-white/40 text-xs mb-4">
                <span>{formatTime(currentTime)}</span>
                <span>-{formatTime(displayDuration - currentTime)}</span>
              </div>
              <div className="flex items-center justify-center gap-8">
                <button onClick={playPrev} className="text-white"><SkipBack size={28} fill="white" /></button>
                <button onClick={() => setIsPlaying(!isPlaying)}
                  className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
                  {isPlaying ? <Pause size={24} fill="black" className="text-black" /> : <Play size={24} fill="black" className="text-black ml-1" />}
                </button>
                <button onClick={playNext} className="text-white"><SkipForward size={28} fill="white" /></button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
