import { useCallback, useState, type ComponentProps } from 'react';

type PhotoProps = Omit<ComponentProps<'img'>, 'src' | 'placeholder' | 'ref'> & {
  src: string;
  /**
   * A tiny copy of the photo as a data URI, shown blurred until the photo loads (plan §12.5). Without one
   * (photos uploaded before placeholders, the demo cars) the frame's own background shows, as before.
   */
  placeholder?: string;
};

/**
 * A listing photo that shows a blurred copy of itself until it loads, then fades the copy away (at once with
 * reduced motion). The copy fills the nearest positioned parent, so put the photo in a `relative`,
 * `overflow-hidden` frame of its own size, which also clips the blur's soft edges.
 */
export function Photo({ placeholder, src, onLoad, ...props }: PhotoProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  // A photo the browser already has can finish loading before React listens for it.
  const checkLoaded = useCallback(
    (image: HTMLImageElement | null) => {
      if (image?.complete && image.naturalWidth > 0) setLoadedSrc(src);
    },
    [src],
  );

  return (
    <>
      <img
        {...props}
        ref={checkLoaded}
        src={src}
        onLoad={(event) => {
          setLoadedSrc(src);
          onLoad?.(event);
        }}
      />
      {placeholder && (
        <span
          aria-hidden="true"
          data-loaded={loadedSrc === src || undefined}
          className="pointer-events-none absolute inset-0 scale-110 bg-cover bg-center blur-lg transition-[opacity,visibility] duration-320 ease-out data-loaded:invisible data-loaded:opacity-0"
          style={{ backgroundImage: `url("${placeholder}")` }}
        />
      )}
    </>
  );
}
