import { useCallback, useEffect, useRef, useState } from 'react';

// Tracks an element's content size in CSS px. Returns a callback ref.
export function useSize() {
  const [size, setSize] = useState(null);
  const observer = useRef(null);
  const ref = useCallback((el) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!el) return;
    observer.current = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((s) => (s && s.width === width && s.height === height ? s : { width, height }));
    });
    observer.current.observe(el);
  }, []);
  useEffect(() => () => observer.current?.disconnect(), []);
  return [ref, size];
}
