import { describe, expect, it } from 'vitest';
import { shrinkPhoto, type ImageTools } from './image-resize';

const DOCUMENT = { maxEdge: 3000, quality: 0.85 };
const original = new Blob(['x'.repeat(5_000)], { type: 'image/jpeg' });

/** Image tools that read any photo at this size, and record what they do. */
function tools(width: number, height: number, encodedSize = 100) {
  const calls: string[] = [];
  const fake: ImageTools<string> = {
    decode: async () => ({ image: 'bitmap', width, height, release: () => calls.push('release') }),
    pixels: () => [],
    toJpeg: async (_image, w, h, quality) => {
      calls.push(`jpeg ${w}x${h} at ${quality}`);
      return new Blob(['x'.repeat(encodedSize)], { type: 'image/jpeg' });
    },
  };
  return { fake, calls };
}

describe('shrinkPhoto', () => {
  it('fits a photo within the long side as JPEG, either way round, and lets the image go', async () => {
    const landscape = tools(4032, 3024);
    const shrunk = await shrinkPhoto(original, 'image/jpeg', DOCUMENT, landscape.fake);
    expect(shrunk.contentType).toBe('image/jpeg');
    expect(shrunk.file.size).toBe(100);
    expect(landscape.calls).toEqual(['jpeg 3000x2250 at 0.85', 'release']);

    const portrait = tools(3024, 4032);
    await shrinkPhoto(original, 'image/heic', DOCUMENT, portrait.fake);
    expect(portrait.calls[0]).toBe('jpeg 2250x3000 at 0.85');
  });

  it('never enlarges a small photo, but still sends the lighter JPEG', async () => {
    const small = tools(1200, 900);
    const shrunk = await shrinkPhoto(original, 'image/png', DOCUMENT, small.fake);
    expect(small.calls[0]).toBe('jpeg 1200x900 at 0.85');
    expect(shrunk.contentType).toBe('image/jpeg');
  });

  it('sends the original when the copy would be no smaller', async () => {
    const heavy = tools(4032, 3024, 5_000);
    expect(await shrinkPhoto(original, 'image/jpeg', DOCUMENT, heavy.fake)).toEqual({
      file: original,
      contentType: 'image/jpeg',
    });
    expect(heavy.calls).toContain('release');
  });

  it('leaves a PDF alone, and sends a photo the browser can’t read or draw as it is', async () => {
    const pdf = new Blob(['%PDF'], { type: 'application/pdf' });
    const unused = tools(4032, 3024);
    expect(await shrinkPhoto(pdf, 'application/pdf', DOCUMENT, unused.fake)).toEqual({
      file: pdf,
      contentType: 'application/pdf',
    });
    expect(unused.calls).toEqual([]);

    const heic = new Blob(['heic'], { type: 'image/heic' });
    const unreadable: ImageTools<never> = {
      decode: () => Promise.reject(new Error('Unsupported')),
      pixels: () => [],
      toJpeg: () => Promise.reject(new Error('never')),
    };
    expect(await shrinkPhoto(heic, 'image/heic', DOCUMENT, unreadable)).toEqual({
      file: heic,
      contentType: 'image/heic',
    });

    const calls: string[] = [];
    const undrawable: ImageTools<string> = {
      decode: async () => ({
        image: 'bitmap',
        width: 4032,
        height: 3024,
        release: () => calls.push('release'),
      }),
      pixels: () => [],
      toJpeg: () => Promise.reject(new Error('Canvas is not available')),
    };
    expect(await shrinkPhoto(original, 'image/jpeg', DOCUMENT, undrawable)).toEqual({
      file: original,
      contentType: 'image/jpeg',
    });
    expect(calls).toEqual(['release']);
  });
});
