'use client';
import { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { useUIStore, usePlayerStore } from '../../store';
import { searchMusic } from '../../lib/api';
import TrackCard from '../ui/TrackCard';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// Normalize search result to have consistent field names
function normalizeTrack(track) {
  return {
    ...track,
    youtubeId: track.youtubeId || track.id,
    thumbnailUrl: track.thumbnailUrl || track.thumbnail,
    artist: track.artist || track.uploader || 'Unknown Artist',
  };
}

export default function SearchView() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const { setQueue, setIsPlaying, currentTrack } = usePlayerStore();
  const { pendingSearch, setPendingSearch } = useUIStore();

  const debouncedQuery = useDebounce(query, 500);

  // Handle pending search from home view mood click
  useEffect(() => {
    if (pendingSearch) {
      setQuery(pendingSearch);
      setPendingSearch(null);
    }
  }, [pendingSearch]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    searchMusic(debouncedQuery, 15)
      .then((data) => {
        if (!cancelled) {
          setResults((data.results || []).map(normalizeTrack));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Search failed. Make sure the backend is running.');
          setResults([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [debouncedQuery]);

  function handlePlay(track, index) {
    setQueue(results, index);
    setIsPlaying(true);
  }

  const SUGGESTIONS = [
    'Taylor Swift', 'The Weeknd', 'Bad Bunny', 'Drake',
    'Billie Eilish', 'Kendrick Lamar', 'SZA', 'Post Malone',
  ];

  return (
    <div className="px-6 py-8 max-w-screen-xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary mb-6"
          style={{ fontFamily: "'Playfair Display', serif" }}>
          Search
        </h1>
        <div className="relative max-w-xl">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Artists, songs, albums…"
            className="w-full bg-surface-2 border border-white/5 focus:border-accent/50 text-text-primary placeholder:text-text-muted rounded-xl pl-12 pr-10 py-3.5 text-sm outline-none transition-all"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-text-muted text-sm mb-6">
          <Loader2 size={16} className="animate-spin" />
          Searching YouTube…
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm mb-6">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
              Results for "{debouncedQuery}"
            </h2>
            <span className="text-xs text-text-muted">{results.length} songs</span>
          </div>
          <div className="space-y-1">
            {results.map((track, i) => (
              <TrackCard
                key={track.youtubeId || i}
                track={track}
                index={i}
                queue={results}
                showIndex={true}
              />
            ))}
          </div>
        </section>
      )}

      {!query && !loading && (
        <div>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
            Popular artists
          </h2>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setQuery(s)}
                className="px-4 py-2 rounded-full bg-surface-2 border border-white/5 text-text-secondary text-sm hover:border-accent/30 hover:text-text-primary transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && query && results.length === 0 && !error && debouncedQuery === query && (
        <div className="text-center py-12">
          <p className="text-text-secondary text-sm">No results found for "{query}"</p>
          <p className="text-text-muted text-xs mt-1">Try a different search term</p>
        </div>
      )}
    </div>
  );
}
