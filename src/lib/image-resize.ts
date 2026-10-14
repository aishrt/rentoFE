/*
 * Phone photos are made smaller in the browser before they upload, so uploads are quick on mobile data
 * (plan §12.5). Listing photos are resized as they're checked (features/host/photo-checks); documents and
 * other photos go through shrinkPhoto on their way up (features/host/upload).
 */

/** The size that fits within `maxEdge` on the long side, keeping the shape. Never enlarges. */
export function fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** What the browser does with pixels, kept apart so the logic can be tested without a canvas. */
export interface ImageTools<Image> {
  /** Reads the file, turned upright from its EXIF orientation. Rejects when the browser can't (often HEIC). */
  decode(file: Blob): Promise<{ image: Image; width: number; height: number; release: () => void }>;
  /** `quality` from 0 to 1. */
  toJpeg(image: Image, width: number, height: number, quality: number): Promise<Blob>;
  /** RGBA pixels of the image drawn at this size. */
  pixels(image: Image, width: number, height: number): ArrayLike<number>;
}

function drawn(image: CanvasImageSource, width: number, height: number, background?: string) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas is not available');
  if (background) {
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
  }
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, width, height);
  return { canvas, context };
}

export const browserImageTools: ImageTools<ImageBitmap> = {
  async decode(file) {
    const image = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return { image, width: image.width, height: image.height, release: () => image.close() };
  },
  toJpeg(image, width, height, quality) {
    // JPEG has no see-through parts: a screenshot's show white, not black.
    const { canvas } = drawn(image, width, height, '#ffffff');
    return new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the photo'))),
        'image/jpeg',
        quality,
      ),
    );
  },
  pixels(image, width, height) {
    return drawn(image, width, height).context.getImageData(0, 0, width, height).data;
  },
};

export interface ShrinkOptions {
  /** The long side, in pixels. */
  maxEdge: number;
  /** JPEG quality, 0 to 1. */
  quality: number;
}

/**
 * A photo at most `maxEdge` on the long side, as JPEG. Anything that isn't a photo (a PDF) goes up as it is,
 * and so does a photo the browser can't read (HEIC outside Safari: the API converts it) or one the copy
 * wouldn't make smaller.
 */
export async function shrinkPhoto<Image>(
  file: Blob,
  contentType: string,
  { maxEdge, quality }: ShrinkOptions,
  tools: ImageTools<Image>,
): Promise<{ file: Blob; contentType: string }> {
  const original = { file, contentType };
  if (!contentType.startsWith('image/')) return original;
  let decoded: Awaited<ReturnType<ImageTools<Image>['decode']>>;
  try {
    decoded = await tools.decode(file);
  } catch {
    return original;
  }
  try {
    const { width, height } = fitWithin(decoded.width, decoded.height, maxEdge);
    const smaller = await tools.toJpeg(decoded.image, width, height, quality);
    return smaller.size < file.size ? { file: smaller, contentType: 'image/jpeg' } : original;
  } catch {
    // A browser that can read the photo but not draw it (rare) sends it as it is.
    return original;
  } finally {
    decoded.release();
  }
}
