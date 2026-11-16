// Mounts a WebGL effect only while it's the biggest one on screen (see lib/gl-budget.ts).
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
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const slot = joinGlBudget(el, () => setActive(slot.active()), priority);
    return slot.leave;
  }, [priority]);
  return (
    <div ref={ref} className={`gl-gate ${className}`.trim()}>
      {active ? children : fallback}
    </div>
  );
}
