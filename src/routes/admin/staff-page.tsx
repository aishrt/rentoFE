import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MailPlus, ShieldCheck, UserX, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { StaffInvite, StaffMember } from '@/api/types';
import { PageMeta } from '@/components/layout/page-meta';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { ConfirmDialog } from '@/features/admin/listings/confirm-dialog';
import { InviteSection } from '@/features/admin/staff/invite-section';
import {
  cancelInviteRequest,
  inviteStaffRequest,
  removeStaffRequest,
  staffErrorMessage,
  staffName,
  staffQueryKey,
  useStaff,
} from '@/features/admin/staff/staff-api';
import { initials } from '@/features/auth/roles';
import { useSession } from '@/features/auth/use-session';
import { formatLongDateNz } from '@/lib/format';

type Pending = { kind: 'remove'; member: StaffMember } | { kind: 'cancel'; invite: StaffInvite };

/**
 * The staff (plan §6.2): the one admin, set on the server and not changeable here, and the support team,
 * who join only by the admin's invitation. Only the admin sees this page.
 */
export function AdminStaffPage() {
  const session = useSession();
  const isAdmin = session.data?.roles.includes('ADMIN') ?? false;

  return (
    <div className="mx-auto max-w-3xl">
      <PageMeta title="Staff · Staff portal" noindex />

      <header className="animate-fade-up">
        <p className="eyebrow text-primary">Platform</p>
        <h1 className="headline mt-2 text-title-3 font-medium">Staff</h1>
        <p className="mt-2 text-muted">
          There&rsquo;s one admin. The support team joins by invitation: nobody can make a staff account
          themselves.
        </p>
      </header>

      {isAdmin ? (
        <div className="mt-8 grid gap-6">
          <InviteSection />
          <StaffSection />
        </div>
      ) : (
        <EmptyState
          titleAs="h2"
          className="mx-auto py-12"
          visual={
            <IconBadge size="xl" tone="muted">
              <ShieldCheck />
            </IconBadge>
          }
          title="Only the admin manages staff"
          description="Ask the admin if someone needs to join or leave the support team."
        />
      )}
    </div>
  );
}

