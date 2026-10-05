import type { LegalKey } from '@/features/content/content-api';

export interface LegalDocument {
  path: string;
  /** The CMS page with the document's Markdown (GET /cms/{key}). */
  key: LegalKey;
  /** Its name in the list of other documents. */
  label: string;
}

/**
 * The five legal pages (spec §3) and the CMS keys they read. The text is a placeholder until the client's
 * legal adviser supplies it (plan §16 item 11); publishing a new version in the CMS updates the page.
 */
export const legalDocuments: readonly LegalDocument[] = [
  { path: '/terms', key: 'legal.terms', label: 'Terms and conditions' },
  { path: '/privacy', key: 'legal.privacy', label: 'Privacy policy' },
  { path: '/cancellation-policy', key: 'legal.cancellation-policy', label: 'Cancellation policy' },
  { path: '/host-agreement', key: 'legal.host-agreement', label: 'Host agreement' },
  { path: '/guest-agreement', key: 'legal.guest-agreement', label: 'Guest agreement' },
];

export function legalDocumentFor(path: string): LegalDocument | undefined {
  const normalised = path.length > 1 ? path.replace(/\/+$/, '') : path;
  return legalDocuments.find((document) => document.path === normalised);
}
