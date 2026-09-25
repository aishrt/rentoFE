import type { SessionUser } from '@/api/types';
import { DropdownMenuLabel } from '@/components/ui/dropdown-menu';

/** Who is signed in, at the top of the account menus on the website and in the staff portal. */
export function UserMenuLabel({ user }: { user: SessionUser }) {
  return (
    <DropdownMenuLabel>
      <p className="text-sm font-semibold text-ink">
        {user.firstName} {user.lastName}
      </p>
      <p className="truncate text-xs text-muted">{user.email}</p>
    </DropdownMenuLabel>
  );
}
