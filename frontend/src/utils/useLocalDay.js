// Recompute local-date summaries at midnight and when a backgrounded tab becomes active.
import { useEffect, useState } from 'react';

const dayKey = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

export default function useLocalDay() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer;
    const refresh = () => {
      const current = new Date();
      setNow((previous) => dayKey(previous) === dayKey(current) ? previous : current);
      window.clearTimeout(timer);
      const nextMidnight = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);
      timer = window.setTimeout(refresh, Math.max(1, nextMidnight.getTime() - current.getTime() + 50));
    };
    const refreshWhenVisible = () => {
      if (!document.hidden) refresh();
    };

    refresh();
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('focus', refreshWhenVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('focus', refreshWhenVisible);
    };
  }, []);

  return now;
}
