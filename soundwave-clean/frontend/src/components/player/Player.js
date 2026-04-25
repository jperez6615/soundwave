'use client';
import { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Shuffle, Repeat, Repeat1, Heart, MicVocal, ListMusic,
  ChevronUp, ChevronDown,
} from 'lucide-react';
import { usePlayerStore } from '../../store';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { getLyrics } from '../../lib/api';
import LyricsPanel from './LyricsPanel';
import clsx from 'clsx';

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function Player() {
  const {
    currentTrack, isPlaying, volume, isMuted, progress,
    currentTime, duration, isBuffering, isShuffle, repeatMode,
    showLyrics, setIsPlaying, setVolume, toggleMute, toggleShuffle,
    cycleRepeat, toggleLyrics, playNext, playPrev,
  } = usePlayerStore();

  const { seek } = useAudioPlayer();
  const [lyrics, setLyrics] = useState(null);
  const [liked, setLiked] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Load lyrics when track changes
  useEffect(() => {
    if (!currentTrack) return;
    setLyrics(null);

    getLyrics(currentTrack.title, currentTrack.artist)
      .then((data) => data.found && setLyrics(data.lyrics))
      .catch(() => {});
  }, [currentTrack?.youtubeId]);

  if (!currentTrack) {
    return (
      <div className="glass border-t border-white/5 px-6 py-4 flex items-center justify-center">
        <p className="text-text-muted text-sm">Search for a song to start listening</p>
      </div>
    );
  }

  const progressStyle = {
    background: `linear-gradient(to right, var(--accent) ${progress}%, var(--surface-4) ${progress}%)`,
  };

  const volumeStyle = {
    background: `linear-gradient(to right, var(--accent) ${(isMuted ? 0 : volume) * 100}%, var(--surface-4) ${(isMuted ? 0 : volume) * 100}%)`,
  };

  return (
    <>
      {/* Lyrics Panel */}
      {showLyrics && lyrics && (
        <LyricsPanel lyrics={lyrics} currentTime={currentTime} />
      )}

      {/* Player Bar */}
      <div className="glass border-t border-white/5 px-4 md:px-6 py-3">
        <div className="max-w-screen-xl mx-auto flex items-center gap-4">

          {/* Track Info */}
          <div className="flex items-center gap-3 min-w-0 w-[200px] md:w-[240px] flex-shrink-0">
            <div className="relative w-12 h-12 flex-shrink-0">
              {currentTrack.thumbnailUrl ? (
                <img
                  src={currentTrack.thumbnailUrl}
                  alt={currentTrack.title}
                  className={clsx(
                    'w-12 h-12 rounded-lg object-cover',
                    isPlaying && 'ring-2 ring-accent'
                  )}
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-surface-3 flex items-center justify-center">
                  <span className="text-text-muted text-xl">♪</span>
                </div>
              )}
              {/* Equalizer overlay when playing */}
              {isPlaying && (
                <div className="absolute inset-0 bg-black/40 rounded-lg flex items-end justify-center pb-1 gap-0.5">
                  <div className="eq-bar" style={{ height: '10px' }} />
                  <div className="eq-bar" style={{ height: '10px', animationDelay: '0.2s' }} />
                  <div className="eq-bar" style={{ height: '10px', animationDelay: '0.4s' }} />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-text-primary text-sm font-medium truncate">
                {currentTrack.title}
              </p>
              <p className="text-text-secondary text-xs truncate">{currentTrack.artist}</p>
            </div>
            <button
              onClick={() => setLiked(!liked)}
              className={clsx(
                'flex-shrink-0 hidden md:block',
                liked ? 'text-pink-accent' : 'text-text-muted hover:text-text-primary'
              )}
            >
              <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Center Controls */}
          <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
            {/* Control buttons */}
            <div className="flex items-center gap-4 md:gap-6">
              <button
                onClick={toggleShuffle}
                className={clsx(
                  'hidden md:block transition-colors',
                  isShuffle ? 'text-accent' : 'text-text-muted hover:text-text-primary'
                )}
              >
                <Shuffle size={16} />
              </button>

              <button
                onClick={playPrev}
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                <SkipBack size={20} fill="currentColor" />
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-10 h-10 rounded-full bg-text-primary text-surface flex items-center justify-center hover:scale-105 transition-transform active:scale-95"
              >
                {isBuffering ? (
                  <div className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Pause size={18} fill="currentColor" />
                ) : (
                  <Play size={18} fill="currentColor" className="ml-0.5" />
                )}
              </button>

              <button
                onClick={playNext}
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                <SkipForward size={20} fill="currentColor" />
              </button>

              <button
                onClick={cycleRepeat}
                className={clsx(
                  'hidden md:block transition-colors',
                  repeatMode !== 'none' ? 'text-accent' : 'text-text-muted hover:text-text-primary'
                )}
              >
                {repeatMode === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
              </button>
            </div>

            {/* Progress bar */}
            <div className="w-full flex items-center gap-2 max-w-xl">
              <span className="text-xs text-text-muted w-8 text-right">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={progress || 0}
                onChange={(e) => seek(Number(e.target.value))}
                className="progress-bar flex-1"
                style={progressStyle}
              />
              <span className="text-xs text-text-muted w-8">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="hidden md:flex items-center gap-3 w-[200px] justify-end">
            <button
              onClick={toggleLyrics}
              className={clsx(
                'transition-colors',
                showLyrics ? 'text-accent' : 'text-text-muted hover:text-text-primary'
              )}
              title="Lyrics"
            >
              <MicVocal size={16} />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="volume-bar w-20"
                style={volumeStyle}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
