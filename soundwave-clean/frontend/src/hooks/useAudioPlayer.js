'use client';
import { useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '../store';
import { getStreamUrl, recordPlay } from '../lib/api';

export function useAudioPlayer() {
  const audioRef = useRef(null);
  const crossfadeRef = useRef(null);
  const fadeIntervalRef = useRef(null);

  const {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    repeatMode,
    crossfade,
    setIsPlaying,
    setProgress,
    setCurrentTime,
    setDuration,
    setIsBuffering,
    playNext,
    userId,
  } = usePlayerStore();

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'metadata';
      
      // PWA media session API
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
        navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
        navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
        navigator.mediaSession.setActionHandler('previoustrack', () => usePlayerStore.getState().playPrev());
      }
    }

    const audio = audioRef.current;

    const onTimeUpdate = () => {
      const duration = audio.duration || 0;
      const currentTime = audio.currentTime;
      const progress = duration ? (currentTime / duration) * 100 : 0;
      setCurrentTime(currentTime);
      setProgress(progress);
    };

    const onDurationChange = () => {
      setDuration(audio.duration || 0);
    };

    const onEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else {
        playNext();
      }
    };

    const onWaiting = () => setIsBuffering(true);
    const onCanPlay = () => setIsBuffering(false);
    const onError = (e) => {
      console.error('Audio error:', e);
      setIsBuffering(false);
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('error', onError);
    };
  }, [repeatMode, playNext, setIsPlaying, setProgress, setCurrentTime, setDuration, setIsBuffering]);

  // Load new track
  useEffect(() => {
    if (!currentTrack?.youtubeId || !audioRef.current) return;

    const audio = audioRef.current;
    const streamUrl = getStreamUrl(currentTrack.youtubeId);

    // Update Media Session metadata (lock screen controls)
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || '',
        artwork: currentTrack.thumbnailUrl
          ? [{ src: currentTrack.thumbnailUrl, sizes: '480x360', type: 'image/jpeg' }]
          : [],
      });
    }

    audio.src = streamUrl;
    audio.load();

    // Record play in history
    if (userId && currentTrack.id) {
      recordPlay(currentTrack.id).catch(() => {});
    }

    if (isPlaying) {
      audio.play().catch((e) => {
        console.warn('Autoplay blocked:', e);
        setIsPlaying(false);
      });
    }
  }, [currentTrack?.youtubeId]);

  // Play/pause control
  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    if (isPlaying) {
      audio.play().catch((e) => {
        console.warn('Play failed:', e);
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // Volume control
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // Seek function
  const seek = useCallback((percent) => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    const newTime = (percent / 100) * (audio.duration || 0);
    audio.currentTime = newTime;
  }, []);

  // Crossfade (experimental)
  const startCrossfade = useCallback(() => {
    if (!audioRef.current || !crossfade) return;
    const audio = audioRef.current;
    const timeLeft = audio.duration - audio.currentTime;
    
    if (timeLeft < 5 && timeLeft > 0) {
      const step = audio.volume / (timeLeft * 10);
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = setInterval(() => {
        if (audio.volume > step) {
          audio.volume = Math.max(0, audio.volume - step);
        } else {
          clearInterval(fadeIntervalRef.current);
          playNext();
        }
      }, 100);
    }
  }, [crossfade, playNext]);

  return { seek, audioRef };
}
