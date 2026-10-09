import { describe, expect, it } from 'vitest';
import { readExifTakenAt } from './exif';
import { jpegWithExif as jpeg } from './test-fixtures';

describe('readExifTakenAt', () => {
  it('reads when the photo was taken, in the time zone the camera recorded', async () => {
    const file = jpeg({ dateTimeOriginal: '2026:01:05 09:30:00', offsetTimeOriginal: '+13:00' });
    expect(await readExifTakenAt(file)).toBe('2026-01-04T20:30:00.000Z');
    const bigEndian = jpeg({
      dateTimeOriginal: '2026:07:05 18:00:00',
      offsetTimeOriginal: '-04:00',
      littleEndian: false,
    });
    expect(await readExifTakenAt(bigEndian)).toBe('2026-07-05T22:00:00.000Z');
  });

  it('reads a date without a time zone as this device’s local time', async () => {
    const file = jpeg({ dateTimeOriginal: '2026:01:05 09:30:00' });
    expect(await readExifTakenAt(file)).toBe(new Date(2026, 0, 5, 9, 30, 0).toISOString());
  });

  it('falls back to when the photo was digitised', async () => {
    const file = jpeg({ dateTimeDigitized: '2025:12:24 08:15:30', offsetTimeOriginal: '+13:00' });
    expect(await readExifTakenAt(file)).toBe(new Date(2025, 11, 24, 8, 15, 30).toISOString());
  });

  it('has no date for blank or impossible dates', async () => {
    for (const dateTimeOriginal of ['0000:00:00 00:00:00', '    :  :     :  :  ', '2026:02:30 10:00:00']) {
      expect(await readExifTakenAt(jpeg({ dateTimeOriginal }))).toBeUndefined();
    }
  });

  it('has no date for a JPEG without EXIF, a HEIC or a broken file', async () => {
    expect(await readExifTakenAt(jpeg({}))).toBeUndefined();
    const plain = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 4, 1, 2])], 'frame.jpg');
    expect(await readExifTakenAt(plain)).toBeUndefined();
    // An ISO base media file ("ftypheic"), as an iPhone saves photos.
    const heic = new File(
      [new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63])],
      'IMG_0001.HEIC',
    );
    expect(await readExifTakenAt(heic)).toBeUndefined();
    const whole = new Uint8Array(await jpeg({ dateTimeOriginal: '2026:01:05 09:30:00' }).arrayBuffer());
    expect(await readExifTakenAt(new File([whole.slice(0, 40)], 'cut.jpg'))).toBeUndefined();
    expect(await readExifTakenAt(new File([], 'empty.jpg'))).toBeUndefined();
  });
});
