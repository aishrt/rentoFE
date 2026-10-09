import { Flag } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import type { ReportRequest } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useSession } from '@/features/auth/use-session';
import { ReportDialogContent } from '@/features/messages/report-dialog';

interface ReportLinkProps {
  targetType: Extract<ReportRequest['targetType'], 'USER' | 'VEHICLE'>;
  targetId: string;
  /** Who or what is reported, in the dialog: "this listing", "Aroha". */
  subject: string;
  label: string;
  /** The member it belongs to: left off for them, since nobody reports themselves. */
  ownerId?: string;
  className?: string;
}

/**
 * Reports a member or a listing to the support team's Moderation queue (plan §3, reports: a user, message,
 * review or vehicle). Visitors who aren't signed in go to log in, and come back here afterwards.
 */
export function ReportLink({ targetType, targetId, subject, label, ownerId, className }: ReportLinkProps) {
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Shown once we know who's looking, so it doesn't flash on the owner's own page.
  if (session.isPending || (ownerId && session.data?.id === ownerId)) return null;

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
      <Button variant="ghost" size="sm" onClick={onClick} className={className}>
        <Flag aria-hidden="true" />
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        {open && (
          <ReportDialogContent
            targetType={targetType}
            targetId={targetId}
            subject={subject}
            onDone={() => setOpen(false)}
          />
        )}
      </Dialog>
    </>
  );
}
