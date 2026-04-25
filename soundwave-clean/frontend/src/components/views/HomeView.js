'use client';
import { useEffect, useState } from 'react';
import { Play, Clock, TrendingUp } from 'lucide-react';
import { usePlayerStore, useUIStore } from '../../store';
import { getHistory, getLikedTracks } from '../../lib/api';
import TrackCard from '../ui/TrackCard';

const FEATURED_MOODS = [
  { label: 'Focus & Study', query: 'lofi study music', color: 'from-blue-900/60 to-indigo-900/60', emoji: 'Study' },
  { label: 'Workout', query: 'gym workout motivation', color: 'from-red-900/60 to-orange-900/60', emoji: 'Work' },
  { label: 'Chill Vibes', query: 'chill lo-fi beats', color: 'from-green-900/60 to-teal-900/60', emoji: 'Chill' },
  { label: 'Party', query: 'party hits 2024', color: 'from-purple-900/60 to-pink-900/60', emoji: 'Party' },
  { label: 'Jazz & Soul', query: 'jazz soul classics', color: 'from-yellow-900/60 to-amber-900/60', emoji: 'Jazz' },
  { label: 'Hip-Hop', query: 'hip hop hits 2024', color: 'from-gray-900/60 to-zinc-800/60', emoji: 'Hip-Hop' },
];

export default function HomeView() {
  const { userName, setQueue, setIsPlaying } = usePlayerStore();
  const { setView, setPendingSearch } = useUIStore();
  const [recentTracks, setRecentTracks] = useState([]);
  const [likedTracks, setLikedTracks] = useState([]);

  useEffect(() => {
    getHistory(10)
      .then((d) => setRecentTracks(d.history?.map((h) => h.track) || []))
      .catch(() => {});

    getLikedTracks()
      .then((d) => setLikedTracks(d.tracks?.slice(0, 6) || []))
      .catch(() => {});
  }, []);

  function playMood(query) {
    setView('search');
    // Trigger search with query via UIStore
    setPendingSearch(query);
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="px-6 py-8 max-w-screen-xl mx-auto">
      {/* Greeting */}
      <div className="mb-8">
        <h1
          className="text-3xl font-bold text-text-primary mb-1"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {greeting}{userName && userName !== 'Guest' ? `, ${userName.split(' ')[0]}` : ''}
        </h1>
        <p className="text-text-secondary text-sm">What are you in the mood for?</p>
      </div>

      {/* Mood Grid */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-text-primary mb-4">Browse by mood</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {FEATURED_MOODS.map((mood) => (
            <button
              key={mood.label}
              onClick={() => playMood(mood.query)}
              className={`relative overflow-hidden rounded-xl p-4 bg-gradient-to-br ${mood.color} border border-white/5 hover:border-white/10 transition-all hover:scale-[1.02] active:scale-[0.98] text-left group`}
            >
              <span className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2 block">{mood.emoji}</span>
              <span className="text-sm font-semibold text-text-primary">{mood.label}</span>
              <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shadow-lg">
                  <Play size={14} fill="white" className="text-white ml-0.5" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Recently Played */}
      {recentTracks.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-accent" />
            <h2 className="text-base font-semibold text-text-primary">Recently played</h2>
          </div>
          <div className="space-y-1">
            {recentTracks.slice(0, 5).map((track, i) => (
              <TrackCard
                key={track.id}
                track={track}
                index={i}
                onPlay={() => {
                  setQueue(recentTracks, i);
                  setIsPlaying(true);
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Liked Songs Quick Access */}
      {likedTracks.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-pink-accent" />
            <h2 className="text-base font-semibold text-text-primary">Liked songs</h2>
            <button
              onClick={() => setView('liked')}
              className="ml-auto text-xs text-text-muted hover:text-accent transition-colors"
            >
              See all
            </button>
          </div>
          <div className="space-y-1">
            {likedTracks.slice(0, 5).map((track, i) => (
              <TrackCard
                key={track.id}
                track={track}
                index={i}
                onPlay={() => {
                  setQueue(likedTracks, i);
                  setIsPlaying(true);
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {recentTracks.length === 0 && likedTracks.length === 0 && (
        <div className="text-center py-16">
          <div className="flex gap-1 justify-center mb-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="eq-bar" style={{ height: '40px', animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
          <p className="text-text-secondary text-sm mb-2">Your music journey starts here</p>
          <button
            onClick={() => setView('search')}
            className="text-accent text-sm hover:underline"
          >
            Search for songs →
          </button>
        </div>
      )}
    </div>
  );
}
