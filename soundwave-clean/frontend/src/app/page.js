'use client';
import { useEffect, useState } from 'react';
import { usePlayerStore, useUIStore } from '../store';
import { createGuestUser } from '../lib/api';
import Sidebar from '../components/sidebar/Sidebar';
import Player from '../components/player/Player';
import HomeView from '../components/views/HomeView';
import SearchView from '../components/views/SearchView';
import PlaylistView from '../components/views/PlaylistView';
import LikedView from '../components/views/LikedView';
import HistoryView from '../components/views/HistoryView';
import Notification from '../components/ui/Notification';
import MobileNav from '../components/sidebar/MobileNav';

export default function App() {
  const { setUser, userId } = usePlayerStore();
  const { activeView, notification } = useUIStore();
  const [loading, setLoading] = useState(true);

  // Initialize user session
  useEffect(() => {
    async function initUser() {
      try {
        const storedId = localStorage.getItem('soundwave_user_id');
        const storedName = localStorage.getItem('soundwave_user_name');

        // Check for Spotify callback
        const params = new URLSearchParams(window.location.search);
        const callbackUserId = params.get('userId');
        const callbackName = params.get('name');

        if (callbackUserId) {
          localStorage.setItem('soundwave_user_id', callbackUserId);
          localStorage.setItem('soundwave_user_name', callbackName || 'User');
          setUser(callbackUserId, callbackName || 'User');
          window.history.replaceState({}, '', '/');
        } else if (storedId) {
          setUser(storedId, storedName || 'User');
        } else {
          // Create guest session
          const { user } = await createGuestUser('Listener');
          localStorage.setItem('soundwave_user_id', user.id);
          localStorage.setItem('soundwave_user_name', user.name);
          setUser(user.id, user.name);
        }
      } catch (err) {
        console.error('Failed to init user:', err);
        // Continue without auth
      } finally {
        setLoading(false);
      }
    }

    initUser();
  }, []);

  const renderView = () => {
    switch (activeView) {
      case 'home': return <HomeView />;
      case 'search': return <SearchView />;
      case 'playlist': return <PlaylistView />;
      case 'liked': return <LikedView />;
      case 'history': return <HistoryView />;
      default: return <HomeView />;
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="flex gap-1 justify-center mb-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="eq-bar"
                style={{
                  height: '32px',
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
          <p className="text-text-secondary text-sm">SoundWave</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-surface overflow-hidden">
      {/* Mesh gradient background */}
      <div className="fixed inset-0 bg-gradient-mesh pointer-events-none" />

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Sidebar - hidden on mobile */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto pb-[100px] md:pb-[88px]">
          <div className="page-enter">
            {renderView()}
          </div>
        </main>
      </div>

      {/* Fixed bottom player */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <Player />
        {/* Mobile nav bar */}
        <div className="md:hidden">
          <MobileNav />
        </div>
      </div>

      {/* Notifications */}
      {notification && <Notification notification={notification} />}
    </div>
  );
}
