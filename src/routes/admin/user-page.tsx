import { useMutation } from '@tanstack/react-query';
import { Ban, KeyRound, LockOpen, SearchX, UserX } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError } from '@/api/client';
import type { AdminUserDetail } from '@/api/types';
import { PageMeta } from '@/components/layout/page-meta';
import { Alert } from '@/components/ui/alert';
import { BackLink } from '@/components/ui/back-link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { ReviewSection } from '@/features/admin/listings/review-section';
import { ROLE_LABELS, USER_STATUS } from '@/features/admin/ops/admin-labels';
import { AdminPageHeader } from '@/features/admin/ops/admin-page-header';
import { LoadError } from '@/features/admin/ops/query-feedback';
import { resetStaffMfaRequest } from '@/features/admin/staff/staff-api';
import { RiskFlagItem } from '@/features/admin/users/risk-flag-item';
import { ActionDialog, ReasonDialog, WaiveFeeDialog } from '@/features/admin/users/user-dialogs';
import { fullName } from '@/features/admin/users/user-format';
import {
  AccountSection,
  HostSection,
  LicenceSection,
  UserBookingsTable,
} from '@/features/admin/users/user-sections';
import {
  clearRiskFlagRequest,
  closeUserRequest,
  setRefundsPermissionRequest,
  suspendUserRequest,
  unsuspendUserRequest,
  useAdminUser,
  useUpdateUserCache,
  userErrorMessage,
  waiveHostFeeRequest,
} from '@/features/admin/users/users-api';
import { useSession } from '@/features/auth/use-session';
import { StatusBadge } from '@/features/booking/booking-parts';
import { formatNzd } from '@/features/booking/booking-format';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';

const UPCOMING_ID = 'upcoming-bookings';

function UsersLink() {
  return <BackLink to="/admin/users">Users</BackLink>;
}

function RecordSkeleton() {
  return (
    <div aria-busy="true" className="mt-5">
      <span className="sr-only">Loading their record</span>
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-3 h-9 w-80 max-w-full" />
      <Skeleton className="mt-3 h-6 w-56 max-w-full" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid content-start gap-6">
          <Skeleton className="h-48 rounded-card" />
          <Skeleton className="h-64 rounded-card" />
        </div>
        <Skeleton className="h-80 rounded-card" />
      </div>
    </div>
  );
}

/**
 * Someone's record (plan §12.6): their account, licence and hosting, risk flags and bookings, and what staff
 * can do about them: suspend, waive Host fees, and for the admin, close the account and manage support staff.
 */
export function AdminUserPage() {
  const { id = '' } = useParams();
  const user = useAdminUser(id);

  if (user.isPending) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageMeta title="User · Staff portal" noindex />
        <UsersLink />
        <RecordSkeleton />
      </div>
    );
  }

  if (user.isError) {
    const missing = user.error instanceof ApiError && user.error.status === 404;
    return (
      <div className="mx-auto max-w-6xl">
        <PageMeta title="User · Staff portal" noindex />
        <UsersLink />
        {missing ? (
          <EmptyState
            className="mx-auto mt-11"
            visual={
              <IconBadge size="xl" tone="muted">
                <SearchX />
              </IconBadge>
            }
            title="We couldn’t find that person"
            description="The link may be wrong. Search for them in Users."
            actions={
              <Button asChild>
                <Link to="/admin/users">Open Users</Link>
              </Button>
            }
          />
        ) : (
          <div className="mt-9">
            <LoadError
              title="We couldn’t load their record"
              error={user.error}
              onRetry={() => user.refetch()}
              retrying={user.isFetching}
            />
          </div>
        )}
      </div>
    );
  }

  return <UserRecord user={user.data} />;
}

type DialogName = 'suspend' | 'unsuspend' | 'waive' | 'close' | 'reset-mfa';

