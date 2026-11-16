// Two old-computer details for the menu bar: an ASCII battery and an uptime counter.
// The battery reads the real battery where the browser shares it (Chromium); elsewhere it
// just says it's plugged in. Uptime is how long this tab has been open.
import { useEffect, useState } from 'react';

type BatteryLike = { level: number; charging: boolean; addEventListener: (t: string, f: () => void) => void };

function bar(level: number) {
  const n = Math.round(level * 6);
  return `[${'|'.repeat(n)}${' '.repeat(6 - n)}]`;
}

const pad = (n: number) => String(n).padStart(2, '0');

export default function SysTray() {
  const [battery, setBattery] = useState<{ level: number; charging: boolean } | null>(null);
  const [up, setUp] = useState(0);

  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryLike> };
    nav
      .getBattery?.()
      .then((b) => {
        const read = () => setBattery({ level: b.level, charging: b.charging });
        read();
        b.addEventListener('levelchange', read);
        b.addEventListener('chargingchange', read);
      })
      .catch(() => {});
    const start = performance.timeOrigin;
    const tick = () => setUp(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const h = Math.floor(up / 3600);
  const m = Math.floor((up % 3600) / 60);
  const s = up % 60;
  const uptime = `${h ? `${h}:` : ''}${pad(m)}:${pad(s)}`;

  return (
    <p className="systray" aria-hidden="true">
      <span title="Time on this page" className="systray-up">
        up {uptime}
      </span>
      <span title={battery ? `Battery ${Math.round(battery.level * 100)}%` : 'Power'} className="systray-batt">
        {battery ? (
          <>
            {bar(battery.level)}
            {battery.charging ? '+' : ''} {Math.round(battery.level * 100)}%
          </>
        ) : (
          '[||||||]+ AC'
        )}
      </span>
    </p>
  );
}
