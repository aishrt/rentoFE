import { useMutation, useQuery } from '@tanstack/react-query';
import { client, unwrap } from '@/api/client';
import type { ContactRequest, LegalPage } from '@/api/types';

/*
 * The public content the Phase 2 pages read (plan §9, Days 12–14): the policies in force, FAQs, the legal
 * pages from the CMS, and the Contact Us form. Policies change rarely, so they stay fresh for a while.
 */

export type FaqAudience = 'GUEST' | 'HOST';
export type LegalKey = LegalPage['key'];

export const policiesQueryKey = ['policies'] as const;

/** Fees, cancellation tiers, protection plans, eligibility and listing rules, as the system applies them. */
export function usePolicies() {
  return useQuery({
    queryKey: policiesQueryKey,
    queryFn: ({ signal }) => unwrap(client.GET('/policies', { signal })),
    staleTime: 10 * 60_000,
  });
}

/** FAQs in order. With an audience, the API adds the questions for everyone. */
export function useFaqs(audience?: FaqAudience) {
  return useQuery({
    queryKey: ['faqs', audience ?? 'ALL'],
    queryFn: async ({ signal }) =>
      (await unwrap(client.GET('/faqs', { params: { query: audience ? { audience } : {} }, signal }))).faqs,
    staleTime: 10 * 60_000,
  });
}

/** One legal document in Markdown, with its version and last update. */
export function useLegalDocument(key: LegalKey) {
  return useQuery({
    queryKey: ['cms', key],
    queryFn: async ({ signal }) =>
      (await unwrap(client.GET('/cms/{key}', { params: { path: { key } }, signal }))).page,
    staleTime: 10 * 60_000,
  });
}

/** Sends the Contact Us form; the answer is the new support ticket's reference. */
export function useContactRequest() {
  return useMutation({
    mutationFn: async (body: ContactRequest) => (await unwrap(client.POST('/support/tickets', { body }))).ref,
  });
}
