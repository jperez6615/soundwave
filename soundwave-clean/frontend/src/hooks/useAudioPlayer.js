'use client';
import { useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '../store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://soundwave-production-4bb6.up.railway.app';

export function useAudioPlayer() {
  const audioRef = useRef(null);

  const {
    currentTrack, isPlaying, volume, isMuted, repeatMode,
    setIsPlaying, setProgress, setCurrentTime, setDuration,
    setIsBuffering, playNext,
  } = usePlayerStore();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
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
      if (isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration);
    };
    const onEnded = () => {
      if (repeatMode === 'one') { audio.currentTime = 0; audio.play().catch(() => {}); }
      else playNext();
    };
    const onWaiting = () => setIsBuffering(true);
    const onCanPlay = () => setIsBuffering(false);
    const onPlaying = () => { setIsBuffering(false); setIsPlaying(true); };
    const onError = () => {
      console.error('Audio error:', audio.error?.code, audio.error?.message);
      setIsBuffering(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('playing', onPlaying);
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
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('error', onError);
    };
  }, [repeatMode, playNext]);

  useEffect(() => {
    if (!currentTrack?.youtubeId || !audioRef.current) return;
    const audio = audioRef.current;

    // Use proxy endpoint directly — no /url step
    const streamUrl = `${API_BASE}/api/stream/${currentTrack.youtubeId}`;
    console.log('Stream:', streamUrl);

    setIsBuffering(true);
    audio.pause();
    audio.src = streamUrl;
    audio.load();

    if (currentTrack.duration) setDuration(currentTrack.duration);

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title || '',
        artist: currentTrack.artist || '',
        artwork: currentTrack.thumbnailUrl
          ? [{ src: currentTrack.thumbnailUrl, sizes: '480x360', type: 'image/jpeg' }]
          : [],
      });
    }

    audio.play()
      .then(() => { setIsPlaying(true); setIsBuffering(false); })
      .catch(e => { console.warn('Play blocked:', e.message); setIsBuffering(false); });

  }, [currentTrack?.youtubeId]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.play().catch(() => {});
    else audioRef.current.pause();
  }, [isPlaying]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : Math.max(0, Math.min(1, volume));
  }, [volume, isMuted]);

  const seek = useCallback((percent) => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    const dur = isFinite(audio.duration) && audio.duration > 0
      ? audio.duration : (currentTrack?.duration || 0);
    if (dur > 0) audio.currentTime = (percent / 100) * dur;
  }, [currentTrack?.duration]);

  return { seek, audioRef };
}
