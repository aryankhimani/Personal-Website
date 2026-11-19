import { lazy, Suspense, useEffect, useState } from 'react';
import { useLite } from '../../lib/device-tier';

// The split-flap tiles only load on desktop and outside Lite mode.
const Flap = lazy(() => import('./ClockFlap'));

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

/** The time-zone ticker in the menu bar, on split-flap tiles. Blank on the server so hydration matches. */
export default function Clock({ className = '', flaps = true }: { className?: string; flaps?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);
  const lite = useLite();

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
    <div className={`flex gap-3 tabular-nums ${className}`}>
      {ZONES.map((zone) => {
        const t = now ? timeIn(zone.tz, now) : '--:--';
        return (
          <span key={zone.code} className="flex items-center gap-1 whitespace-nowrap">
            <abbr title={zone.name} className="text-muted no-underline">
              {zone.code}
            </abbr>{' '}
            {flaps && !lite && now ? (
              <Suspense fallback={<time>{t}</time>}>
                <Flap text={t} />
              </Suspense>
            ) : (
              <time>{t}</time>
            )}
          </span>
        );
      })}
    </div>
  );
}
