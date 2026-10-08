import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router';
import type { RiskUser } from '@/api/types';
import { staggerIndex } from '@/components/motion/presets';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { toast } from '@/components/ui/toast';
import { ROLE_LABELS, USER_STATUS } from '@/features/admin/ops/admin-labels';
import { AdminPageHeader } from '@/features/admin/ops/admin-page-header';
import { EmptyList, ListSkeleton, LoadError } from '@/features/admin/ops/query-feedback';
import { RiskFlagItem } from '@/features/admin/users/risk-flag-item';
import { fullName } from '@/features/admin/users/user-format';
import {
  clearRiskFlagRequest,
  riskQueueQueryKey,
  useRiskQueue,
  useUpdateUserCache,
  userErrorMessage,
} from '@/features/admin/users/users-api';
import { StatusBadge } from '@/features/booking/booking-parts';
import { formatNumber } from '@/lib/format';

/**
 * The risk queue (plan §14): people our automatic checks flagged, such as a licence used on two accounts or
 * many failed payments, most flags first. Staff look into each flag and clear it, or suspend the account
 * from the person's record.
 */
export function AdminRiskPage() {
  const queryClient = useQueryClient();
  const queue = useRiskQueue();
  const updateCache = useUpdateUserCache();
  const clear = useMutation({
    mutationFn: clearRiskFlagRequest,
    onSuccess: (user, { flagId }) => {
      // It leaves the queue straight away; the refetch then confirms the order.
      queryClient.setQueryData<{ users: RiskUser[] }>(
        riskQueueQueryKey,
        (previous) =>
          previous && {
            users: previous.users
              .map((person) => ({ ...person, flags: person.flags.filter((flag) => flag.id !== flagId) }))
              .filter((person) => person.flags.length > 0),
          },
      );
      updateCache(user);
      toast('Flag cleared');
    },
    onError: (error) => toast(userErrorMessage(error) ?? 'We couldn’t clear it', { tone: 'danger' }),
  });

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        eyebrow="Operations"
        title="Risk review"
        description="People our checks flagged, most flags first. Look into each flag, then clear it. To suspend someone, open their record."
        actions={
          queue.data && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <span aria-live="polite">
                {formatNumber(queue.data.length)} {queue.data.length === 1 ? 'person' : 'people'}
              </span>
              <IconButton
                label="Refresh the list"
                onClick={() => queue.refetch()}
                disabled={queue.isFetching}
              >
                <RefreshCw aria-hidden="true" className={queue.isFetching ? 'animate-spin' : undefined} />
              </IconButton>
            </div>
          )
        }
      />

      <div className="mt-8">
        {queue.isPending && <ListSkeleton label="Loading the risk queue" rows={4} height="h-40" />}

        {queue.isError && (
          <LoadError
            title="We couldn’t load the risk queue"
            error={queue.error}
            onRetry={() => queue.refetch()}
            retrying={queue.isFetching}
          />
        )}

        {queue.data?.length === 0 && (
          <EmptyList
            icon={<ShieldCheck />}
            title="Nothing to review"
            description="When our checks flag someone, they’ll appear here."
          />
        )}

        {queue.data && queue.data.length > 0 && (
          <ul aria-label="People to review" className="grid gap-4">
            {queue.data.map((person, index) => (
              <PersonCard
                key={person.id}
                person={person}
                index={index}
                clearingFlag={clear.isPending ? clear.variables.flagId : undefined}
                onClear={(flagId) => clear.mutate({ id: person.id, flagId })}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PersonCard({
  person,
  index,
  clearingFlag,
  onClear,
}: {
  person: RiskUser;
  index: number;
  clearingFlag?: string;
  onClear: (flagId: string) => void;
}) {
  const name = fullName(person);
  const headingId = `risk-${person.id}`;
  return (
    <Card asChild className="stagger-in p-5 sm:p-6" style={staggerIndex(index)}>
      <li aria-labelledby={headingId}>
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h2 id={headingId} className="text-lg font-semibold text-ink">
              <Link to={`/admin/users/${person.id}`} className="rounded-inner text-primary hover:underline">
                {name}
              </Link>
            </h2>
            <p className="mt-0.5 text-sm break-words text-muted">
              {person.email} · {person.roles.map((role) => ROLE_LABELS[role]).join(', ')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {person.closed ? (
              <Badge variant="outline">Closed</Badge>
            ) : (
              <StatusBadge status={USER_STATUS[person.status]} />
            )}
            <Badge variant="neutral" className="bg-danger/8 text-danger">
              {person.flags.length === 1 ? '1 flag' : `${formatNumber(person.flags.length)} flags`}
            </Badge>
          </div>
        </div>
        <ul aria-label={`Flags for ${name}`} className="mt-4 divide-y divide-line border-t border-line pt-4">
          {person.flags.map((flag) => (
            <RiskFlagItem
              key={flag.id}
              flag={flag}
              clearing={clearingFlag === flag.id}
              onClear={() => onClear(flag.id)}
            />
          ))}
        </ul>
      </li>
    </Card>
  );
}
