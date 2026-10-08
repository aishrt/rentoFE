import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/cn';
import { nameInitials } from './message-format';

/** Someone's profile photo, or their initials until they add one. */
export function PersonAvatar({
  name,
  photoUrl,
  className,
}: {
  name: string;
  photoUrl?: string;
  className?: string;
}) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        width={40}
        height={40}
        className={cn('size-10 shrink-0 rounded-full bg-canvas object-cover', className)}
      />
    );
  }
  return <Avatar initials={nameInitials(name)} className={cn('size-10 text-sm', className)} />;
}
