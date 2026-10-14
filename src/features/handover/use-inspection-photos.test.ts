import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as UploadModule from '@/features/host/upload';
import { uploadFile } from '@/features/host/upload';
import { clearPhotoStore, listPhotos } from './photo-store';
import { useInspectionPhotos } from './use-inspection-photos';

// Each upload waits until the test lets it finish, so a photo can be retaken or removed meanwhile.
const finishes: ((key: string) => void)[] = [];
vi.mock('@/features/host/upload', async (importOriginal) => ({
  ...(await importOriginal<typeof UploadModule>()),
  uploadFile: vi.fn(() => new Promise<string>((resolve) => finishes.push(resolve))),
}));

const photo = (name: string) => new File(['jpeg'], name, { type: 'image/jpeg' });

beforeEach(() => {
  finishes.length = 0;
  vi.mocked(uploadFile).mockClear();
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => clearPhotoStore());

describe('useInspectionPhotos', () => {
  it('doesn’t bring back a photo retaken or removed while its upload was still running', async () => {
    const { result } = renderHook(() => useInspectionPhotos('RV-7K2Q9M', 'CHECK_IN'));
    await vi.waitFor(() => expect(result.current.loaded).toBe(true));

    // The front, then a retake of it before the first upload is done.
    await act(() => result.current.add('FRONT', photo('front-1.jpg'), { replace: true }));
    await act(() => result.current.add('FRONT', photo('front-2.jpg'), { replace: true }));
    // A damage photo, removed before its upload is done.
    await act(() => result.current.add('DAMAGE', photo('dent.jpg')));
    const dent = result.current.photos.find((taken) => taken.angle === 'DAMAGE')!;
    await act(() => result.current.remove(dent.id));
    await vi.waitFor(() => expect(finishes).toHaveLength(3));

    // Every upload finishes, the retaken and removed ones last.
    await act(async () => {
      finishes[1]!('incoming/private/bookings/b1/inspections/front-2.jpg');
      finishes[0]!('incoming/private/bookings/b1/inspections/front-1.jpg');
      finishes[2]!('incoming/private/bookings/b1/inspections/dent.jpg');
    });

    await vi.waitFor(() =>
      expect(result.current.photos.map((taken) => [taken.name, taken.key])).toEqual([
        ['front-2.jpg', 'incoming/private/bookings/b1/inspections/front-2.jpg'],
      ]),
    );
    // After a reload, only the retake is there to send.
    const saved = await listPhotos('RV-7K2Q9M', 'CHECK_IN');
    expect(saved.map((taken) => taken.name)).toEqual(['front-2.jpg']);
  });

  it('uploads every photo again, for new keys', async () => {
    const { result } = renderHook(() => useInspectionPhotos('RV-7K2Q9M', 'CHECK_IN'));
    await vi.waitFor(() => expect(result.current.loaded).toBe(true));
    await act(() => result.current.add('FRONT', photo('front.jpg')));
    await vi.waitFor(() => expect(finishes).toHaveLength(1));
    await act(async () => finishes[0]!('incoming/private/bookings/b1/inspections/old.jpg'));
    await vi.waitFor(() => expect(result.current.photos[0]!.key).toBeDefined());

    await act(() => result.current.uploadAgain());
    expect(result.current.photos[0]!.key).toBeUndefined();
    await vi.waitFor(() => expect(finishes).toHaveLength(2));
    await act(async () => finishes[1]!('incoming/private/bookings/b1/inspections/new.jpg'));
    await vi.waitFor(() =>
      expect(result.current.photos[0]!.key).toBe('incoming/private/bookings/b1/inspections/new.jpg'),
    );
    expect((await listPhotos('RV-7K2Q9M', 'CHECK_IN'))[0]!.key).toBe(
      'incoming/private/bookings/b1/inspections/new.jpg',
    );
  });
});
