import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { ApiError } from '@/api/client';
import type { VerificationQueueItem } from '@/api/types';
import { staggerIndex } from '@/components/motion/presets';
import { IconButton } from '@/components/ui/icon-button';
import { toast } from '@/components/ui/toast';
import { DecisionDialog } from '@/features/admin/listings/decision-dialog';
import {
  reviewVerificationRequest,
  useVerificationQueue,
  verificationsQueryKey,
  type VerificationDecision,
  type VerificationOutcome,
} from '@/features/admin/operations/operations-api';
import { personName } from '@/features/admin/operations/operations-labels';
import { VerificationCard } from '@/features/admin/operations/verification-card';
import { AdminPageHeader } from '@/features/admin/ops/admin-page-header';
import { EmptyList, ListSkeleton, LoadError } from '@/features/admin/ops/query-feedback';
import { formatNumber } from '@/lib/format';

type Decision = { item: VerificationQueueItem; decision: VerificationDecision };

const sameItem = (a: VerificationQueueItem, b: VerificationQueueItem) =>
  a.userId === b.userId && a.kind === b.kind;

const joinRefs = (refs: string[]) => refs.join(', ');

/** The toast after a decision: who it was, and what happened to the bookings that waited for it. */
function decidedToast({ item, decision }: Decision, outcome: VerificationOutcome) {
  const name = personName(item);
  const licence = item.kind === 'LICENCE';
  const bookings =
    decision === 'APPROVE'
      ? [
          outcome.confirmed.length > 0 && `Confirmed ${joinRefs(outcome.confirmed)}.`,
          outcome.waitingForHost.length > 0 && `${joinRefs(outcome.waitingForHost)} now waits for the Host.`,
          // The other part of the check is still with the team.
          outcome.stillInReview.length > 0 &&
            `${joinRefs(outcome.stillInReview)} still waits for ${licence ? 'the identity check' : 'the licence check'}.`,
          // A suspended car takes no new bookings: confirmed once the suspension is lifted.
          outcome.carSuspended.length > 0 &&
            `${joinRefs(outcome.carSuspended)} waits: its car is suspended, so it’s confirmed only if the suspension is lifted in time.`,
        ]
      : [
          outcome.released.length > 0 &&
            `Released ${joinRefs(outcome.released)} and the card authorisation: nothing was charged.`,
        ];
  const title = licence
    ? decision === 'APPROVE'
      ? `${name}’s licence is approved`
      : `${name}’s licence was rejected`
    : decision === 'APPROVE'
      ? `${name} is verified`
      : `${name}’s identity check was rejected`;
  const emailed = licence && decision === 'REJECT' ? 'We’ve emailed them your note.' : 'We’ve emailed them.';
  toast(title, { description: [emailed, ...bookings].filter(Boolean).join(' ') });
}

function Section({
  title,
  description,
  items,
  start,
}: {
  title: string;
  description: string;
  items: VerificationQueueItem[];
  start: (item: VerificationQueueItem, decision: VerificationDecision) => void;
}) {
  if (items.length === 0) return null;
  const id = `verifications-${title.toLowerCase().replaceAll(/\W+/g, '-')}`;
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="font-semibold text-ink">
        {title} <span className="font-normal text-muted">({formatNumber(items.length)})</span>
      </h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
      <ul aria-label={title} className="mt-4 grid gap-4">
        {items.map((item, index) => (
          <VerificationCard
            key={`${item.kind}-${item.userId}`}
            item={item}
            className="stagger-in"
            style={staggerIndex(index)}
            onApprove={() => start(item, 'APPROVE')}
            onReject={() => start(item, 'REJECT')}
          />
        ))}
      </ul>
    </section>
  );
}

/**
 * The verification queue (spec §22, plan §12.6): identity checks Stripe couldn't decide or that don't match
 * what the person entered, then driver licences no ID document has confirmed, checked by hand.
 */
