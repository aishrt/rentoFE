import { useQuery } from '@tanstack/react-query';
import type { SessionUser } from '@/api/types';
import { fetchSessionUser } from '@/features/auth/auth-api';
import { sessionQueryKey } from '@/features/auth/use-session';

/**
 * Whether a staff member can work with money (plan §6.2): refunds, charges, payments and payouts. The admin
 * always can; support staff need the refunds permission. The API checks it too.
 */
export const handlesMoney = (user: SessionUser | null | undefined): boolean =>
  Boolean(user?.roles.includes('ADMIN') || user?.permissions?.includes('REFUNDS'));

/**
 * handlesMoney() for the signed-in staff member. The portal has loaded the session already: this only reads
 * it, and until it's known the money actions show, as the API refuses them anyway.
 */
export function useHandlesMoney(): boolean {
  const { data } = useQuery<SessionUser | null>({
    queryKey: sessionQueryKey,
    queryFn: fetchSessionUser,
    enabled: false,
  });
  return data === undefined ? true : handlesMoney(data);
}
