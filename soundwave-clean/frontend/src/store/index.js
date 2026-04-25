import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const usePlayerStore = create(
  persist(
    (set, get) => ({
      currentTrack: null,
      queue: [],
      queueIndex: -1,
      isPlaying: false,
      volume: 0.8,
      isMuted: false,
      progress: 0,
      duration: 0,
      currentTime: 0,
      isBuffering: false,
      crossfade: false,
      isShuffle: false,
      repeatMode: 'none',
      showLyrics: false,
      userId: null,
      userName: null,

      setCurrentTrack: (track) => set({ currentTrack: track, progress: 0, currentTime: 0 }),

      setQueue: (tracks, startIndex = 0) => {
        set({ queue: tracks, queueIndex: startIndex });
        if (tracks[startIndex]) set({ currentTrack: tracks[startIndex] });
      },

      playNext: () => {
        const { queue, queueIndex, isShuffle, repeatMode } = get();
        if (!queue.length) return;
        let nextIndex;
        if (isShuffle) {
          nextIndex = Math.floor(Math.random() * queue.length);
        } else if (queueIndex < queue.length - 1) {
          nextIndex = queueIndex + 1;
        } else if (repeatMode === 'all') {
          nextIndex = 0;
        } else {
          return;
        }
        set({ queueIndex: nextIndex, currentTrack: queue[nextIndex], progress: 0, currentTime: 0 });
      },

      playPrev: () => {
        const { queue, queueIndex, currentTime } = get();
        if (!queue.length) return;
        if (currentTime > 3) {
          set({ progress: 0, currentTime: 0 });
          return;
        }
        const prevIndex = queueIndex > 0 ? queueIndex - 1 : queue.length - 1;
        set({ queueIndex: prevIndex, currentTrack: queue[prevIndex], progress: 0, currentTime: 0 });
      },

      addToQueue: (track) => set((s) => ({ queue: [...s.queue, track] })),
      setIsPlaying: (isPlaying) => set({ isPlaying }),
      setVolume: (volume) => set({ volume, isMuted: volume === 0 }),
      toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
      setProgress: (progress) => set({ progress }),
      setCurrentTime: (currentTime) => set({ currentTime }),
      setDuration: (duration) => set({ duration }),
      setIsBuffering: (isBuffering) => set({ isBuffering }),
      toggleShuffle: () => set((s) => ({ isShuffle: !s.isShuffle })),
      cycleRepeat: () => {
        const modes = ['none', 'one', 'all'];
        const { repeatMode } = get();
        set({ repeatMode: modes[(modes.indexOf(repeatMode) + 1) % modes.length] });
      },
      toggleLyrics: () => set((s) => ({ showLyrics: !s.showLyrics })),
      setUser: (userId, userName) => set({ userId, userName }),
    }),
    {
      name: 'soundwave-player',
      partialize: (state) => ({
        volume: state.volume,
        isMuted: state.isMuted,
        isShuffle: state.isShuffle,
        repeatMode: state.repeatMode,
        userId: state.userId,
        userName: state.userName,
      }),
    }
  )
);

export const useUIStore = create((set) => ({
  activeView: 'home',
  activePlaylistId: null,
  sidebarOpen: true,
  showSpotifyImport: false,
  notification: null,
  pendingSearch: null,

  setView: (view, data = null) => set({ activeView: view, activePlaylistId: data }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  showNotification: (message, type = 'info') => {
    set({ notification: { message, type, id: Date.now() } });
    setTimeout(() => set({ notification: null }), 3000);
  },
  setShowSpotifyImport: (show) => set({ showSpotifyImport: show }),
  setPendingSearch: (query) => set({ pendingSearch: query }),
}));
