import { describe, expect, it } from 'vitest';
import { clearPhotos, clearPhotoStore, listPhotos, savePhoto, type StoredPhoto } from './photo-store';

const photo = (id: string, bookingRef: string, stage: StoredPhoto['stage']): StoredPhoto => ({
  id,
  bookingRef,
  stage,
  angle: 'DAMAGE',
  blob: new Blob(['jpeg'], { type: 'image/jpeg' }),
  name: `${id}.jpg`,
  contentType: 'image/jpeg',
  takenAt: '2026-10-12T01:00:00.000Z',
  lat: -36.8484597,
  lng: 174.7633315,
});

describe('the photo store', () => {
  it('keeps flagged damage apart from the check-out, and forgets a stage once it’s recorded', async () => {
    await savePhoto(photo('out', 'RV-7K2Q9M', 'CHECK_OUT'));
    await savePhoto(photo('flag', 'RV-7K2Q9M', 'FLAGGED_DAMAGE'));
    expect((await listPhotos('RV-7K2Q9M', 'FLAGGED_DAMAGE')).map((saved) => saved.id)).toEqual(['flag']);

    await clearPhotos('RV-7K2Q9M', 'CHECK_OUT');
    expect(await listPhotos('RV-7K2Q9M', 'CHECK_OUT')).toEqual([]);
    expect(await listPhotos('RV-7K2Q9M', 'FLAGGED_DAMAGE')).toHaveLength(1);
    await clearPhotoStore();
  });

  it('forgets every photo, for every booking, on sign-out', async () => {
    await savePhoto(photo('a', 'RV-7K2Q9M', 'CHECK_IN'));
    await savePhoto(photo('b', 'RV-AAAAAA', 'CHECK_OUT'));
    await clearPhotoStore();
    expect(await listPhotos('RV-7K2Q9M', 'CHECK_IN')).toEqual([]);
    expect(await listPhotos('RV-AAAAAA', 'CHECK_OUT')).toEqual([]);
  });
});
