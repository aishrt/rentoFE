import { TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';
import { photoDateNote } from './angles';

/**
 * A small note under an inspection photo whose own date is more than an hour from when it was added to
 * the inspection (plan §3, conditionReports.photos.exifTakenAt): an old gallery photo shows to the other
 * party and to support. Nothing for a photo taken in the flow.
 */
export function PhotoDateNote({
  photo,
  className,
}: {
  photo: { takenAt: string; exifTakenAt?: string };
  className?: string;
}) {
  const note = photoDateNote(photo);
  if (!note) return null;
  return (
    <span className={cn('flex items-center gap-1.5 text-xs text-ink', className)}>
      <TriangleAlert aria-hidden="true" className="size-3.5 shrink-0 text-warning" />
      {note}
    </span>
  );
}
