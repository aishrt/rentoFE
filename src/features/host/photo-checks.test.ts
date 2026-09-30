import { describe, expect, it } from 'vitest';
import {
  ANALYSIS_EDGE,
  MAX_PHOTO_EDGE,
  analysePixels,
  fitWithin,
  isLowResolution,
  photoQualityFlag,
  preparePhoto,
  type ImageTools,
} from './photo-checks';

const limits = { minWidthPx: 1200, minHeightPx: 800 };

/** RGBA pixels from a function of x and y giving a grey level. */
function image(width: number, height: number, grey: (x: number, y: number) => number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const value = grey(x, y);
      data.set([value, value, value, 255], offset);
    }
  }
  return data;
}

// A sharp, well-lit scene: black and white squares, like a badge or panel edges in focus.
const sharp = image(64, 48, (x, y) => ((Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? 230 : 40));
// The same brightness with no edges at all: a smooth gradient, as a photo out of focus looks.
const blurry = image(64, 48, (x) => 110 + x);
// A photo taken at night.
const dark = image(64, 48, (x, y) => ((Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? 50 : 5));

describe('photo checks', () => {
  it('passes a sharp, bright photo at full size', () => {
    const metrics = analysePixels(sharp, 64, 48);
    expect(photoQualityFlag({ width: 4032, height: 3024, ...metrics }, limits)).toBe('OK');
  });

  it('flags a dark photo', () => {
    const metrics = analysePixels(dark, 64, 48);
    expect(metrics.brightness).toBeLessThan(55);
    expect(photoQualityFlag({ width: 4032, height: 3024, ...metrics }, limits)).toBe('DARK');
  });

  it('flags a blurry photo from its low Laplacian variance', () => {
    const metrics = analysePixels(blurry, 64, 48);
    expect(metrics.sharpness).toBeLessThan(1);
    expect(analysePixels(sharp, 64, 48).sharpness).toBeGreaterThan(1000);
    expect(photoQualityFlag({ width: 4032, height: 3024, ...metrics }, limits)).toBe('BLURRY');
  });

  it('flags a photo smaller than the minimum in settings, either way round', () => {
    const metrics = analysePixels(sharp, 64, 48);
    expect(photoQualityFlag({ width: 1000, height: 750, ...metrics }, limits)).toBe('LOW_RES');
    expect(isLowResolution(1200, 800, limits)).toBe(false);
    // Portrait: the long side still reaches 1200 and the short side 800.
    expect(isLowResolution(800, 1200, limits)).toBe(false);
    expect(isLowResolution(1200, 700, limits)).toBe(true);
  });

  it('reports the size problem first, since better light cannot fix it', () => {
    const metrics = analysePixels(dark, 64, 48);
    expect(photoQualityFlag({ width: 640, height: 480, ...metrics }, limits)).toBe('LOW_RES');
  });

  it('fits a photo within the long side without enlarging it', () => {
    expect(fitWithin(4032, 3024, MAX_PHOTO_EDGE)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(3024, 4032, MAX_PHOTO_EDGE)).toEqual({ width: 1500, height: 2000 });
    expect(fitWithin(1600, 1200, MAX_PHOTO_EDGE)).toEqual({ width: 1600, height: 1200 });
  });
});

describe('preparePhoto', () => {
  const photo = new Blob(['photo'], { type: 'image/jpeg' });

  it('resizes to 2000 px as JPEG and checks a small copy', async () => {
    const calls: string[] = [];
    const tools: ImageTools<string> = {
      decode: async () => ({
        image: 'bitmap',
        width: 4032,
        height: 3024,
        release: () => calls.push('release'),
      }),
      pixels: (_image, width, height) => {
        calls.push(`pixels ${width}x${height}`);
        return image(width, height, (x, y) => ((Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? 230 : 40));
      },
      toJpeg: async (_image, width, height) => {
        calls.push(`jpeg ${width}x${height}`);
        return new Blob(['resized'], { type: 'image/jpeg' });
      },
    };

    const prepared = await preparePhoto(photo, limits, tools);

    expect(prepared).toMatchObject({
      width: 2000,
      height: 1500,
      contentType: 'image/jpeg',
      qualityFlag: 'OK',
    });
    expect(prepared.checked).toBe(true);
    expect(calls).toEqual([`pixels ${ANALYSIS_EDGE}x384`, 'jpeg 2000x1500', 'release']);
  });

  it('uploads a HEIC photo the browser cannot read as it is, unchecked', async () => {
    const heic = new Blob(['heic'], { type: 'image/heic' });
    const tools: ImageTools<never> = {
      decode: () => Promise.reject(new Error('Unsupported')),
      pixels: () => [],
      toJpeg: () => Promise.reject(new Error('never')),
    };

    const prepared = await preparePhoto(heic, limits, tools, 'image/heic');

    expect(prepared).toEqual({ file: heic, contentType: 'image/heic', qualityFlag: 'OK', checked: false });
  });
});
