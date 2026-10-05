/*
 * Phone photos are resized in the browser before upload, so uploads are quick on mobile data (plan §12.5),
 * and checked for the problems support staff look for: too small, too dark or blurry (plan §9, Days 8–11).
 * A flag never blocks the upload. It's shown to the Host with advice to retake, and to staff in the
 * listing review queue.
 */

export type PhotoQualityFlag = 'OK' | 'LOW_RES' | 'DARK' | 'BLURRY';

export interface PhotoLimits {
  minWidthPx: number;
  minHeightPx: number;
}

/** Uploads are at most this many pixels on the long side, as JPEG. */
export const MAX_PHOTO_EDGE = 2000;
/** JPEG quality for resized photos: visually lossless for listing photos, a fraction of the size. */
export const JPEG_QUALITY = 0.86;
/** The long side of the small copy the checks run on: enough detail to judge focus, quick on any phone. */
export const ANALYSIS_EDGE = 512;
/** Average brightness (0–255) below which a photo counts as dark. Daylight photos of a car sit around 100–150. */
export const DARK_BELOW = 55;
/**
 * Variance of the Laplacian (edge strength) below which a photo counts as blurry, measured on the
 * ANALYSIS_EDGE copy. In focus, a car's edges, badges and reflections score in the hundreds.
 */
export const BLURRY_BELOW = 50;

/** The size that fits within `maxEdge` on the long side, keeping the shape. Never enlarges. */
export function fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Too small for the listing, whichever way round it was taken. */
export function isLowResolution(width: number, height: number, limits: PhotoLimits): boolean {
  const longSide = Math.max(width, height);
  const shortSide = Math.min(width, height);
  return (
    longSide < Math.max(limits.minWidthPx, limits.minHeightPx) ||
    shortSide < Math.min(limits.minWidthPx, limits.minHeightPx)
  );
}

/** Perceived brightness (Rec. 601 luma) of each pixel of RGBA data, 0–255. */
export function toGreyscale(rgba: ArrayLike<number>, width: number, height: number): Float32Array {
  const grey = new Float32Array(width * height);
  for (let pixel = 0; pixel < grey.length; pixel += 1) {
    const offset = pixel * 4;
    grey[pixel] =
      0.299 * (rgba[offset] ?? 0) + 0.587 * (rgba[offset + 1] ?? 0) + 0.114 * (rgba[offset + 2] ?? 0);
  }
  return grey;
}

export function meanBrightness(grey: Float32Array): number {
  if (grey.length === 0) return 0;
  let total = 0;
  for (const value of grey) total += value;
  return total / grey.length;
}

/**
 * How sharp the picture is: the variance of the Laplacian (each pixel against its four neighbours). Sharp
 * edges give large responses of both signs, so a high variance; a blurred picture gives small ones.
 */
export function laplacianVariance(grey: Float32Array, width: number, height: number): number {
  if (width < 3 || height < 3) return 0;
  let sum = 0;
  let sumOfSquares = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const at = y * width + x;
      const response =
        (grey[at - width] ?? 0) +
        (grey[at + width] ?? 0) +
        (grey[at - 1] ?? 0) +
        (grey[at + 1] ?? 0) -
        4 * (grey[at] ?? 0);
      sum += response;
      sumOfSquares += response * response;
      count += 1;
    }
  }
  const mean = sum / count;
  return sumOfSquares / count - mean * mean;
}

export interface PhotoMetrics {
  /** The photo as taken, before resizing. */
  width: number;
  height: number;
  /** Average brightness, 0–255. */
  brightness: number;
  /** Variance of the Laplacian on the analysis copy. */
  sharpness: number;
}

/** The one flag to report, most useful first: a small photo can't be fixed by better light. */
export function photoQualityFlag(metrics: PhotoMetrics, limits: PhotoLimits): PhotoQualityFlag {
  if (isLowResolution(metrics.width, metrics.height, limits)) return 'LOW_RES';
  if (metrics.brightness < DARK_BELOW) return 'DARK';
  if (metrics.sharpness < BLURRY_BELOW) return 'BLURRY';
  return 'OK';
}

/** Measures RGBA pixels of the analysis copy. */
export function analysePixels(rgba: ArrayLike<number>, width: number, height: number) {
  const grey = toGreyscale(rgba, width, height);
  return { brightness: meanBrightness(grey), sharpness: laplacianVariance(grey, width, height) };
}

/** What the browser does with pixels, kept apart so the logic can be tested without a canvas. */
export interface ImageTools<Image> {
  /** Reads the file, turned upright from its EXIF orientation. Rejects when the browser can't (often HEIC). */
  decode(file: Blob): Promise<{ image: Image; width: number; height: number; release: () => void }>;
  toJpeg(image: Image, width: number, height: number): Promise<Blob>;
  /** RGBA pixels of the image drawn at this size. */
  pixels(image: Image, width: number, height: number): ArrayLike<number>;
}

function drawn(image: CanvasImageSource, width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas is not available');
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, width, height);
  return { canvas, context };
}

export const browserImageTools: ImageTools<ImageBitmap> = {
  async decode(file) {
    const image = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return { image, width: image.width, height: image.height, release: () => image.close() };
  },
  toJpeg(image, width, height) {
    const { canvas } = drawn(image, width, height);
    return new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the photo'))),
        'image/jpeg',
        JPEG_QUALITY,
      ),
    );
  },
  pixels(image, width, height) {
    return drawn(image, width, height).context.getImageData(0, 0, width, height).data;
  },
};

export interface PreparedPhoto {
  /** What to upload: a resized JPEG, or the original when the browser couldn't read it. */
  file: Blob;
  contentType: string;
  /** The uploaded image's size, when known. */
  width?: number;
  height?: number;
  qualityFlag: PhotoQualityFlag;
  /** False when the browser couldn't read the photo, so it goes up as it is, unchecked. */
  checked: boolean;
}

/**
 * Resizes a photo to at most MAX_PHOTO_EDGE on the long side as JPEG, and runs the checks. A photo the
 * browser can't decode (HEIC outside Safari) is uploaded as it is: the API accepts HEIC and converts it.
 */
export async function preparePhoto<Image>(
  file: Blob,
  limits: PhotoLimits,
  tools: ImageTools<Image>,
  contentType = file.type,
): Promise<PreparedPhoto> {
  let decoded: Awaited<ReturnType<ImageTools<Image>['decode']>>;
  try {
    decoded = await tools.decode(file);
  } catch {
    return { file, contentType, qualityFlag: 'OK', checked: false };
  }
  try {
    const target = fitWithin(decoded.width, decoded.height, MAX_PHOTO_EDGE);
    const small = fitWithin(decoded.width, decoded.height, ANALYSIS_EDGE);
    const { brightness, sharpness } = analysePixels(
      tools.pixels(decoded.image, small.width, small.height),
      small.width,
      small.height,
    );
    const qualityFlag = photoQualityFlag(
      { width: decoded.width, height: decoded.height, brightness, sharpness },
      limits,
    );
    const resized = await tools.toJpeg(decoded.image, target.width, target.height);
    return { file: resized, contentType: 'image/jpeg', ...target, qualityFlag, checked: true };
  } catch {
    // A browser that can read the photo but not draw it (rare) still uploads it as it is.
    return { file, contentType, qualityFlag: 'OK', checked: false };
  } finally {
    decoded.release();
  }
}
