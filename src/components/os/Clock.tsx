import { useEffect, useState } from 'react';

const ZONES = [
  { code: 'TOR', name: 'Toronto', tz: 'America/Toronto' },
  { code: 'NYC', name: 'New York', tz: 'America/New_York' },
  { code: 'SF', name: 'San Francisco', tz: 'America/Los_Angeles' },
] as const;

function timeIn(tz: string, now: Date): string {
  try {
    return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz }).format(now);
  } catch {
    return '--:--';
  }
}

/** The time-zone ticker in the menu bar. Blank on the server so hydration always matches. */
export default function Clock({ className = '' }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    // Tick on the minute, not every second: the display only shows minutes.
    let interval: number | undefined;
    const untilNextMinute = 60_000 - (Date.now() % 60_000);
    const timeout = window.setTimeout(() => {
      setNow(new Date());
      interval = window.setInterval(() => setNow(new Date()), 60_000);
    }, untilNextMinute);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);

  return (
    <p className={`flex gap-3 tabular-nums ${className}`}>
      {ZONES.map((zone) => (
        <span key={zone.code} className="whitespace-nowrap">
          <abbr title={zone.name} className="text-muted no-underline">
            {zone.code}
          </abbr>{' '}
          <time>{now ? timeIn(zone.tz, now) : '--:--'}</time>
        </span>
      ))}
    </p>
  );
}
