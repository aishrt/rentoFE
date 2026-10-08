import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { client, unwrap } from '@/api/client';
import type { AttachmentInput, Incident, NewIncidentRequest } from '@/api/types';

/* Damage and incident reporting (spec §15): the user's cases, one case, reporting and adding to it. */

export const incidentsQueryKey = ['incidents'] as const;
const incidentQueryKey = (ref: string) => [...incidentsQueryKey, ref] as const;

export function useMyIncidents() {
  return useQuery({
    queryKey: incidentsQueryKey,
    queryFn: async ({ signal }) => (await unwrap(client.GET('/incidents', { signal }))).incidents,
  });
}

export function useIncident(ref: string) {
  return useQuery({
    queryKey: incidentQueryKey(ref),
    queryFn: async ({ signal }) =>
      (await unwrap(client.GET('/incidents/{ref}', { params: { path: { ref } }, signal }))).incident,
    enabled: ref !== '',
    // Evidence links work for 10 minutes; a refresh brings fresh ones and any update from support.
    refetchInterval: 5 * 60_000,
  });
}

export function useReportIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: NewIncidentRequest): Promise<Incident> =>
      (await unwrap(client.POST('/incidents', { body }))).incident,
    onSuccess: (incident) => {
      queryClient.setQueryData(incidentQueryKey(incident.caseRef), incident);
      void queryClient.invalidateQueries({ queryKey: incidentsQueryKey, exact: true });
    },
  });
}

export function useReplyToIncident(ref: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { note: string; attachments: AttachmentInput[] }): Promise<Incident> =>
      (await unwrap(client.POST('/incidents/{ref}/events', { params: { path: { ref } }, body }))).incident,
    onSuccess: (incident) => queryClient.setQueryData(incidentQueryKey(ref), incident),
  });
}
