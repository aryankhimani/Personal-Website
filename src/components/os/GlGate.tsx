// Runs a WebGL effect only while it's the biggest one on screen (see lib/gl-budget.ts).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { joinGlBudget } from '../../lib/gl-budget';

export default function GlGate({
  children,
  fallback = null,
  className = '',
  priority = false,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
  priority?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const slot = joinGlBudget(
      el,
      () => {
        const on = slot.active();
        setActive(on);
        if (on) setStarted(true);
      },
      priority,
    );
    return slot.leave;
  }, [priority]);
  // Creating a WebGL context and compiling shaders costs 100+ ms, so an effect that has run
  // once stays mounted; while another one has the budget its box is hidden (it pauses itself
  // off-screen), which keeps scrolling free of those long tasks.
  return (
    <div ref={ref} className={`gl-gate ${className}`.trim()}>
      {started ? <div className="gl-gate-live" hidden={!active}>{children}</div> : fallback}
      {started && !active ? fallback : null}
    </div>
  );
}
