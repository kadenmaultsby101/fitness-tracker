import { useEffect, useRef, useState } from 'react';

// Lightweight pull-to-refresh for a scrollable element. When the user is
// at the top and drags down past `threshold`, fires onRefresh. Returns
// { pull, refreshing } so the caller can render an indicator.
export function usePullToRefresh(scrollRef, onRefresh, { threshold = 70, resetKey } = {}) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const active = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onTouchStart = (e) => {
      if (el.scrollTop <= 0 && !refreshing) {
        startY.current = e.touches[0].clientY;
        active.current = true;
      }
    };
    const onTouchMove = (e) => {
      if (!active.current || startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0 && el.scrollTop <= 0) {
        // Dampen the pull so it feels rubbery.
        setPull(Math.min(threshold * 1.5, dy * 0.5));
      } else {
        setPull(0);
      }
    };
    const onTouchEnd = async () => {
      if (!active.current) return;
      active.current = false;
      startY.current = null;
      if (pull >= threshold && !refreshing) {
        setRefreshing(true);
        setPull(threshold);
        try {
          await onRefresh?.();
        } finally {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [scrollRef, onRefresh, pull, refreshing, threshold, resetKey]);

  return { pull, refreshing };
}
