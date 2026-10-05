import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { client, unwrap } from '@/api/client';
import type { Favourites } from '@/api/types';
import { toast } from '@/components/ui/toast';

const favouritesKey = ['favourites'] as const;

/** The ids of the cars the signed-in guest saved with the heart. */
export function useFavourites(signedIn: boolean) {
  return useQuery({
    queryKey: favouritesKey,
    queryFn: ({ signal }) => unwrap(client.GET('/me/favourites', { signal })),
    enabled: signedIn,
    staleTime: 5 * 60_000,
  });
}

/** Saves or removes a car at once on screen, and puts it back if the request fails (plan §12.5). */
export function useToggleFavourite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ vehicleId, save }: { vehicleId: string; save: boolean }) => {
      const params = { params: { path: { vehicleId } } };
      await unwrap(
        save
          ? client.PUT('/me/favourites/{vehicleId}', params)
          : client.DELETE('/me/favourites/{vehicleId}', params),
      );
    },
    onMutate: async ({ vehicleId, save }) => {
      await queryClient.cancelQueries({ queryKey: favouritesKey });
      const previous = queryClient.getQueryData<Favourites>(favouritesKey);
      const ids = (previous?.vehicleIds ?? []).filter((id) => id !== vehicleId);
      queryClient.setQueryData<Favourites>(favouritesKey, { vehicleIds: save ? [vehicleId, ...ids] : ids });
      return { previous };
    },
    onError: (_error, { save }, context) => {
      queryClient.setQueryData(favouritesKey, context?.previous);
      toast(save ? "We couldn't save that car" : "We couldn't remove that car", {
        description: 'Check your connection and try again.',
        tone: 'danger',
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: favouritesKey }),
  });
}
