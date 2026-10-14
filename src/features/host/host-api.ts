import { useQuery, type QueryClient } from '@tanstack/react-query';
import { client, unwrap } from '@/api/client';
import type { components } from '@/api/schema';
import type {
  BlockInput,
  CalendarBlock,
  DocumentAttach,
  HostApplicationRequest,
  HostCalendar,
  HostProfile,
  HostVehicle,
  HostVehicleSummary,
  PhotoAttach,
  RecurringResult,
  RecurringRulesInput,
  VehiclePatch,
} from '@/api/types';

/*
 * The Host's side of the API (plan §11): the application, My Vehicles, onboarding saves, uploads'
 * attach calls and the calendar. Every car call answers with the whole car, so the editor's cache is
 * replaced with what the server saved, checklist included.
 */

export const hostKeys = {
  profile: ['host', 'profile'] as const,
  vehicles: ['host', 'vehicles'] as const,
  vehicle: (id: string) => ['host', 'vehicles', id] as const,
  calendar: (id: string) => ['host', 'vehicles', id, 'calendar'] as const,
  calendarRange: (id: string, from: string, to: string) =>
    ['host', 'vehicles', id, 'calendar', from, to] as const,
  allCarsCalendar: (from: string, to: string) => ['host', 'calendar', from, to] as const,
};

/** The Calendar tab across all the Host's cars: each car with its blocks (GET /host/calendar). */
export type AllCarsCalendar = components['schemas']['AllCarsCalendar'];
export type CalendarCar = components['schemas']['CalendarCar'];

/** Shared with the public pages, which read the same policies (features/content). */
export const policiesQueryKey = ['policies'] as const;

const path = (id: string) => ({ params: { path: { id } } });

export async function applyToHostRequest(body: HostApplicationRequest): Promise<HostProfile> {
  return (await unwrap(client.POST('/me/host-application', { body }))).host;
}

export async function getHostProfileRequest(): Promise<HostProfile> {
  return (await unwrap(client.GET('/me/host-profile'))).host;
}

export async function listHostVehiclesRequest(): Promise<HostVehicleSummary[]> {
  return (await unwrap(client.GET('/host/vehicles'))).vehicles;
}

export async function createVehicleRequest(): Promise<HostVehicle> {
  return (await unwrap(client.POST('/host/vehicles'))).vehicle;
}

export async function getVehicleRequest(id: string): Promise<HostVehicle> {
  return (await unwrap(client.GET('/host/vehicles/{id}', path(id)))).vehicle;
}

export async function patchVehicleRequest(id: string, body: VehiclePatch): Promise<HostVehicle> {
  return (await unwrap(client.PATCH('/host/vehicles/{id}', { ...path(id), body }))).vehicle;
}

export async function deleteVehicleRequest(id: string): Promise<void> {
  await unwrap(client.DELETE('/host/vehicles/{id}', path(id)));
}

export async function submitVehicleRequest(id: string): Promise<HostVehicle> {
  return (await unwrap(client.POST('/host/vehicles/{id}/submit', path(id)))).vehicle;
}

/** A live listing on or off search (plan §8.2). */
export async function setVehicleActiveRequest(id: string, active: boolean): Promise<HostVehicle> {
  const call = active
    ? client.POST('/host/vehicles/{id}/activate', path(id))
    : client.POST('/host/vehicles/{id}/deactivate', path(id));
  return (await unwrap(call)).vehicle;
}

export async function attachPhotoRequest(id: string, body: PhotoAttach): Promise<HostVehicle> {
  return (await unwrap(client.POST('/host/vehicles/{id}/photos', { ...path(id), body }))).vehicle;
}

export async function removePhotoRequest(id: string, photoId: string): Promise<HostVehicle> {
  return (
    await unwrap(client.DELETE('/host/vehicles/{id}/photos/{photoId}', { params: { path: { id, photoId } } }))
  ).vehicle;
}

export async function attachDocumentRequest(id: string, body: DocumentAttach): Promise<HostVehicle> {
  return (await unwrap(client.POST('/host/vehicles/{id}/documents', { ...path(id), body }))).vehicle;
}

export async function removeDocumentRequest(id: string, documentId: string): Promise<HostVehicle> {
  return (
    await unwrap(
      client.DELETE('/host/vehicles/{id}/documents/{documentId}', {
        params: { path: { id, documentId } },
      }),
    )
  ).vehicle;
}

/** `from` and `to` are NZ days ("2026-10-12"); `to` is exclusive. */
export async function getCalendarRequest(id: string, from: string, to: string): Promise<HostCalendar> {
  return unwrap(
    client.GET('/host/vehicles/{id}/calendar', { params: { path: { id }, query: { from, to } } }),
  );
}

/** Every car with a calendar. `from` and `to` are NZ days, `to` exclusive and at most 62 days later. */
export async function getAllCarsCalendarRequest(from: string, to: string): Promise<AllCarsCalendar> {
  return unwrap(client.GET('/host/calendar', { params: { query: { from, to } } }));
}

export async function addBlockRequest(id: string, body: BlockInput): Promise<CalendarBlock> {
  return (await unwrap(client.POST('/host/vehicles/{id}/blocks', { ...path(id), body }))).block;
}

export async function removeBlockRequest(id: string, blockId: string): Promise<void> {
  await unwrap(client.DELETE('/host/vehicles/{id}/blocks/{blockId}', { params: { path: { id, blockId } } }));
}

export async function setRecurringRulesRequest(
  id: string,
  body: RecurringRulesInput,
): Promise<RecurringResult> {
  return unwrap(client.PUT('/host/vehicles/{id}/recurring-rules', { ...path(id), body }));
}

/** The settings in force: required documents and photo angles, price limits, cancellation tiers. */
export function usePolicies() {
  return useQuery({
    queryKey: policiesQueryKey,
    queryFn: ({ signal }) => unwrap(client.GET('/policies', { signal })),
    staleTime: 10 * 60_000,
  });
}

export function useHostVehicle(id: string) {
  return useQuery({ queryKey: hostKeys.vehicle(id), queryFn: () => getVehicleRequest(id) });
}

export function useHostVehicles(enabled = true) {
  return useQuery({ queryKey: hostKeys.vehicles, queryFn: listHostVehiclesRequest, enabled });
}

export function useHostProfile(enabled = true) {
  return useQuery({ queryKey: hostKeys.profile, queryFn: getHostProfileRequest, enabled });
}

/** Puts what the server saved into the cache, and marks My Vehicles as out of date. */
export function storeVehicle(queryClient: QueryClient, vehicle: HostVehicle) {
  queryClient.setQueryData(hostKeys.vehicle(vehicle.id), vehicle);
  void queryClient.invalidateQueries({ queryKey: hostKeys.vehicles, exact: true });
}
