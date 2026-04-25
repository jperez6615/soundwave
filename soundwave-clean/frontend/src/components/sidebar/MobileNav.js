'use client';
import { Home, Search, Heart, Clock, ListMusic } from 'lucide-react';
import { useUIStore } from '../../store';
import clsx from 'clsx';

const NAV_ITEMS = [
  { icon: Home, label: 'Home', view: 'home' },
  { icon: Search, label: 'Search', view: 'search' },
  { icon: Heart, label: 'Liked', view: 'liked' },
  { icon: Clock, label: 'History', view: 'history' },
];

export default function MobileNav() {
  const { activeView, setView } = useUIStore();

  return (
    <div className="glass border-t border-white/5 safe-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map(({ icon: Icon, label, view }) => (
          <button
            key={view}
            onClick={() => setView(view)}
            className={clsx(
              'flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all',
              activeView === view
                ? 'text-accent'
                : 'text-text-muted'
            )}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
