import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useLayoutEffect, useRef, type KeyboardEvent, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { motion } from '@/styles/tokens';
import { ModalPanel } from './bottom-sheet';
import { SwipeTrack, type GalleryPhoto } from './gallery';
import { IconButton } from './icon-button';

interface LightboxProps {
  photos: readonly GalleryPhoto[];
  open: boolean;
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  /** Names the dialog, e.g. "Photos of the 2022 Toyota RAV4". */
  label: string;
  /** The gallery's photo frame: the lightbox grows out of it and shrinks back into it. */
  originRef?: RefObject<HTMLElement | null>;
}

const easing = (curve: readonly number[]) => `cubic-bezier(${curve.join(', ')})`;

/** The transform that puts `element` exactly over `origin`, for a FLIP animation. */
function transformFrom(origin: HTMLElement, element: HTMLElement): string {
  const from = origin.getBoundingClientRect();
  const to = element.getBoundingClientRect();
  if (to.width === 0) return 'none';
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  return `translate(${dx}px, ${dy}px) scale(${from.width / to.width})`;
}

/**
 * Photos full screen (plan §12.4): the view grows out of the photo that was tapped and shrinks back into
 * the gallery on close. Swipe, the arrow buttons or the arrow keys move between photos; Escape or the close
 * button closes it. The counter says where you are. The growth is a FLIP with the Web Animations API,
 * transform and opacity only, and is skipped with reduced motion.
 */
export function Lightbox(props: LightboxProps) {
  if (!props.open) return null;
  return createPortal(<LightboxLayer {...props} />, document.body);
}

function LightboxLayer({ photos, index, onIndexChange, onClose, label, originRef }: LightboxProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const reduceMotion = useReducedMotion();
  const count = photos.length;
  const current = photos[index];

  const canAnimate = (element: HTMLElement | null): element is HTMLElement =>
    Boolean(element && originRef?.current && !reduceMotion && typeof element.animate === 'function');

  // Grow out of the gallery's photo.
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!canAnimate(frame) || !originRef?.current) return;
    frame.animate(
      [
        { transform: transformFrom(originRef.current, frame), opacity: 0.7 },
        { transform: 'none', opacity: 1 },
      ],
      {
        duration: motion.duration.medium * 1000,
        easing: easing(motion.ease.out),
      },
    );
    // Runs once, as the lightbox opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    const frame = frameRef.current;
    if (!canAnimate(frame) || !originRef?.current) {
      onClose();
      return;
    }
    const timing = {
      duration: motion.duration.short * 1000,
      easing: easing(motion.ease.inOut),
      fill: 'forwards' as const,
    };
    const shrink = frame.animate(
      [{ transform: 'none' }, { transform: transformFrom(originRef.current, frame) }],
      timing,
    );
    backdropRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], timing);
    shrink.onfinish = onClose;
  };

  const go = (next: number) => onIndexChange(Math.min(count - 1, Math.max(0, next)));
  const slideLabel = (slide: number) =>
    [`${slide + 1} of ${count}`, photos[slide]?.label].filter(Boolean).join(': ');

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number | undefined> = {
      ArrowLeft: index - 1,
      ArrowRight: index + 1,
      Home: 0,
      End: count - 1,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    go(next);
  };

  const sideButton =
    'absolute top-1/2 hidden -translate-y-1/2 bg-canvas/10 disabled:opacity-0 sm:inline-flex';

  return (
    <ModalPanel
      onClose={close}
      onKeyDown={onKeyDown}
      aria-label={label}
      className="fixed inset-0 z-60 flex flex-col text-canvas outline-none"
    >
      <div ref={backdropRef} aria-hidden="true" className="absolute inset-0 animate-fade-in bg-ink" />

      <div className="relative flex animate-fade-in items-center justify-between gap-4 px-4 pt-3 sm:px-6">
        <p className="text-sm text-canvas/80">
          <span className="font-semibold text-canvas tabular-nums">
            {index + 1} / {count}
          </span>
          {current?.label && <span> · {current.label}</span>}
        </p>
        <IconButton label="Close photos" tone="on-dark" tooltip="none" onClick={close}>
          <X
            aria-hidden="true"
            className="transition-[rotate] duration-200 ease-out in-[button:hover]:rotate-90"
          />
        </IconButton>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pt-2 pb-8 sm:px-20">
        <div
          ref={frameRef}
          className="aspect-4/3 w-full max-w-[calc((100dvh-9rem)*4/3)] overflow-hidden rounded-card"
        >
          <SwipeTrack
            className="h-full"
            count={count}
            index={index}
            onIndexChange={go}
            slideLabel={slideLabel}
            renderSlide={(slide) => {
              const photo = photos[slide];
              if (!photo) return null;
              return (
                <img
                  src={photo.url}
                  alt={photo.alt}
                  draggable={false}
                  loading={Math.abs(slide - index) <= 1 ? 'eager' : 'lazy'}
                  decoding="async"
                  className="size-full object-contain select-none"
                />
              );
            }}
          />
        </div>
        {count > 1 && (
          <>
            <IconButton
              label="Previous photo"
              tone="on-dark"
              tooltip="none"
              disabled={index === 0}
              onClick={() => go(index - 1)}
              className={cn(sideButton, 'left-4')}
            >
              <ChevronLeft aria-hidden="true" />
            </IconButton>
            <IconButton
              label="Next photo"
              tone="on-dark"
              tooltip="none"
              disabled={index === count - 1}
              onClick={() => go(index + 1)}
              className={cn(sideButton, 'right-4')}
            >
              <ChevronRight aria-hidden="true" />
            </IconButton>
          </>
        )}
        <p aria-live="polite" className="sr-only">
          {`Photo ${slideLabel(index)}`}
        </p>
      </div>
    </ModalPanel>
  );
}