function StaffSection() {
  const queryClient = useQueryClient();
  const staff = useStaff();
  // Kept while the dialog closes, so its text doesn't change as it animates out.
  const [pending, setPending] = useState<Pending | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const resend = useMutation({
    mutationFn: (invite: StaffInvite) =>
      inviteStaffRequest({ email: invite.email, firstName: invite.firstName, lastName: invite.lastName }),
    onSuccess: (sent) => {
      toast(`Invitation sent again to ${sent.email}`, { description: 'The earlier link no longer works.' });
      void queryClient.invalidateQueries({ queryKey: staffQueryKey });
    },
    onError: (error) => toast(staffErrorMessage(error) ?? "We couldn't send it", { tone: 'danger' }),
  });

  const ask = (next: Pending) => {
    setPending(next);
    setDialogOpen(true);
  };

  const confirm = async () => {
    if (!pending) return;
    if (pending.kind === 'remove') {
      await removeStaffRequest(pending.member.id);
      toast(`${staffName(pending.member)} is off the support team`, {
        description: "They're signed out of the staff portal.",
      });
    } else {
      await cancelInviteRequest(pending.invite.id);
      toast(`Invitation to ${pending.invite.email} cancelled`);
    }
    setDialogOpen(false);
    void queryClient.invalidateQueries({ queryKey: staffQueryKey });
  };

  if (staff.isPending) {
    return (
      <div aria-busy="true" className="grid gap-4">
        <span className="sr-only">Loading the staff</span>
        <Skeleton className="h-64 rounded-card" />
      </div>
    );
  }

  if (staff.isError) {
    return (
      <Alert
        variant="danger"
        role="alert"
        title="We couldn't load the staff"
        action={
          <Button variant="secondary" size="sm" onClick={() => staff.refetch()} loading={staff.isFetching}>
            Try again
          </Button>
        }
      >
        {staff.error.message}
      </Alert>
    );
  }

  const { staff: members, invites } = staff.data;

  return (
    <>
      <Card asChild className="p-6 sm:p-8">
        <section aria-labelledby="staff-members">
          <h2 id="staff-members" className="text-lg font-semibold text-ink">
            Team
          </h2>
          <p className="mt-1 mb-6 text-sm text-muted">
            The admin is set on the server and can&rsquo;t be changed or removed here.
          </p>
          <ul aria-label="Staff" className="divide-y divide-line">
            {members.map((member) => (
              <Row
                key={member.id}
                avatar={
                  <Avatar initials={initials(member)} tone={member.role === 'ADMIN' ? 'accent' : 'primary'} />
                }
                title={
                  <>
                    {staffName(member)}
                    <Badge variant={member.role === 'ADMIN' ? 'accent' : 'neutral'}>
                      {member.role === 'ADMIN' ? 'Admin' : 'Support'}
                    </Badge>
                    {member.status === 'SUSPENDED' && <Badge variant="outline">Suspended</Badge>}
                  </>
                }
                detail={`${member.email} · ${
                  member.lastLoginAt
                    ? `last logged in ${formatLongDateNz(new Date(member.lastLoginAt))}`
                    : 'not logged in yet'
                }${member.mfaEnabled ? ' · two-factor on' : ''}`}
                action={
                  member.role === 'SUPPORT' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove ${staffName(member)}`}
                      onClick={() => ask({ kind: 'remove', member })}
                    >
                      <UserX aria-hidden="true" />
                      Remove
                    </Button>
                  )
                }
              />
            ))}
          </ul>
        </section>
      </Card>

      <Card asChild className="p-6 sm:p-8">
        <section aria-labelledby="staff-invites">
          <h2 id="staff-invites" className="text-lg font-semibold text-ink">
            Invitations
          </h2>
          <p className="mt-1 mb-6 text-sm text-muted">Sent and not accepted yet.</p>
          {invites.length === 0 ? (
            <p className="text-sm text-muted">No open invitations.</p>
          ) : (
            <ul aria-label="Open invitations" className="divide-y divide-line">
              {invites.map((invite) => (
                <Row
                  key={invite.id}
                  avatar={
                    <IconBadge size="sm" tone="muted">
                      <MailPlus />
                    </IconBadge>
                  }
                  title={staffName(invite)}
                  detail={`${invite.email} · expires ${formatLongDateNz(new Date(invite.expiresAt))}`}
                  action={
                    <div className="flex flex-wrap gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Send the invitation to ${invite.email} again`}
                        loading={resend.isPending && resend.variables?.id === invite.id}
                        onClick={() => resend.mutate(invite)}
                      >
                        Send again
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Cancel the invitation to ${invite.email}`}
                        onClick={() => ask({ kind: 'cancel', invite })}
                      >
                        <X aria-hidden="true" />
                        Cancel
                      </Button>
                    </div>
                  }
                />
              ))}
            </ul>
          )}
        </section>
      </Card>

      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={
          pending?.kind === 'remove'
            ? `Remove ${staffName(pending.member)} from the support team?`
            : `Cancel the invitation to ${pending?.invite.email ?? ''}?`
        }
        description={
          pending?.kind === 'remove'
            ? "They're signed out of the staff portal straight away, and their authenticator apps are removed. Their account stays, and you can invite them again."
            : 'The link in their email stops working. You can invite them again later.'
        }
        confirmLabel={pending?.kind === 'remove' ? 'Remove' : 'Cancel invitation'}
        onConfirm={confirm}
      />
    </>
  );
}

function Row({
  avatar,
  title,
  detail,
  action,
}: {
  avatar: ReactNode;
  title: ReactNode;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-4 first:pt-0 last:pb-0">
      {avatar}
      {/* On a phone the actions drop below the details, lined up with them, so an email isn't squeezed. */}
      <div className="min-w-0 flex-1 basis-48">
        <p className="flex flex-wrap items-center gap-2 font-medium text-ink">{title}</p>
        <p className="mt-0.5 text-sm break-words text-muted">{detail}</p>
      </div>
      {action && <div className="ml-12 sm:ml-0">{action}</div>}
    </li>
  );
}
