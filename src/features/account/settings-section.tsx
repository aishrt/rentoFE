import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';

/** One part of the account settings page: a titled card. */
export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const id = `section-${title.toLowerCase().replaceAll(/\W+/g, '-')}`;
  return (
    <Card asChild className="p-6 sm:p-8">
      <section aria-labelledby={id}>
        <h2 id={id} className="text-lg font-semibold text-ink">
          {title}
        </h2>
        <p className="mt-1 mb-6 text-sm text-muted">{description}</p>
        {children}
      </section>
    </Card>
  );
}
