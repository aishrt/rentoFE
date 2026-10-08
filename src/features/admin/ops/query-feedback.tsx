import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';
import { Skeleton } from '@/components/ui/skeleton';

/** Shown while a list loads: grey rows, announced to screen readers. */
export function ListSkeleton({
  label,
  rows = 5,
  height = 'h-14',
}: {
  label: string;
  rows?: number;
  height?: string;
}) {
  return (
    <div aria-busy="true" className="grid gap-2">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className={`${height} rounded-inner`} />
      ))}
    </div>
  );
}

/** A request that failed, with Try again. */
export function LoadError({
  title,
  error,
  onRetry,
  retrying,
}: {
  title: string;
  error: Error;
  onRetry: () => void;
  retrying?: boolean;
}) {
  return (
    <Alert
      variant="danger"
      role="alert"
      title={title}
      action={
        <Button variant="secondary" size="sm" onClick={onRetry} loading={retrying}>
          Try again
        </Button>
      }
    >
      {error.message}
    </Alert>
  );
}

/** Nothing to show: a calm empty state. */
export function EmptyList({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <EmptyState
      titleAs="h2"
      className="mx-auto py-12"
      visual={
        <IconBadge size="xl" tone="muted">
          {icon ?? <Inbox />}
        </IconBadge>
      }
      title={title}
      description={description}
    />
  );
}
