import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { ApiError, client, unwrap } from '@/api/client';
import type { AgreementType } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { sessionQueryKey, useLogout } from './use-session';

/**
 * Accepts the current version of the documents (plan §6.1); the session then has none pending. It lives
 * here, with the dialog, so it loads only when needed.
 */
function useAcceptAgreements() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (types: AgreementType[]) =>
      (await unwrap(client.POST('/me/agreements', { body: { types } }))).user,
    onSuccess: (user) => queryClient.setQueryData(sessionQueryKey, user),
  });
}

const DOCUMENTS: Record<AgreementType, { label: string; to: string }> = {
  TERMS: { label: 'Terms & conditions', to: '/terms' },
  PRIVACY: { label: 'Privacy policy', to: '/privacy' },
  GUEST: { label: 'Guest agreement', to: '/guest-agreement' },
  HOST: { label: 'Host agreement', to: '/host-agreement' },
};

/** Asks for the updated documents. It can't be dismissed: accepting and logging out are the only ways on. */
export function AgreementsDialog({ pending }: { pending: AgreementType[] }) {
  const accept = useAcceptAgreements();
  const logout = useLogout();
  const several = pending.length > 1;

  return (
    <Dialog open>
      <DialogContent
        dismissible={false}
        title={
          several
            ? "We've updated our terms"
            : `We've updated our ${DOCUMENTS[pending[0]!].label.toLowerCase()}`
        }
        description={`Please read the updated ${several ? 'documents' : 'document'} and accept to keep using Rento Vroom.`}
      >
        <ul className="grid gap-2" aria-label="Updated documents">
          {pending.map((type) => (
            <li key={type}>
              <a
                href={DOCUMENTS[type].to}
                target="_blank"
                rel="noreferrer"
                className="link-underline inline-flex items-center gap-1.5 font-medium text-primary"
              >
                {DOCUMENTS[type].label}
                <ExternalLink aria-hidden="true" className="size-3.5" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>

        {accept.isError && (
          <Alert variant="danger" className="mt-5">
            {accept.error instanceof ApiError
              ? accept.error.message
              : "We couldn't save that. Please try again."}
          </Alert>
        )}

        <p className="mt-5 text-sm text-muted">
          By choosing <span className="font-medium text-ink">I accept</span>, you agree to the updated{' '}
          {several ? 'documents' : 'document'} above.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => logout.mutate()} disabled={accept.isPending}>
            Log out
          </Button>
          <Button
            onClick={() => accept.mutate(pending)}
            loading={accept.isPending}
            disabled={logout.isPending}
          >
            I accept
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
