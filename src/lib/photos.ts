/**
 * Listing photos uploaded to S3 are stored as WebP 800 and 1600 px wide, and the API returns the 1600 one
 * (plan §12.5). Cards and thumbnails show the 800 one. Any other photo, such as the demo cars'
 * placeholders, is used as it is.
 */
const LARGE_PHOTO = /-1600\.webp$/;

export function smallPhoto(url: string): string {
  return url.replace(LARGE_PHOTO, '-800.webp');
}
