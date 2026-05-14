import { useEffect, useRef, useState } from 'react';

/**
 * Smoothly count from previousValue → value over `duration` ms when value
 * changes. On first render, ramps from 0 → value so the hero feels alive.
 * Pure number animation; rendering is the parent's job (we just supply the
 * current numeric value as children-like via `format(current)`).
 */
export default function AnimatedNumber({ value, format, duration = 700 }) {
  const [current, setCurrent] = useState(value);
  const fromRef = useRef(0);
  const rafRef = useRef(0);
  const startRef = useRef(0);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    fromRef.current = current;
    startRef.current = performance.now();
    const target = Number(value) || 0;

    const tick = (now) => {
      const t = Math.min(1, (now - startRef.current) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const next = fromRef.current + (target - fromRef.current) * eased;
      setCurrent(next);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <>{format ? format(current) : current}</>;
}
