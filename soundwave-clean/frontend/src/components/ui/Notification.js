'use client';
import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info } from 'lucide-react';
import clsx from 'clsx';

const ICONS = {
  success: <CheckCircle size={16} className="text-green-400" />,
  error: <XCircle size={16} className="text-red-400" />,
  info: <Info size={16} className="text-accent" />,
};

export default function Notification({ notification }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2700);
    return () => clearTimeout(t);
  }, [notification?.id]);

  return (
    <div
      className={clsx(
        'fixed bottom-36 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      )}
    >
      <div className="glass flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border border-white/10 max-w-sm">
        {ICONS[notification.type] || ICONS.info}
        <p className="text-sm text-text-primary">{notification.message}</p>
      </div>
    </div>
  );
}
