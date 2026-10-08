import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { useBlock, useBlockedUsers } from '@/features/messages/messages-api';
import { SettingsSection } from './settings-section';

/**
 * The people this person has blocked in messages (plan §9, Days 17–19), to unblock without finding the
 * conversation. Blocking itself happens in a conversation's menu.
 */
export function BlockedSection() {
  const blocked = useBlockedUsers();
  const block = useBlock();

  return (
    <SettingsSection
      title="Blocked people"
      description="They can’t message you. Messages about a booking you share still reach you both."
    >
      {blocked.isError ? (
        <Alert variant="danger" role="alert">
          {blocked.error.message}
        </Alert>
      ) : !blocked.data ? (
        <Skeleton aria-hidden="true" className="h-12" />
      ) : blocked.data.length === 0 ? (
        <p className="text-sm text-muted">
          You haven’t blocked anyone. You can block someone from a conversation.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {blocked.data.map((person) => (
            <li key={person.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <span className="flex min-w-0 items-center gap-3">
                <Avatar initials={person.firstName.slice(0, 1)} tone="accent" />
                <span className="truncate font-medium text-ink">{person.firstName}</span>
              </span>
              <Button
                variant="secondary"
                aria-label={`Unblock ${person.firstName}`}
                loading={block.isPending && block.variables?.userId === person.id}
                onClick={() =>
                  block.mutate(
                    { userId: person.id, block: false },
                    {
                      onSuccess: () => toast(`${person.firstName} is unblocked`),
                      onError: (error) =>
                        toast('That didn’t work', { description: error.message, tone: 'danger' }),
                    },
                  )
                }
              >
                Unblock
              </Button>
            </li>
          ))}
        </ul>
      )}
    </SettingsSection>
  );
}
