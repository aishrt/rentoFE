import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { client, unwrap } from '@/api/client';
import type { PrivacyRequest } from '@/api/types';

/*
 * The Guest dashboard's requests (plan §9, Days 16–18; spec §8): Saved cars priced for the last search,
 * saved cards and payment history, receipts, and privacy requests.
 */

export const savedCarsQueryKey = ['me', 'saved-cars'] as const;
export const savedCardsQueryKey = ['me', 'payment-methods'] as const;
export const paymentHistoryQueryKey = ['me', 'payments'] as const;

/** Saved cars, each priced for the last searched dates when it can be booked for them. */
export function useSavedCars() {
  return useQuery({
    queryKey: savedCarsQueryKey,
    queryFn: ({ signal }) => unwrap(client.GET('/me/saved-cars', { signal })),
    staleTime: 30_000,
  });
}

/** The cards saved with Stripe. */
export function useSavedCards() {
  return useQuery({
    queryKey: savedCardsQueryKey,
    queryFn: async ({ signal }) => (await unwrap(client.GET('/me/payment-methods', { signal }))).cards,
    staleTime: 60_000,
  });
}

/** Starts saving a card: the SetupIntent's client secret for the Payment Element. */
export function useStartCardSetup() {
  return useMutation({
    mutationFn: async () => (await unwrap(client.POST('/me/payment-methods/setup'))).clientSecret,
  });
}

export function useRemoveCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await unwrap(client.DELETE('/me/payment-methods/{id}', { params: { path: { id } } }));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: savedCardsQueryKey }),
  });
}

/** What the Guest has paid, newest first, with refunds. */
export function usePaymentHistory() {
  return useQuery({
    queryKey: paymentHistoryQueryKey,
    queryFn: async ({ signal }) => (await unwrap(client.GET('/me/payments', { signal }))).payments,
    staleTime: 30_000,
  });
}

/** A paid booking's GST receipt. */
export function useReceipt(ref: string) {
  return useQuery({
    queryKey: ['booking', ref, 'receipt'],
    queryFn: async ({ signal }) =>
      (await unwrap(client.GET('/bookings/{id}/receipt', { params: { path: { id: ref } }, signal }))).receipt,
    enabled: ref !== '',
  });
}

/**
 * Downloads the receipt's PDF through the API client, so an expired sign-in renews first, then saves it
 * with the file name the API gives.
 */
export async function downloadReceiptPdf(ref: string): Promise<void> {
  const blob = await unwrap(
    client.GET('/bookings/{id}/receipt.pdf', { params: { path: { id: ref } }, parseAs: 'blob' }),
  );
  const url = URL.createObjectURL(blob as Blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `rento-vroom-receipt-${ref}.pdf`;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoked after the click has started the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

/** Whether the account can be closed now, and what stops it. */
export function useAccountClosure(enabled: boolean) {
  return useQuery({
    queryKey: ['me', 'account-closure'],
    queryFn: ({ signal }) => unwrap(client.GET('/me/account-closure', { signal })),
    enabled,
    staleTime: 0,
  });
}

/** Sends a privacy request; the answer is its support ticket's reference. */
export function usePrivacyRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PrivacyRequest) => unwrap(client.POST('/me/privacy-requests', { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] }),
  });
}
