import {
  CalendarCheck,
  ClipboardCheck,
  FileWarning,
  Fuel,
  Inbox,
  Landmark,
  PencilLine,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router';
import type { TodoItem } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { useHostTodo } from './earnings-api';

const ICONS: Record<TodoItem['kind'], LucideIcon> = {
  PAYOUT_SETUP: Landmark,
  REQUESTS: Inbox,
  CHECK_IN: CalendarCheck,
  CONFIRM_HANDOVER: ClipboardCheck,
  DOCUMENT_EXPIRING: FileWarning,
  RUC: Fuel,
  MAINTENANCE: Wrench,
  LISTING_CHANGES: PencilLine,
};

/**
 * The Host's to-do list (spec §9): payout setup, requests, check-ins, handovers to confirm, documents and
 * Road User Charges running out, maintenance and listings to update. Nothing to do, nothing shown; a list that
 * didn't load says so, with a way to try again.
 */
export function HostTodoList() {
  const todo = useHostTodo();
  if (todo.isPending) {
    return (
      <Card aria-hidden="true" className="grid gap-3 p-5 sm:p-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </Card>
    );
  }
  // A list already shown stays up if a later refresh fails.
  if (todo.isError && !todo.data) {
    return (
      <Alert
        variant="danger"
        role="alert"
        title="We couldn’t load your to-do list"
        action={
          <Button variant="secondary" size="sm" loading={todo.isFetching} onClick={() => void todo.refetch()}>
            Try again
          </Button>
        }
      >
        {todo.error.message}
      </Alert>
    );
  }
  if (!todo.data || todo.data.length === 0) return null;
  return (
    <Card asChild className="p-5 sm:p-6">
      <section aria-labelledby="host-todo">
        <h2 id="host-todo" className="font-semibold text-ink">
          To do
        </h2>
        <ul className="mt-3 divide-y divide-line/70">
          {todo.data.map((item, index) => {
            const Icon = ICONS[item.kind];
            return (
              <li key={`${item.kind}-${index}`}>
                <Link
                  to={item.link}
                  viewTransition
                  className="group flex items-start gap-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <Icon
                    aria-hidden="true"
                    className={cn('mt-0.5 size-5 shrink-0', item.urgent ? 'text-danger' : 'text-primary')}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-ink group-hover:underline">{item.title}</span>
                    {item.detail && <span className="block text-sm text-muted">{item.detail}</span>}
                  </span>
                  {item.urgent && (
                    <Badge variant="neutral" className="shrink-0 bg-danger/10 text-danger">
                      Now
                    </Badge>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </Card>
  );
}
