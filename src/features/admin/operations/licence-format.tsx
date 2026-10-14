import type { ReactNode } from 'react';
import { englishProofLabel } from './operations-labels';

/**
 * An overseas licence's language as a fact, term and value: one not in English needs an International Driving
 * Permit or an approved translation (plan §3). Nothing for an NZ licence.
 */
export function englishFact(licence: {
  class: string;
  inEnglish?: boolean;
  englishProof?: string;
}): { term: string; value: ReactNode } | null {
  if (licence.englishProof) {
    return { term: 'Not in English, with', value: englishProofLabel(licence.englishProof) };
  }
  if (licence.class !== 'OVERSEAS') return null;
  return {
    term: 'In English',
    value:
      licence.inEnglish === false ? (
        <span className="font-medium text-danger">No, and no IDP or approved translation</span>
      ) : (
        'Yes'
      ),
  };
}
