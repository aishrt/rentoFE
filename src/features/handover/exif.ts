/*
 * When a photo says it was taken (plan §3, conditionReports.photos.exifTakenAt): the EXIF DateTimeOriginal of a
 * JPEG chosen from the device instead of taken with the in-app camera. One far from the inspection's own time
 * is an old gallery photo, and the handover says so. Read by hand rather than with a library because only
 * this one tag is needed. Anything else has no date: a HEIC or PNG, a frame from the in-app camera (drawn on
 * a canvas, so without EXIF), or a damaged file.
 */

/** The EXIF block is one segment of at most 64 KB near the start: no need to read a 10 MB photo whole. */
const HEAD_BYTES = 128 * 1024;

const EXIF_HEADER = 0x45786966; // "Exif"
const TAG_EXIF_IFD = 0x8769;
const TAG_DATE_TIME_ORIGINAL = 0x9003;
const TAG_DATE_TIME_DIGITIZED = 0x9004;
const TAG_OFFSET_TIME_ORIGINAL = 0x9011;
const TAG_OFFSET_TIME_DIGITIZED = 0x9012;
const TYPE_ASCII = 2;
const TYPE_LONG = 4;
const TYPE_IFD = 13;

/** "2026:01:05 09:30:00", EXIF's own date format: the camera's local time. */
const EXIF_DATE = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/;
/** "+13:00": the time zone that local time was in, when the camera records it. */
const EXIF_OFFSET = /^([+-])(\d{2}):(\d{2})$/;

/** When the photo says it was taken, as an ISO date, or undefined when it doesn't say (or can't be read). */
export async function readExifTakenAt(file: Blob): Promise<string | undefined> {
  try {
    return exifTakenAt(new DataView(await file.slice(0, HEAD_BYTES).arrayBuffer()));
  } catch {
    return undefined;
  }
}

/** The same from the file's first bytes. Every read is bounds-checked: a broken file has no date. */
export function exifTakenAt(view: DataView): string | undefined {
  const tiff = tiffStart(view);
  if (tiff === undefined || tiff + 8 > view.byteLength) return undefined;
  const order = view.getUint16(tiff);
  const little = order === 0x4949 ? true : order === 0x4d4d ? false : undefined;
  if (little === undefined || view.getUint16(tiff + 2, little) !== 42) return undefined;

  const reader = new IfdReader(view, tiff, little);
  const ifd0 = reader.entries(view.getUint32(tiff + 4, little));
  const pointer = ifd0.get(TAG_EXIF_IFD);
  if (pointer === undefined) return undefined;
  const exif = reader.entries(reader.long(pointer));

  for (const [dateTag, offsetTag] of [
    [TAG_DATE_TIME_ORIGINAL, TAG_OFFSET_TIME_ORIGINAL],
    [TAG_DATE_TIME_DIGITIZED, TAG_OFFSET_TIME_DIGITIZED],
  ] as const) {
    const date = exif.get(dateTag);
    if (date === undefined) continue;
    const offset = exif.get(offsetTag);
    const iso = toIso(reader.ascii(date), offset === undefined ? undefined : reader.ascii(offset));
    if (iso) return iso;
  }
  return undefined;
}

/** Where the TIFF structure inside the JPEG's APP1 "Exif" segment starts, if it has one. */
function tiffStart(view: DataView): number | undefined {
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return undefined;
  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) return undefined;
    const marker = view.getUint8(offset + 1);
    if (marker === 0xff) {
      // Padding before a marker.
      offset += 1;
      continue;
    }
    // The image data starts, or the file ends: no metadata after this.
    if (marker === 0xda || marker === 0xd9) return undefined;
    const length = view.getUint16(offset + 2);
    if (length < 2) return undefined;
    if (
      marker === 0xe1 &&
      offset + 10 <= view.byteLength &&
      view.getUint32(offset + 4) === EXIF_HEADER &&
      view.getUint16(offset + 8) === 0
    ) {
      return offset + 10;
    }
    offset += 2 + length;
  }
  return undefined;
}

/** Reads a TIFF image file directory: tag → the offset of its 12-byte entry. */
class IfdReader {
  constructor(
    private readonly view: DataView,
    private readonly tiff: number,
    private readonly little: boolean,
  ) {}

  entries(ifdOffset: number | undefined): Map<number, number> {
    const found = new Map<number, number>();
    if (ifdOffset === undefined) return found;
    const start = this.tiff + ifdOffset;
    if (start + 2 > this.view.byteLength) return found;
    const count = this.view.getUint16(start, this.little);
    for (let index = 0; index < count; index += 1) {
      const entry = start + 2 + index * 12;
      if (entry + 12 > this.view.byteLength) break;
      found.set(this.view.getUint16(entry, this.little), entry);
    }
    return found;
  }

  /** A pointer to another directory, as a LONG or IFD value. */
  long(entry: number): number | undefined {
    const type = this.view.getUint16(entry + 2, this.little);
    return type === TYPE_LONG || type === TYPE_IFD ? this.view.getUint32(entry + 8, this.little) : undefined;
  }

  /** An ASCII value: inside the entry when it fits in 4 bytes, elsewhere in the TIFF otherwise. */
  ascii(entry: number): string {
    if (this.view.getUint16(entry + 2, this.little) !== TYPE_ASCII) return '';
    const length = this.view.getUint32(entry + 4, this.little);
    const at = length <= 4 ? entry + 8 : this.tiff + this.view.getUint32(entry + 8, this.little);
    if (length > 64 || at + length > this.view.byteLength) return '';
    let text = '';
    for (let index = 0; index < length; index += 1) {
      const code = this.view.getUint8(at + index);
      if (code === 0) break;
      text += String.fromCharCode(code);
    }
    return text;
  }
}

/**
 * EXIF's local date and time as an ISO date. Without a recorded time zone it's read as this device's own,
 * which is where a phone's photos almost always come from. Blank, impossible or pre-digital dates
 * ("0000:00:00 …", 30 February, an unset clock's 1970) are no date.
 */
function toIso(date: string, offset: string | undefined): string | undefined {
  const parts = EXIF_DATE.exec(date.trim());
  if (!parts) return undefined;
  const [year, month, day, hour, minute, second] = parts.slice(1).map(Number) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (
    year < 1990 ||
    calendar.getUTCMonth() !== month - 1 ||
    calendar.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return undefined;
  }
  const zone = offset === undefined ? null : EXIF_OFFSET.exec(offset.trim());
  const time = zone
    ? Date.UTC(year, month - 1, day, hour, minute, second) -
      (zone[1] === '-' ? -1 : 1) * (Number(zone[2]) * 60 + Number(zone[3])) * 60_000
    : new Date(year, month - 1, day, hour, minute, second).getTime();
  return Number.isNaN(time) ? undefined : new Date(time).toISOString();
}
