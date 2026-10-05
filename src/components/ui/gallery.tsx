import { ChevronLeft, ChevronRight, Expand, ImageOff } from 'lucide-react';
import { animate, m, useMotionValue, useReducedMotion, type PanInfo } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { cn } from '@/lib/cn';
import { smallPhoto } from '@/lib/photos';
import { motion } from '@/styles/tokens';
import { IconButton } from './icon-button';

export interface GalleryPhoto {
  id: string;
  url: string;
  alt: string;
  /** What the photo shows, e.g. "Rear" or "Existing damage". */
  label?: string;
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const widthOf = (node: HTMLElement | null) => node?.offsetWidth ?? 0;

/** How far a swipe's speed carries on, in seconds of travel: a quick flick passes more than one photo. */
const MOMENTUM = 0.2;

interface SwipeTrackProps {
  count: number;
  index: number;
  onIndexChange: (index: number) => void;
  renderSlide: (index: number) => ReactNode;
  /** A tap or click on the current slide, not a swipe. */
  onTap?: () => void;
  /** Names each slide for screen readers, e.g. "3 of 8: Rear". */
  slideLabel: (index: number) => string;
  className?: string;
}

/**
 * A row of full-width slides that follows a swipe or drag and then glides, with the swipe's momentum, to
 * the nearest slide (plan §12.4). Used by Gallery and Lightbox. Transform only. The drag needs Motion's
 * `domMax` features (`MaxMotion`); without them the slides still change with the buttons and keys.
 */
export function SwipeTrack({
  count,
  index,
  onIndexChange,
  renderSlide,
  onTap,
  slideLabel,
  className,
}: SwipeTrackProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const reduceMotion = useReducedMotion();
  const dragged = useRef(false);
  const mounted = useRef(false);
  // The speed a swipe ended with, so the glide to the next slide carries it on.
  const flingVelocity = useRef(0);

  useLayoutEffect(() => {
    const target = -index * widthOf(viewportRef.current);
    const velocity = flingVelocity.current;
    flingVelocity.current = 0;
    if (!mounted.current || reduceMotion) {
      mounted.current = true;
      x.set(target);
      return;
    }
    const controls = animate(x, target, { ...motion.spring.gentle, velocity });
    return () => controls.stop();
  }, [index, reduceMotion, x]);

  // Keep the current slide in place when the window changes size.
  useEffect(() => {
    const onResize = () => x.set(-index * widthOf(viewportRef.current));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [index, x]);

  const onDragEnd = (_event: unknown, info: PanInfo) => {
    const width = widthOf(viewportRef.current) || 1;
    const projected = x.get() + info.velocity.x * MOMENTUM;
    const next = clamp(Math.round(-projected / width), 0, count - 1);
    if (next !== index) {
      flingVelocity.current = info.velocity.x;
      onIndexChange(next);
    } else if (reduceMotion) {
      x.set(-index * width);
    } else {
      animate(x, -index * width, { ...motion.spring.gentle, velocity: info.velocity.x });
    }
  };

  return (
    <div ref={viewportRef} className={cn('relative overflow-hidden', className)}>
      <m.div
        className="flex h-full"
        style={{ x, width: `${count * 100}%` }}
        drag={count > 1 ? 'x' : false}
        dragConstraints={viewportRef}
        dragElastic={0.14}
        dragMomentum={false}
        onPointerDown={() => {
          dragged.current = false;
        }}
        onDragStart={() => {
          dragged.current = true;
        }}
        onDragEnd={onDragEnd}
        onClick={() => {
          if (!dragged.current) onTap?.();
        }}
      >
        {Array.from({ length: count }, (_, slide) => (
          <div
            key={slide}
            role="group"
            aria-roledescription="slide"
            aria-label={slideLabel(slide)}
            aria-hidden={slide !== index || undefined}
            className="h-full"
            style={{ width: `${100 / count}%` }}
          >
            {renderSlide(slide)}
          </div>
        ))}
      </m.div>
    </div>
  );
}

interface GalleryProps {
  photos: readonly GalleryPhoto[];
  index: number;
  onIndexChange: (index: number) => void;
  /** Opens the full-screen view (Lightbox) at the current photo. */
  onOpen?: () => void;
  /** Names the gallery, e.g. "Photos of the 2022 Toyota RAV4". */
  label: string;
  /**
   * The first photo's `view-transition-name`, so the photo on the card that was tapped morphs into it
   * (plan §12.4).
   */
  transitionName?: string;
  /** The photo frame, which the Lightbox grows from and shrinks back into. */
  frameRef?: Ref<HTMLDivElement>;
  className?: string;
}

const overlayButton =
  'bg-surface/90 text-ink shadow-card hover:bg-surface hover:text-ink opacity-0 transition-[opacity,background-color,scale] group-hover/gallery:opacity-100 focus-visible:opacity-100 pointer-coarse:hidden';

/**
 * The listing's photo gallery (spec §6): swipe or drag between photos, with momentum; arrow buttons on
 * hover and arrow keys; thumbnails on larger screens. Tapping a photo, or the expand button, opens it full
 * screen. Photos load as they come near, apart from the first.
 */
export function Gallery({
  photos,
  index,
  onIndexChange,
  onOpen,
  label,
  transitionName,
  frameRef,
  className,
}: GalleryProps) {
  const count = photos.length;
  const current = photos[index];
  const go = (next: number) => onIndexChange(clamp(next, 0, count - 1));
  const slideLabel = (slide: number) =>
    [`${slide + 1} of ${count}`, photos[slide]?.label].filter(Boolean).join(': ');

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const moves: Record<string, number | undefined> = {
      ArrowLeft: index - 1,
      ArrowRight: index + 1,
      Home: 0,
      End: count - 1,
    };
    const next = moves[event.key];
    if (next === undefined || count < 2) return;
    event.preventDefault();
    go(next);
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn('group/gallery', className)}
    >
      <div
        ref={frameRef}
        className="relative aspect-4/3 overflow-hidden bg-ink/6 sm:aspect-3/2 sm:rounded-sheet"
      >
        {count === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted">
            <ImageOff aria-hidden="true" className="size-8" />
            <p className="text-sm">Photos are on their way</p>
          </div>
        ) : (
          <SwipeTrack
            className="h-full cursor-grab active:cursor-grabbing"
            count={count}
            index={index}
            onIndexChange={go}
            onTap={onOpen}
            slideLabel={slideLabel}
            renderSlide={(slide) => {
              const photo = photos[slide];
              if (!photo) return null;
              return (
                <img
                  src={photo.url}
                  alt={photo.alt}
                  draggable={false}
                  // The first photo, and the ones either side of the current one, load straight away.
                  loading={slide === 0 || Math.abs(slide - index) <= 1 ? 'eager' : 'lazy'}
                  fetchPriority={slide === 0 ? 'high' : undefined}
                  decoding="async"
                  width={1200}
                  height={800}
                  className="size-full object-cover select-none"
                  style={slide === 0 && transitionName ? { viewTransitionName: transitionName } : undefined}
                />
              );
            }}
          />
        )}