export function AdminVerificationsPage() {
  const queryClient = useQueryClient();
  const queue = useVerificationQueue();
  // The decision is kept while its dialog closes, so the dialog's text doesn't change as it animates out.
  const [decision, setDecision] = useState<Decision | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const start = (item: VerificationQueueItem, choice: VerificationDecision) => {
    setDecision({ item, decision: choice });
    setDialogOpen(true);
  };

  // It leaves the queue straight away; the queue then refreshes.
  const removeFromQueue = (item: VerificationQueueItem) => {
    queryClient.setQueryData<{ items: VerificationQueueItem[] }>(
      verificationsQueryKey,
      (previous) => previous && { items: previous.items.filter((other) => !sameItem(other, item)) },
    );
    void queryClient.invalidateQueries({ queryKey: verificationsQueryKey });
  };

  const decide = async (notes: string | undefined) => {
    if (!decision) return;
    const { item } = decision;
    let outcome: VerificationOutcome;
    try {
      outcome = await reviewVerificationRequest({
        userId: item.userId,
        kind: item.kind,
        decision: decision.decision,
        notes,
      });
    } catch (error) {
      // Someone else decided it while this page was open.
      if (error instanceof ApiError && error.status === 409) {
        setDialogOpen(false);
        removeFromQueue(item);
        toast(`${personName(item)} was already decided`, {
          tone: 'neutral',
          description: 'Someone else got to it first, so nothing changed.',
        });
        return;
      }
      throw error;
    }
    setDialogOpen(false);
    decidedToast(decision, outcome);
    removeFromQueue(item);
  };

  const items = queue.data ?? [];
  const identities = items.filter((item) => item.kind === 'IDENTITY');
  const licences = items.filter((item) => item.kind === 'LICENCE');

  const current = decision?.item;
  const name = current ? personName(current) : '';
  const rejecting = decision?.decision === 'REJECT';
  const identity = current?.kind !== 'LICENCE';
  const waiting = current?.waitingBookings.length ?? 0;

  return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader
        eyebrow="Operations"
        title="Verifications"
        description="Identity checks Stripe couldn’t decide, then driver licences to check by hand. Oldest first, so nobody waits longest."
        actions={
          queue.data && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <span aria-live="polite">
                {formatNumber(items.length)} {items.length === 1 ? 'check' : 'checks'} waiting
              </span>
              <IconButton
                label="Refresh the queue"
                onClick={() => queue.refetch()}
                disabled={queue.isFetching}
              >
                <RefreshCw aria-hidden="true" className={queue.isFetching ? 'animate-spin' : undefined} />
              </IconButton>
            </div>
          )
        }
      />

      <div className="mt-8 grid gap-10">
        {queue.isPending && <ListSkeleton label="Loading the queue" rows={3} height="h-52" />}

        {queue.isError && (
          <LoadError
            title="We couldn’t load the queue"
            error={queue.error}
            onRetry={() => queue.refetch()}
            retrying={queue.isFetching}
          />
        )}

        {queue.data?.length === 0 && (
          <EmptyList
            icon={<ShieldCheck />}
            title="Nothing to check"
            description="Identity checks and licences that need a person appear here."
          />
        )}

        <Section
          title="Identity checks"
          description="Compare their ID with the details they entered. Approving confirms the bookings waiting on it; rejecting releases them."
          items={identities}
          start={start}
        />
        <Section
          title="Licences to check by hand"
          description="No ID document confirmed these licences: check the details, with the full number, against their name and date of birth. Approving confirms the bookings waiting on it; rejecting releases them."
          items={licences}
          start={start}
        />
      </div>

      <DecisionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={
          identity
            ? rejecting
              ? `Reject ${name}’s identity check?`
              : `Approve ${name}’s identity?`
            : rejecting
              ? `Reject ${name}’s licence?`
              : `Approve ${name}’s licence?`
        }
        description={
          identity
            ? rejecting
              ? `They won’t be able to book.${waiting > 0 ? ' Bookings waiting on this check are released with their card authorisations, so nothing is charged.' : ''} We’ll email them.`
              : `They’ll be verified.${waiting > 0 ? ' Bookings waiting on this check are confirmed; requests still go to their Host.' : ''} We’ll email them.`
            : rejecting
              ? `They won’t be able to book until their licence details are fixed.${waiting > 0 ? ' Bookings waiting on this licence are released with their card authorisations, so nothing is charged.' : ''} We’ll email them your note, so write it for them.`
              : `Their licence details are accepted.${waiting > 0 ? ' Bookings waiting on this licence are confirmed; requests still go to their Host.' : ''} We’ll email them.`
        }
        confirmLabel={rejecting ? 'Reject' : 'Approve'}
        tone={rejecting ? 'danger' : 'primary'}
        notes={rejecting && !identity ? 'required' : 'optional'}
        notesLabel={rejecting && !identity ? `Why, for ${current?.firstName ?? 'them'}` : 'Note (optional)'}
        notesDescription={
          rejecting && !identity ? 'Included in the email.' : 'Kept in the audit log; not sent to them.'
        }
        onConfirm={decide}
      />
    </div>
  );
}
