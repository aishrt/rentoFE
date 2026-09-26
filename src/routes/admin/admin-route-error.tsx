import { Link, useRouteError } from 'react-router';
import { ErrorMessage } from '@/components/errors/error-message';
import { PageMeta } from '@/components/layout/page-meta';

/** For a staff page that fails: the message takes the page's place, inside the portal's sidebar and header. */
export function AdminRouteError() {
  const error = useRouteError();

  return (
    <div className="flex justify-center py-16">
      <PageMeta title="Something went wrong · Staff portal" noindex />
      <ErrorMessage error={error} homeLink={<Link to="/admin">Back to overview</Link>} />
    </div>
  );
}
