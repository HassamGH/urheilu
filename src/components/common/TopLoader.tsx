import { useEffect, useRef, useState } from 'react';

export function TopLoader({ loading }: { loading: boolean }) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const wasLoading = useRef(false);

  useEffect(() => {
    if (loading) {
      wasLoading.current = true;
      setVisible(true);
      setProgress(0);
      const raf = requestAnimationFrame(() => setProgress(85));
      return () => cancelAnimationFrame(raf);
    }

    if (wasLoading.current) {
      wasLoading.current = false;
      setProgress(100);
      const hideTimer = window.setTimeout(() => setVisible(false), 300);
      const resetTimer = window.setTimeout(() => setProgress(0), 600);
      return () => {
        window.clearTimeout(hideTimer);
        window.clearTimeout(resetTimer);
      };
    }
  }, [loading]);

  return (
    <div className="fixed top-0 left-0 w-full h-0.75 z-60 overflow-hidden pointer-events-none" role="status" aria-label="Loading">
      <div
        className="h-full bg-white transition-all ease-out"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
          transitionDuration: loading ? '4000ms' : '300ms'
        }}
      />
    </div>
  );
}
