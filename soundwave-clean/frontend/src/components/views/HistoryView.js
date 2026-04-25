'use client';
import { useState, useEffect } from 'react';
import { Clock, Play } from 'lucide-react';
import { getHistory } from '../../lib/api';
import { usePlayerStore } from '../../store';
import TrackCard from '../ui/TrackCard';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function HistoryView() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setQueue, setIsPlaying } = usePlayerStore();

  useEffect(() => {
    getHistory(100)
      .then((data) => setHistory(data.history || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  const tracks = history.map((h) => h.track).filter(Boolean);

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-8">
        <Clock size={28} className="text-accent" />
        <div>
          <h1 className="text-2xl font-bold text-text-primary"
            style={{ fontFamily: "'Playfair Display', serif" }}>
            Recently Played
          </h1>
          <p className="text-text-muted text-sm">{history.length} plays</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-14 bg-surface-2 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-20">
          <Clock size={48} className="text-text-muted mx-auto mb-4" />
          <p className="text-text-secondary text-lg">No history yet</p>
          <p className="text-text-muted text-sm mt-1">Start listening to build your history</p>
        </div>
      ) : (
        <div className="space-y-1">
          {history.map((item, i) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="w-16 text-right flex-shrink-0">
                <span className="text-xs text-text-muted">{timeAgo(item.playedAt)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <TrackCard
                  track={item.track}
                  queue={tracks}
                  index={i}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
