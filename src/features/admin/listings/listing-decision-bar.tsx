import { useQueryClient } from '@tanstack/react-query';
import { Check, Undo2, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import type { AdminVehicle, HostVehicle } from '@/api/types';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { DecisionDialog } from './decision-dialog';
import {
  adminVehicleQueryKey,
  decideListingRequest,
  isApiError,
  reviewQueueQueryKey,
  withVehicle,
  type ListingDecision,
} from './listing-api';
import { hostApplicationsLink } from './listing-format';

interface DecisionState {
  /** Where the listing stands, in a sentence. */
  summary: string;
  /** On a live listing, approving takes its waiting photos and documents only (plan §3). */
  approveLabel: string;
  /** Why approving doesn't apply, or null when it does. */
  approveReason: string | null;
  /** Why requesting changes or rejecting doesn't apply. */
  sendBackReason: string | null;
}

const HOST_FIRST = "Approve the Host's application first.";

/** Which decisions apply, following the API's rules, and why the others don't. */
/** Listings with nothing for staff to decide: the summary, and why every button is off. */
const IDLE: Record<
  'DRAFT' | 'CHANGES_REQUESTED' | 'REJECTED' | 'SUSPENDED',
  [summary: string, reason: string]
> = {
  DRAFT: ["A draft: the Host hasn't submitted it yet.", 'Nothing to decide until the Host submits it.'],
  CHANGES_REQUESTED: [
    'Sent back to the Host for changes.',
    'Nothing to decide until the Host makes the changes and submits it again.',
  ],
  REJECTED: ['Rejected.', 'Nothing to decide: it was rejected.'],
  SUSPENDED: ['Suspended.', "Nothing to decide while it's suspended."],
};

function decisionState({ vehicle, host }: AdminVehicle): DecisionState {
  const photos = vehicle.photos.filter((photo) => photo.status === 'PENDING').length;
  const documents = vehicle.documents.filter((document) => document.status === 'PENDING').length;
  const hostReason = host.status === 'APPROVED' ? null : HOST_FIRST;

  if (vehicle.status === 'UNDER_REVIEW') {
    return {
      summary: 'Under review. Approving puts it live in search.',
      approveLabel: 'Approve listing',
      approveReason: hostReason,
      sendBackReason: null,
    };
  }
  if (vehicle.status === 'ACTIVE' || vehicle.status === 'INACTIVE') {
    const waiting = [photos > 0 && 'photos', documents > 0 && 'documents'].filter(Boolean).join(' and ');
    return {
      summary: waiting
        ? `Live, with new ${waiting} waiting. Guests see only what's approved.`
        : 'Live, with everything approved.',
      approveLabel: 'Approve new photos and documents',
      approveReason: waiting ? hostReason : 'Nothing is waiting for approval.',
      sendBackReason: "A live listing can't be sent back: reject single photos or documents instead.",
    };
  }
  const [summary, reason] = IDLE[vehicle.status];
  return { summary, approveLabel: 'Approve listing', approveReason: reason, sendBackReason: reason };
}

const DIALOGS: Record<
  ListingDecision,
  {
    title: string;
    confirmLabel: string;
    notesLabel: string;
    notesDescription: string;
    tone: 'primary' | 'danger';
  }
> = {
  approve: {
    title: 'Approve this listing?',
    confirmLabel: 'Approve listing',
    notesLabel: 'Note for the Host (optional)',
    notesDescription: 'Shown on their listing and included in the email.',
    tone: 'primary',
  },
  'request-changes': {
    title: 'Request changes?',
    confirmLabel: 'Request changes',
    notesLabel: 'What needs changing',
    notesDescription: 'We email this to the Host and show it on their listing, so write it for them.',
    tone: 'primary',
  },
  reject: {
    title: 'Reject this listing?',
    confirmLabel: 'Reject listing',
    notesLabel: "Why it's rejected",
    notesDescription: 'We email this to the Host, so write it for them.',
    tone: 'danger',
  },
};

function dialogDescription(decision: ListingDecision, live: boolean): string {
  if (decision === 'approve') {
    return live
      ? 'They go on the live listing straight away.'
      : "It goes live in search straight away, with its waiting photos approved and documents verified. We'll email the Host.";
  }
  if (decision === 'request-changes') {
    return "It goes back to the Host, and can't be booked until they submit it again and it's approved.";
  }
  return "It won't go live. We'll email the Host your note.";
}

function toastFor(decision: ListingDecision, live: boolean): [title: string, description: string] {
  if (decision === 'approve') {
    return live
      ? ['New photos and documents approved', "They're on the listing now."]
      : ['Listing approved', "It's live in search, and we've emailed the Host."];
  }
  return decision === 'reject'
    ? ['Listing rejected', "We've emailed the Host your note."]
    : ['Sent back for changes', "We've emailed the Host your note."];
}

/**
 * Approve, request changes or reject (plan §9, Days 8–11). From tablet width up the bar stays at the
 * bottom of the screen while staff look through the listing; on a phone it sits at the end of the page,
 * so it doesn't cover the photos. Buttons that don't apply are disabled, with the reason.
 */
export function ListingDecisionBar({ listing }: { listing: AdminVehicle }) {
  const queryClient = useQueryClient();
  const { vehicle, host } = listing;
  const state = decisionState(listing);
  const live = vehicle.status === 'ACTIVE' || vehicle.status === 'INACTIVE';
  // Kept while the dialog closes, so its text doesn't change as it animates out.
  const [decision, setDecision] = useState<ListingDecision>('approve');
  const [open, setOpen] = useState(false);

  const start = (next: ListingDecision) => {
    setDecision(next);
    setOpen(true);
  };

  const decide = async (notes: string | undefined) => {
    let updated: HostVehicle;
    try {
      updated = await decideListingRequest({ id: vehicle.id, decision, notes });
    } catch (error) {
      // The page was out of date, e.g. the Host was suspended meanwhile: show where things stand now.
      if (isApiError(error, 'HOST_NOT_APPROVED') || isApiError(error, 'NOT_UNDER_REVIEW')) {
        void queryClient.invalidateQueries({ queryKey: adminVehicleQueryKey(vehicle.id) });
      }
      throw error;
    }
    setOpen(false);
    queryClient.setQueryData(adminVehicleQueryKey(vehicle.id), withVehicle(updated));
    void queryClient.invalidateQueries({ queryKey: reviewQueueQueryKey });
    const [title, description] = toastFor(decision, live);
    toast(title, { description });
  };

  const dialog = DIALOGS[decision];
  const reasons = [...new Set([state.approveReason, state.sendBackReason].filter(Boolean))];
  const reasonId = (reason: string | null) =>
    reason ? `decision-reason-${reasons.indexOf(reason)}` : undefined;

  return (
    <div className="z-20 -mx-4 mt-8 -mb-8 border-t border-line/70 bg-surface px-4 py-4 sm:glass sm:sticky sm:bottom-0 sm:-mx-6 sm:px-6 sm:py-3 lg:-mx-10 lg:-mb-10 lg:px-10">
      <section
        aria-labelledby="decision-heading"
        className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3"
      >
        <div className="min-w-0 flex-1 basis-72 text-sm">
          <h2 id="decision-heading" className="font-semibold text-ink">
            Decision
          </h2>
          <p className="text-muted">{state.summary}</p>
          {reasons.map((reason, index) => (
            <p key={reason} id={`decision-reason-${index}`} className="mt-0.5 text-ink">
              {reason}
              {reason === HOST_FIRST && (
                <>
                  {' '}
                  <Link
                    to={hostApplicationsLink(host.status)}
                    className="rounded-inner text-primary hover:underline"
                  >
                    Host applications
                  </Link>
                </>
              )}
            </p>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={Boolean(state.sendBackReason)}
            aria-describedby={reasonId(state.sendBackReason)}
            onClick={() => start('reject')}
          >
            <X aria-hidden="true" />
            Reject
          </Button>
          <Button
            variant="secondary"
            disabled={Boolean(state.sendBackReason)}
            aria-describedby={reasonId(state.sendBackReason)}
            onClick={() => start('request-changes')}
          >
            <Undo2 aria-hidden="true" />
            Request changes
          </Button>
          <Button
            disabled={Boolean(state.approveReason)}
            aria-describedby={reasonId(state.approveReason)}
            onClick={() => start('approve')}
          >
            <Check aria-hidden="true" />
            {state.approveLabel}
          </Button>
        </div>
      </section>

      <DecisionDialog
        open={open}
        onOpenChange={setOpen}
        title={decision === 'approve' && live ? 'Approve the new photos and documents?' : dialog.title}
        description={dialogDescription(decision, live)}
        confirmLabel={decision === 'approve' && live ? 'Approve' : dialog.confirmLabel}
        tone={dialog.tone}
        notes={decision === 'approve' ? 'optional' : 'required'}
        notesLabel={dialog.notesLabel}
        notesDescription={dialog.notesDescription}
        onConfirm={decide}
        errorAction={(error) =>
          isApiError(error, 'HOST_NOT_APPROVED') && (
            <Button variant="secondary" size="sm" asChild>
              <Link to={hostApplicationsLink(host.status)}>Open Host applications</Link>
            </Button>
          )
        }
      />
    </div>
  );
}
