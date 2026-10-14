import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from './client';
import { refreshStaleData } from './stale-data';

describe('refreshStaleData', () => {
  it('refreshes the record’s queries when the API says it changed meanwhile or is gone', () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
    const onError = refreshStaleData(queryClient, [['booking', 'RV-1'], ['bookings']]);

    onError(new ApiError(409, 'NOT_PENDING', 'This request has already been answered.'));
    expect(invalidate.mock.calls).toEqual([
      [{ queryKey: ['booking', 'RV-1'] }],
      [{ queryKey: ['bookings'] }],
    ]);

    invalidate.mockClear();
    onError(new ApiError(404, 'NOT_FOUND', 'No such booking.'));
    expect(invalidate).toHaveBeenCalledTimes(2);
  });

  it('leaves the screen alone for any other error', () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
    const onError = refreshStaleData(queryClient, [['bookings']]);

    onError(new ApiError(400, 'VALIDATION_ERROR', 'Some details need fixing.'));
    onError(new ApiError(500, 'INTERNAL', 'Something went wrong.'));
    onError(new Error('offline'));
    expect(invalidate).not.toHaveBeenCalled();
  });
});
