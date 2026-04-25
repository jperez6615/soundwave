'use client';
import { useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '../store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://soundwave-production-4bb6.up.railway.app';

function getStreamUrl(videoId) {
  return `${API_BASE}/api/stream/${videoId}`;
}

export function useAudioPlayer() {
  const audioRef = useRef(null);

  const {
    currentTrack, isPlaying, volume, isMuted, repeatMode,
    setIsPlaying, setProgress, setCurrentTime, setDuration,
    setIsBuffering, playNext, userId,
  } = usePlayerStore();

  // Init audio element once
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'none';
    }

    const audio = audioRef.current;

    const onTimeUpdate = () => {
      const cur = audio.currentTime || 0;
      const dur = isFinite(audio.duration) ? audio.duration : 0;
      setCurrentTime(cur);
      setProgress(dur > 0 ? (cur / dur) * 100 : 0);
      // If we have duration from track metadata, use that
      if (!isFinite(audio.duration) && currentTrack?.duration) {
        setDuration(currentTrack.duration);
      }
    };

    const onDurationChange = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      } else if (currentTrack?.duration) {
        setDuration(currentTrack.duration);
      }
    };

    const onEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        playNext();
      }
    };

    const onWaiting = () => setIsBuffering(true);
    const onCanPlay = () => {
      setIsBuffering(false);
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      } else if (currentTrack?.duration) {
        setDuration(currentTrack.duration);
      }
    };
    const onError = () => { setIsBuffering(false); };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('error', onError);

    // Media Session API (lock screen controls on iPhone)
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
      navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
      navigator.mediaSession.setActionHandler('previoustrack', () => usePlayerStore.getState().playPrev());
    }

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('error', onError);
    };
  }, [repeatMode, playNext, currentTrack?.duration]);

  // Load new track when it changes
  useEffect(() => {
    if (!currentTrack?.youtubeId || !audioRef.current) return;
    const audio = audioRef.current;

    audio.src = getStreamUrl(currentTrack.youtubeId);
    audio.load();

    // Set duration from metadata immediately
    if (currentTrack.duration) {
      setDuration(currentTrack.duration);
    }

    // Update Media Session metadata (lock screen)
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title || 'Unknown',
        artist: currentTrack.artist || '',
        album: currentTrack.album || '',
        artwork: currentTrack.thumbnailUrl
          ? [{ src: currentTrack.thumbnailUrl, sizes: '480x360', type: 'image/jpeg' }]
          : [],
      });
    }

    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    }
  }, [currentTrack?.youtubeId]);

  // Play/pause
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => setIsPlaying(false));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  // Volume
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : Math.max(0, Math.min(1, volume));
  }, [volume, isMuted]);

  const seek = useCallback((percent) => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    const dur = isFinite(audio.duration) ? audio.duration : currentTrack?.duration || 0;
    if (dur > 0) {
      audio.currentTime = (percent / 100) * dur;
    }
  }, [currentTrack?.duration]);

  return { seek, audioRef };
}
