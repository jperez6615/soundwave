'use client';
import { useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '../store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://soundwave-production-4bb6.up.railway.app';

export function useAudioPlayer() {
  const audioRef = useRef(null);
  const isLoadingRef = useRef(false);

  const {
    currentTrack, isPlaying, volume, isMuted, repeatMode,
    setIsPlaying, setProgress, setCurrentTime, setDuration,
    setIsBuffering, playNext,
  } = usePlayerStore();

  // Init audio once
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      audioRef.current = audio;
    }

    const audio = audioRef.current;

    const onTimeUpdate = () => {
      const cur = audio.currentTime || 0;
      const dur = isFinite(audio.duration) && audio.duration > 0
        ? audio.duration
        : (usePlayerStore.getState().currentTrack?.duration || 0);
      setCurrentTime(cur);
      setProgress(dur > 0 ? Math.min((cur / dur) * 100, 100) : 0);
    };

    const onDurationChange = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const onLoadedData = () => {
      setIsBuffering(false);
      isLoadingRef.current = false;
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
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
    const onCanPlay = () => setIsBuffering(false);
    const onPlaying = () => { setIsBuffering(false); setIsPlaying(true); };
    const onPause = () => setIsPlaying(false);
    const onError = (e) => {
      console.error('Audio error:', audio.error);
      setIsBuffering(false);
      isLoadingRef.current = false;
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('loadeddata', onLoadedData);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);

    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => { audio.play(); setIsPlaying(true); });
      navigator.mediaSession.setActionHandler('pause', () => { audio.pause(); setIsPlaying(false); });
      navigator.mediaSession.setActionHandler('nexttrack', playNext);
      navigator.mediaSession.setActionHandler('previoustrack', () => usePlayerStore.getState().playPrev());
    }

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('loadeddata', onLoadedData);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
    };
  }, [repeatMode, playNext]);

  // Load track when it changes
  useEffect(() => {
    if (!currentTrack?.youtubeId || !audioRef.current) return;
    const audio = audioRef.current;

    const streamUrl = `${API_BASE}/api/stream/${currentTrack.youtubeId}`;
    console.log('Loading stream:', streamUrl);

    setIsBuffering(true);
    isLoadingRef.current = true;

    audio.pause();
    audio.src = streamUrl;
    audio.load();

    if (currentTrack.duration) setDuration(currentTrack.duration);

    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title || '',
        artist: currentTrack.artist || '',
        artwork: currentTrack.thumbnailUrl
          ? [{ src: currentTrack.thumbnailUrl, sizes: '480x360', type: 'image/jpeg' }]
          : [],
      });
    }

    // Auto-play
    const playPromise = audio.play();
    if (playPromise) {
      playPromise
        .then(() => { setIsPlaying(true); setIsBuffering(false); })
        .catch((e) => {
          console.warn('Autoplay blocked:', e.message);
          setIsBuffering(false);
        });
    }
  }, [currentTrack?.youtubeId]);

  // Sync play/pause
  useEffect(() => {
    if (!audioRef.current || isLoadingRef.current) return;
    const audio = audioRef.current;
    if (isPlaying) {
      audio.play().catch((e) => console.warn('Play failed:', e.message));
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // Sync volume
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : Math.max(0, Math.min(1, volume));
  }, [volume, isMuted]);

  const seek = useCallback((percent) => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    const dur = isFinite(audio.duration) && audio.duration > 0
      ? audio.duration
      : (currentTrack?.duration || 0);
    if (dur > 0) audio.currentTime = (percent / 100) * dur;
  }, [currentTrack?.duration]);

  return { seek, audioRef };
}
