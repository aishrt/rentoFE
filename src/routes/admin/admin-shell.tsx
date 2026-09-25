import { AdminLayout, AdminLayoutSkeleton } from '@/features/admin/admin-layout';
import { RequireStaff } from '@/features/auth/require-staff';

/** The protected `/admin` route: only staff reach the layout and its pages. */
export function AdminShell() {
  return (
    <RequireStaff fallback={<AdminLayoutSkeleton />}>{(user) => <AdminLayout user={user} />}</RequireStaff>
  );
}
