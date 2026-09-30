import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';

interface WhenNearProps {
  /** A lazy section: its code and data load only once it's this close to the screen. */
  children: ReactNode;
  /** Shown until then, and while the section's code downloads. */
  placeholder?: ReactNode;
}

/**
 * Renders a lazy section once it comes within a screen or so of the viewport, so its code (its own chunk)
 * and its request stay off the homepage's first load (plan §12.5). Loading starts early enough that the
 * section is usually ready by the time it scrolls into view.
 */
export function WhenNear({ children, placeholder = null }: WhenNearProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setNear(true);
        observer.disconnect();
      },
      { rootMargin: '800px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref}>{near ? <Suspense fallback={placeholder}>{children}</Suspense> : placeholder}</div>;
}
