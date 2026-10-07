import { CircleAlert, FileText, PencilLine, UserX, type LucideIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ApiError } from '@/api/client';
import type { PrivacyRequest } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { Textarea } from '@/features/content/textarea';
import { useAccountClosure, usePrivacyRequest } from './dashboard-api';
import { SettingsSection } from './settings-section';

type Kind = PrivacyRequest['type'];

const COPY: Record<
  Kind,
  { button: string; icon: LucideIcon; title: string; description: string; label: string; submit: string }
> = {
  ACCESS: {
    button: 'Ask for a copy of my information',
    icon: FileText,
    title: 'Ask for a copy of your information',
    description:
      'We’ll email you a copy of the personal information Rento Vroom holds about you, within 20 working days.',
    label: 'Anything in particular? (optional)',
    submit: 'Send request',
  },
  CORRECTION: {
    button: 'Ask us to correct something',
    icon: PencilLine,
    title: 'Ask us to correct your information',
    description:
      'Tell us what’s wrong and what it should be. Your email, mobile and password you can change yourself above.',
    label: 'What needs correcting',
    submit: 'Send request',
  },
  CLOSE_ACCOUNT: {
    button: 'Close my account',
    icon: UserX,
    title: 'Close your account?',
    description:
      'We’ll remove your personal details and take any listings down. We keep only what the law requires, such as booking and payment records. This can’t be undone.',
    label: 'Why are you leaving? (optional)',
    submit: 'Ask to close my account',
  },
};

function Blockers() {
  const closure = useAccountClosure(true);
  if (closure.isPending) return <Skeleton aria-hidden="true" className="h-16" />;
  if (closure.isError) {
    return (
      <Alert variant="danger" role="alert">
        {closure.error.message}
      </Alert>
    );
  }
  if (closure.data.allowed) return null;
  return (
    <Alert variant="danger" role="alert" title="Your account can’t be closed yet">
      <ul className="grid gap-1.5">
        {closure.data.blockers.map((blocker) => (
          <li key={blocker.code}>{blocker.message}</li>
        ))}
      </ul>
      <p className="mt-2">
        Once these are sorted, come back here. Questions?{' '}
        <Link to="/account/support" className="link-underline font-medium text-primary">
          Help and support
        </Link>
      </p>
    </Alert>
  );
}

function RequestForm({ kind, onDone }: { kind: Kind; onDone: () => void }) {
  const request = usePrivacyRequest();
  const closure = useAccountClosure(kind === 'CLOSE_ACCOUNT');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | undefined>();
  const copy = COPY[kind];
  const blocked = kind === 'CLOSE_ACCOUNT' && closure.data?.allowed === false;

  const send = (event: FormEvent) => {
    event.preventDefault();
    if (kind === 'CORRECTION' && message.trim().length < 10) {
      setError('Tell us what needs correcting (at least 10 characters)');
      return;
    }
    setError(undefined);
    request.mutate(
      { type: kind, ...(message.trim() && { message: message.trim() }) },
      {
        onSuccess: ({ ref, alreadyOpen }) => {
          onDone();
          toast(alreadyOpen ? 'You’ve already asked' : 'Request sent', {
            description: alreadyOpen
              ? `We’re working on it under ${ref}. You’ll find it in Help and support.`
              : `Your reference is ${ref}. We’ll reply by email, and it’s in Help and support.`,
          });
        },
        onError: (failure) => {
          if (failure instanceof ApiError && failure.fields?.message) setError(failure.fields.message);
        },
      },
    );
  };

  return (
    <form onSubmit={send} noValidate className="grid gap-5">
      {kind === 'CLOSE_ACCOUNT' && <Blockers />}
      {!blocked && (
        <Field label={copy.label} error={error}>
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            maxLength={2000}
            className="min-h-28"
          />
        </Field>
      )}
      {request.isError && !(request.error instanceof ApiError && request.error.fields?.message) && (
        <Alert variant="danger" role="alert">
          {request.error.message}
        </Alert>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <DialogClose asChild>
          <Button variant="ghost">{blocked ? 'Close' : 'Cancel'}</Button>
        </DialogClose>
        {!blocked && (
          <Button
            type="submit"
            variant={kind === 'CLOSE_ACCOUNT' ? 'danger' : 'primary'}
            loading={request.isPending}
            disabled={kind === 'CLOSE_ACCOUNT' && !closure.data}
          >
            {copy.submit}
          </Button>
        )}
      </div>
    </form>
  );
}

/**
 * Privacy (NZ Privacy Act 2020, plan §8.2 and §14): a copy of the user's information, a correction, or closing
 * the account. Each goes to the support team as a request, answered by email and shown in Help and support.
 * Closing is refused while a trip, booking, incident, charge or payout is still under way.
 */
export function PrivacySection() {
  const [open, setOpen] = useState<Kind | null>(null);
  const copy = open ? COPY[open] : null;

  return (
    <SettingsSection
      title="Your privacy"
      description="Ask for a copy of the information we hold about you, ask us to correct it, or close your account."
    >
      <div className="flex flex-col items-start gap-2">
        {(Object.keys(COPY) as Kind[]).map((kind) => {
          const Icon = COPY[kind].icon;
          return (
            <Button
              key={kind}
              variant="ghost"
              size="sm"
              onClick={() => setOpen(kind)}
              className={kind === 'CLOSE_ACCOUNT' ? 'text-danger hover:bg-danger/8' : 'text-primary'}
            >
              <Icon aria-hidden="true" />
              {COPY[kind].button}
            </Button>
          );
        })}
      </div>
      <p className="mt-4 flex items-start gap-2 text-xs text-muted">
        <CircleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" />
        <span>
          Read how we handle your information in our{' '}
          <Link to="/privacy" className="link-underline font-medium text-primary">
            Privacy Policy
          </Link>
          .
        </span>
      </p>
      <Dialog open={open !== null} onOpenChange={(next) => !next && setOpen(null)}>
        {open && copy && (
          <DialogContent title={copy.title} description={copy.description}>
            <RequestForm key={open} kind={open} onDone={() => setOpen(null)} />
          </DialogContent>
        )}
      </Dialog>
    </SettingsSection>
  );
}
