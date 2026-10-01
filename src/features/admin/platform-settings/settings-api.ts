import { useQuery } from '@tanstack/react-query';
import { ApiError, client, unwrap } from '@/api/client';
import type { PlatformSettingsResponse, PlatformSettingsUpdate } from '@/api/types';
import { formErrorMessage } from '@/features/account/form-errors';

// Under ['admin'], so signing out drops it from memory with the rest of the staff data.
export const platformSettingsQueryKey = ['admin', 'settings'] as const;

/** The platform settings in force, and who last saved them. Admin only. */
export function usePlatformSettings() {
  return useQuery({
    queryKey: platformSettingsQueryKey,
    queryFn: ({ signal }): Promise<PlatformSettingsResponse> =>
      unwrap(client.GET('/admin/settings', { signal })),
  });
}

/** Saves some groups of settings; each group sent replaces the saved one. Returns the settings now in force. */
export async function savePlatformSettingsRequest(
  update: PlatformSettingsUpdate,
): Promise<PlatformSettingsResponse> {
  return unwrap(client.PATCH('/admin/settings', { body: update }));
}

/**
 * What a settings card shows above its fields for an API error. The form checks the same rules first,
 * so these are rare: a rule only the API knows, such as tiers keeping their codes.
 */
export function settingsErrorMessages(error: unknown): string[] {
  if (error instanceof ApiError && error.fields) return [...new Set(Object.values(error.fields))];
  return [formErrorMessage(error) ?? 'Something went wrong on our side. Please try again in a moment.'];
}
