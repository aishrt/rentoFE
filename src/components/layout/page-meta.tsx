const SITE_NAME = 'Rento Vroom';

interface PageMetaProps {
  /** Page title; the site name is added after it. */
  title?: string;
  description?: string;
  /** Keep private pages (sign-in, admin) out of search results (plan §1.4). */
  noindex?: boolean;
}

/** React 19 moves these tags into <head> and updates them as the visitor navigates (plan §1.4, item 3). */
export function PageMeta({ title, description, noindex }: PageMetaProps) {
  return (
    <>
      <title>
        {title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} · Rent a car from local owners across New Zealand`}
      </title>
      {description && <meta name="description" content={description} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
    </>
  );
}
