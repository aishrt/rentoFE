import type { HostVehicle } from '@/api/types';
import { Card } from '@/components/ui/card';
import { formatNumber } from '@/lib/format';

/** Links to each part of the long review page, with what's waiting, so staff can jump straight there. */
export function ReviewContents({ vehicle }: { vehicle: HostVehicle }) {
  const photos = vehicle.photos.filter((photo) => photo.status === 'PENDING').length;
  const documents = vehicle.documents.filter((document) => document.status === 'PENDING').length;
  const checks = vehicle.checklist.missing.length + vehicle.checklist.flags.length;

  const items: { id: string; label: string; note?: string }[] = [
    { id: 'checks', label: 'Checks', note: checks > 0 ? formatNumber(checks) : undefined },
    { id: 'photos', label: 'Photos', note: photos > 0 ? `${formatNumber(photos)} waiting` : undefined },
    {
      id: 'documents',
      label: 'Documents',
      note: documents > 0 ? `${formatNumber(documents)} waiting` : undefined,
    },
    { id: 'details', label: 'Vehicle details' },
    { id: 'compliance', label: 'Registration and WOF' },
    { id: 'pricing', label: 'Pricing and trip rules' },
    { id: 'delivery', label: 'Pick-up and delivery' },
    { id: 'calendar', label: 'Calendar override' },
  ];

  return (
    <Card asChild className="hidden p-3 lg:block">
      <nav aria-label="On this page">
        <p className="eyebrow px-3 pt-2 pb-1 text-muted">On this page</p>
        <ul className="grid">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="flex min-h-10 items-center justify-between gap-3 rounded-control px-3 text-sm text-ink transition-colors duration-120 hover:bg-ink/5"
              >
                {item.label}
                {item.note && <span className="text-xs font-medium text-primary">{item.note}</span>}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </Card>
  );
}
