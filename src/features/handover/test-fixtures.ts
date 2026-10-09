import type { ConditionReport, Handover } from '@/api/types';

export const ANGLES = [
  'FRONT',
  'REAR',
  'DRIVER_SIDE',
  'PASSENGER_SIDE',
  'WHEELS',
  'WINDSCREEN',
  'INTERIOR',
  'DASHBOARD',
] as const;

/** Kiri's trip in Hana's car, confirmed and ready for check-in. */
export function handover(overrides: Partial<Handover> = {}): Handover {
  return {
    ref: 'RV-7K2Q9M',
    role: 'GUEST',
    bookingStatus: 'CONFIRMED',
    energy: 'FUEL',
    fuelPolicy: 'SAME_LEVEL',
    requiredAngles: [...ANGLES],
    checkInOpensAt: '2026-10-11T19:00:00.000Z',
    checkIn: null,
    checkOut: null,
    emailVerificationNeeded: false,
    fuelShortfall: false,
    actions: {
      checkIn: true,
      checkOut: false,
      confirmCheckIn: false,
      confirmCheckOut: false,
      flagDamage: false,
    },
    ...overrides,
  };
}

export function report(overrides: Partial<ConditionReport> = {}): ConditionReport {
  return {
    stage: 'CHECK_IN',
    odometer: 45210,
    fuelOrBatteryPct: 80,
    submittedBy: 'HOST',
    submittedAt: '2026-10-11T21:05:00.000Z',
    photos: ANGLES.map((angle) => ({
      angle,
      url: `https://api.test/files/private/${angle}.jpg`,
      takenBy: 'HOST',
      takenAt: '2026-10-11T21:00:00.000Z',
      uploadedAt: '2026-10-11T21:01:00.000Z',
    })),
    damagePins: [{ id: 'p1', x: 50, y: 6, note: 'Scuff', newDamage: false, flaggedBy: 'HOST' }],
    confirmedByHostAt: '2026-10-11T21:05:00.000Z',
    completedBySupport: false,
    ...overrides,
  };
}

export interface ExifParts {
  dateTimeOriginal?: string;
  offsetTimeOriginal?: string;
  dateTimeDigitized?: string;
  littleEndian?: boolean;
}

/**
 * A minimal JPEG as a phone saves it: a JFIF segment, an EXIF segment with the given date tags, then the
 * start of the image data.
 */
export function jpegWithExif({ littleEndian = true, ...tags }: ExifParts, name = 'photo.jpg'): File {
  const ascii = Object.entries({
    0x9003: tags.dateTimeOriginal,
    0x9004: tags.dateTimeDigitized,
    0x9011: tags.offsetTimeOriginal,
  })
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([tag, text]) => ({ tag: Number(tag), bytes: [...text].map((c) => c.charCodeAt(0)).concat(0) }));

  // TIFF: header (8), IFD0 with the pointer to the EXIF IFD (2 + 12 + 4), the EXIF IFD, then the strings.
  const exifIfd = 8 + 2 + 12 + 4;
  const dataStart = exifIfd + 2 + ascii.length * 12 + 4;
  const tiff = new DataView(new ArrayBuffer(dataStart + ascii.reduce((sum, a) => sum + a.bytes.length, 0)));
  const le = littleEndian;
  tiff.setUint16(0, le ? 0x4949 : 0x4d4d);
  tiff.setUint16(2, 42, le);
  tiff.setUint32(4, 8, le);
  tiff.setUint16(8, 1, le);
  tiff.setUint16(10, 0x8769, le);
  tiff.setUint16(12, 4, le);
  tiff.setUint32(14, 1, le);
  tiff.setUint32(18, exifIfd, le);
  tiff.setUint16(exifIfd, ascii.length, le);
  let data = dataStart;
  ascii.forEach(({ tag, bytes }, index) => {
    const entry = exifIfd + 2 + index * 12;
    tiff.setUint16(entry, tag, le);
    tiff.setUint16(entry + 2, 2, le);
    tiff.setUint32(entry + 4, bytes.length, le);
    tiff.setUint32(entry + 8, data, le);
    bytes.forEach((byte, at) => tiff.setUint8(data + at, byte));
    data += bytes.length;
  });

  const tiffBytes = [...new Uint8Array(tiff.buffer)];
  const exifSegment = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiffBytes];
  const jfif = [0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0];
  const segment = (marker: number, body: number[]) => [
    0xff,
    marker,
    (body.length + 2) >> 8,
    (body.length + 2) & 0xff,
    ...body,
  ];
  return new File(
    [
      new Uint8Array([
        0xff,
        0xd8,
        ...segment(0xe0, jfif),
        ...segment(0xe1, exifSegment),
        0xff,
        0xda,
        1,
        2,
        3,
      ]),
    ],
    name,
    { type: 'image/jpeg' },
  );
}
