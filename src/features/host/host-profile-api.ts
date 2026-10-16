import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { client, unwrap } from '@/api/client';
import type { HostProfile } from '@/api/types';
import { gstNumberProblem } from './application-schema';
import { getHostProfileRequest, hostKeys } from './host-api';

/** The Host's own profile (spec §9): how guests see them, and their GST details. */
export function useHostProfile() {
  return useQuery({ queryKey: hostKeys.profile, queryFn: getHostProfileRequest, staleTime: 60_000 });
}

export function useSaveHostProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: HostProfileValues) =>
      (
        await unwrap(
          client.PATCH('/me/host-profile', {
            body: {
              bio: values.bio,
              gstRegistered: values.gstRegistered,
              ...(values.gstRegistered && { gstNumber: values.gstNumber }),
            },
          }),
        )
      ).host,
    onSuccess: (host) => queryClient.setQueryData<HostProfile>(hostKeys.profile, host),
  });
}

/**
 * The API's own checks, for instant feedback. Like the API, the check digit is checked only on a changed
 * GST number, so one saved before that check doesn't stop the Host saving their bio.
 */
export const hostProfileSchema = (savedGstNumber = '') =>
  z
    .object({
      bio: z.string().trim().max(1000, 'Keep it under 1,000 characters'),
      gstRegistered: z.boolean(),
      gstNumber: z.string().trim(),
    })
    .superRefine((values, context) => {
      const problem = values.gstRegistered
        ? gstNumberProblem(values.gstNumber, { checkDigit: values.gstNumber !== savedGstNumber })
        : undefined;
      if (problem) context.addIssue({ code: 'custom', path: ['gstNumber'], message: problem });
    });

export type HostProfileValues = z.infer<ReturnType<typeof hostProfileSchema>>;
