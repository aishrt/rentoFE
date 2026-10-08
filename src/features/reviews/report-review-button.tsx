import { Flag } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Dialog } from '@/components/ui/dialog';
import { IconButton } from '@/components/ui/icon-button';
import { useSession } from '@/features/auth/use-session';
import { ReportDialogContent } from '@/features/messages/report-dialog';
import { cn } from '@/lib/cn';

interface ReportReviewButtonProps {
  reviewId: string;
  author: { id: string; firstName: string };
  className?: string;
}

/**
 * Reports a published review to the support team (plan §9, Days 21–22: anyone can report a review). It's
 * left off the reader's own reviews. Visitors who aren't signed in go to log in, and come back here
 * afterwards.
 */
export function ReportReviewButton({ reviewId, author, className }: ReportReviewButtonProps) {
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  if (session.data && session.data.id === author.id) return null;

  const onClick = () => {
    if (!session.data) {
      navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`, {
        viewTransition: true,
      });
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <IconButton
        label={`Report ${author.firstName}’s review`}
        onClick={onClick}
        className={cn('text-muted', className)}
      >
        <Flag aria-hidden="true" />
      </IconButton>
      <Dialog open={open} onOpenChange={setOpen}>
        {open && (
          <ReportDialogContent
            targetType="REVIEW"
            targetId={reviewId}
            subject={`${author.firstName}’s review`}
            onDone={() => setOpen(false)}
          />
        )}
      </Dialog>
    </>
  );
}