function UserRecord({ user }: { user: AdminUserDetail }) {
  const session = useSession();
  const isAdmin = session.data?.roles.includes('ADMIN') ?? false;
  const isSelf = session.data?.id === user.id;
  const updateCache = useUpdateUserCache();
  const reduceMotion = useReducedMotion();
  const [dialog, setDialog] = useState<DialogName | null>(null);
  // After a suspension, the bookings it affects are brought into view for staff to keep or cancel.
  const [highlightUpcoming, setHighlightUpcoming] = useState(false);

  const name = fullName(user);
  const suspended = user.status === 'SUSPENDED';
  const canAct = !user.closed && !isSelf;
  const isSupportMember = user.roles.includes('SUPPORT');
  const openFlags = user.riskFlags.filter((flag) => !flag.clearedAt);
  // Open flags first, then the cleared ones as history.
  const flags = [...openFlags, ...user.riskFlags.filter((flag) => flag.clearedAt)];

  useEffect(() => {
    if (!highlightUpcoming) return;
    document
      .getElementById(UPCOMING_ID)
      ?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }, [highlightUpcoming, reduceMotion]);

  const dialogProps = (which: DialogName) => ({
    open: dialog === which,
    onOpenChange: (open: boolean) => setDialog(open ? which : null),
  });

  const clearFlag = useMutation({
    mutationFn: clearRiskFlagRequest,
    onSuccess: (updated) => {
      updateCache(updated);
      toast('Flag cleared');
    },
    onError: (error) => toast(userErrorMessage(error) ?? 'We couldn’t clear it', { tone: 'danger' }),
  });

  const refunds = useMutation({
    mutationFn: setRefundsPermissionRequest,
    onSuccess: (updated) => {
      updateCache(updated);
      toast(
        updated.permissions.includes('REFUNDS')
          ? `${user.firstName} can now issue refunds`
          : `${user.firstName} can no longer issue refunds`,
      );
    },
    onError: (error) => toast(userErrorMessage(error) ?? 'We couldn’t change it', { tone: 'danger' }),
  });

  const suspend = async (reason: string) => {
    const updated = await suspendUserRequest({ id: user.id, reason });
    updateCache(updated);
    setDialog(null);
    setHighlightUpcoming(true);
    toast(`${name} is suspended`, {
      description:
        updated.upcomingBookings.length > 0
          ? 'Check their upcoming bookings: keep or cancel each one.'
          : 'They’ve been signed out and have no upcoming bookings.',
    });
  };

  const unsuspend = async () => {
    updateCache(await unsuspendUserRequest(user.id));
    setDialog(null);
    setHighlightUpcoming(false);
    toast(`${name} can sign in again`);
  };

  const waive = async (input: { amountCents?: number; reason: string }) => {
    const updated = await waiveHostFeeRequest({ id: user.id, ...input });
    updateCache(updated);
    setDialog(null);
    toast('Fees waived', { description: `${name} now owes ${formatNzd(updated.host?.feesOwedCents ?? 0)}.` });
  };

  const close = async () => {
    updateCache(await closeUserRequest(user.id));
    setDialog(null);
    toast(`${name}’s account is closed`, { description: 'Their details have been anonymised.' });
  };

  const resetMfa = async () => {
    await resetStaffMfaRequest(user.id);
    setDialog(null);
    toast(`${name}’s authenticator is reset`, {
      description: 'They can sign in with their password and set up a new app.',
    });
  };

  return (
    <div className="mx-auto max-w-6xl">
      <UsersLink />

      <div className="mt-5">
        <AdminPageHeader
          eyebrow="Marketplace"
          title={name}
          actions={
            canAct &&
            (suspended ? (
              <Button variant="secondary" onClick={() => setDialog('unsuspend')}>
                <LockOpen aria-hidden="true" />
                Lift suspension
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setDialog('suspend')}>
                <Ban aria-hidden="true" />
                Suspend
              </Button>
            ))
          }
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {user.closed ? (
            <Badge variant="outline">Closed</Badge>
          ) : (
            <StatusBadge status={USER_STATUS[user.status]} />
          )}
          {user.roles.map((role) => (
            <Badge key={role} variant={role === 'ADMIN' || role === 'SUPPORT' ? 'accent' : 'neutral'}>
              {ROLE_LABELS[role]}
            </Badge>
          ))}
        </div>
      </div>

      {user.closed ? (
        <Alert className="mt-6" title="This account is closed">
          It was anonymised at the member’s request. Their bookings and payments stay for the periods the law
          requires.
        </Alert>
      ) : (
        suspended && (
          <Alert variant="danger" className="mt-6" title="Suspended">
            {user.suspendedReason ?? 'No reason was recorded.'}
          </Alert>
        )
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid min-w-0 content-start gap-6">
          <AccountSection user={user} />

          <ReviewSection
            id={UPCOMING_ID}
            title="Upcoming bookings"
            description="Confirmed and requested trips still to come, as Guest or Host."
            className={cn(
              'transition-shadow duration-320',
              highlightUpcoming && 'ring-2 ring-primary ring-offset-2 ring-offset-canvas',
            )}
          >
            {suspended && !user.closed && user.upcomingBookings.length > 0 && (
              <Alert className="mb-5" title="Decide what happens to these bookings">
                {user.firstName} is suspended. Open each booking to keep it or cancel it.
              </Alert>
            )}
            <UserBookingsTable
              label="Upcoming bookings"
              bookings={user.upcomingBookings}
              selfId={user.id}
              empty="No upcoming bookings."
            />
          </ReviewSection>

          <ReviewSection id="bookings" title="Bookings" description="The latest 20, as Guest or Host.">
            <UserBookingsTable
              label="Bookings"
              bookings={user.bookings}
              selfId={user.id}
              empty="No bookings yet."
            />
          </ReviewSection>
        </div>

        <div className="grid min-w-0 content-start gap-6">
          <ReviewSection
            id="risk-flags"
            title="Risk flags"
            aside={
              openFlags.length > 0 && (
                <Badge variant="neutral" className="bg-danger/8 text-danger">
                  {formatNumber(openFlags.length)} open
                </Badge>
              )
            }
          >
            {flags.length > 0 ? (
              <ul aria-label="Risk flags" className="divide-y divide-line">
                {flags.map((flag) => (
                  <RiskFlagItem
                    key={flag.id}
                    flag={flag}
                    clearing={clearFlag.isPending && clearFlag.variables.flagId === flag.id}
                    onClear={() => clearFlag.mutate({ id: user.id, flagId: flag.id })}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No risk flags.</p>
            )}
          </ReviewSection>

          {user.host && (
            <HostSection
              host={user.host}
              onWaive={user.host.feesOwedCents > 0 ? () => setDialog('waive') : undefined}
            />
          )}

          <LicenceSection licence={user.licence} />

          {isAdmin && isSupportMember && !user.closed && (
            <ReviewSection id="staff-access" title="Support team">
              <Switch
                label="Can issue refunds"
                description="Refund Guests, see payments and payouts, and waive Host fees."
                checked={user.permissions.includes('REFUNDS')}
                disabled={refunds.isPending}
                onCheckedChange={(checked) => refunds.mutate({ id: user.id, refunds: checked })}
              />
              <div className="mt-4 border-t border-line pt-4">
                <p className="text-sm text-muted">Lost their phone? Reset their authenticator.</p>
                <Button variant="secondary" size="sm" className="mt-3" onClick={() => setDialog('reset-mfa')}>
                  <KeyRound aria-hidden="true" />
                  Reset authenticator
                </Button>
              </div>
            </ReviewSection>
          )}

          {isAdmin && canAct && (
            <ReviewSection
              id="close-account"
              title="Close account"
              description="When they’ve asked us to close it. Their details are anonymised; this can’t be undone."
            >
              <Button
                variant="secondary"
                size="sm"
                className="text-danger"
                onClick={() => setDialog('close')}
              >
                <UserX aria-hidden="true" />
                Close account
              </Button>
            </ReviewSection>
          )}
        </div>
      </div>

      <ReasonDialog
        {...dialogProps('suspend')}
        title={`Suspend ${name}?`}
        description="They’re signed out straight away and can’t sign in. Their listings are hidden from search and their payouts are held. Their upcoming bookings are listed here for you to keep or cancel."
        notice={
          user.upcomingBookings.length > 0 ? (
            <Alert>
              {user.upcomingBookings.length === 1
                ? 'They have 1 upcoming booking.'
                : `They have ${formatNumber(user.upcomingBookings.length)} upcoming bookings.`}
            </Alert>
          ) : undefined
        }
        reasonLabel="Reason"
        reasonDescription="We include it in the email telling them, and keep it in the audit log."
        confirmLabel="Suspend account"
        onConfirm={suspend}
      />

      <ActionDialog
        {...dialogProps('unsuspend')}
        title={`Lift ${name}’s suspension?`}
        description="They can sign in again, their listings return to search and any held payouts are sent."
        confirmLabel="Lift suspension"
        tone="primary"
        onConfirm={unsuspend}
      />

      {user.host && (
        <WaiveFeeDialog
          {...dialogProps('waive')}
          name={user.firstName}
          owedCents={user.host.feesOwedCents}
          onConfirm={waive}
        />
      )}

      {isAdmin && (
        <ActionDialog
          {...dialogProps('close')}
          title={`Close ${name}’s account?`}
          description="Only when they’ve asked us to. Their name, contact details, licence and listings are removed, and they can’t sign in again. This can’t be undone."
          notice={
            <Alert>
              Bookings, payments and the audit log stay for the periods the law requires. We can’t close an
              account while a trip, booking, incident, charge or payout is under way.
            </Alert>
          }
          confirmLabel="Close account"
          onConfirm={close}
        />
      )}

      {isAdmin && isSupportMember && (
        <ActionDialog
          {...dialogProps('reset-mfa')}
          title={`Reset ${name}’s authenticator?`}
          description="Their authenticator apps are removed and they’re signed out everywhere. They sign in with their password, then can set up a new app in Settings."
          confirmLabel="Reset authenticator"
          onConfirm={resetMfa}
        />
      )}
    </div>
  );
}