        {count > 1 && (
          <>
            <IconButton
              label="Previous photo"
              tooltip="none"
              disabled={index === 0}
              onClick={() => go(index - 1)}
              className={cn(overlayButton, 'absolute top-1/2 left-3 -translate-y-1/2 disabled:opacity-0')}
            >
              <ChevronLeft aria-hidden="true" />
            </IconButton>
            <IconButton
              label="Next photo"
              tooltip="none"
              disabled={index === count - 1}
              onClick={() => go(index + 1)}
              className={cn(overlayButton, 'absolute top-1/2 right-3 -translate-y-1/2 disabled:opacity-0')}
            >
              <ChevronRight aria-hidden="true" />
            </IconButton>
          </>
        )}

        {count > 0 && (
          <>
            {onOpen && (
              <IconButton
                label="View photos full screen"
                tooltip="none"
                onClick={onOpen}
                className="absolute top-3 right-3 bg-surface/90 text-ink shadow-card hover:bg-surface hover:text-ink"
              >
                <Expand aria-hidden="true" />
              </IconButton>
            )}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-3 bottom-3 flex items-end justify-between gap-3"
            >
              {current?.label ? (
                <span className="rounded-full bg-ink/70 px-2.5 py-1 text-xs font-medium text-canvas">
                  {current.label}
                </span>
              ) : (
                <span />
              )}
              <span className="rounded-full bg-ink/70 px-2.5 py-1 text-xs font-medium text-canvas tabular-nums">
                {index + 1} / {count}
              </span>
            </div>
          </>
        )}
        <p aria-live="polite" className="sr-only">
          {count > 0 ? `Photo ${slideLabel(index)}` : ''}
        </p>
      </div>

      {count > 1 && (
        <ul
          aria-label="Choose a photo"
          className="scrollbar-subtle mt-3 hidden gap-2 overflow-x-auto pb-1 sm:flex"
        >
          {photos.map((photo, slide) => (
            <li key={photo.id} className="shrink-0">
              <button
                type="button"
                aria-label={`Show photo ${slideLabel(slide)}`}
                aria-current={slide === index || undefined}
                onClick={() => go(slide)}
                className={cn(
                  'block h-14 w-20 overflow-hidden rounded-control ring-2 ring-transparent ring-offset-2 ring-offset-canvas',
                  'opacity-70 transition-[opacity,scale] duration-120 ease-out hover:opacity-100 active:scale-95',
                  'aria-current:opacity-100 aria-current:ring-primary',
                )}
              >
                <img
                  src={smallPhoto(photo.url)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width={160}
                  height={112}
                  className="size-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
