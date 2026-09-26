import { RotateCw } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface SectionErrorProps {
  title?: string;
  description?: string;
  /** Renders the section again, usually an ErrorBoundary's `reset`. */
  onRetry: () => void;
  className?: string;
}

/** The fallback for one section of a page that failed to render, with a way to try again. */
export function SectionError({
  title = "This part of the page didn't load",
  description = 'Try again, or reload the page if it keeps happening.',
  onRetry,
  className,
}: SectionErrorProps) {
  return (
    <Alert
      variant="danger"
      role="alert"
      title={title}
      className={className}
      action={
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RotateCw aria-hidden="true" />
          Try again
        </Button>
      }
    >
      {description}
    </Alert>
  );
}
