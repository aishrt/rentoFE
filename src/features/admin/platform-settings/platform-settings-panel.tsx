import type { DecisionKey } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PlatformOverview } from './platform-overview';
import { SETTINGS_GROUPS } from './settings-groups';
import { usePlatformSettings } from './settings-api';

interface PlatformSettingsPanelProps {
  /** The overview, or one group's settings. */
  view: 'overview' | DecisionKey;
  unsaved: ReadonlySet<DecisionKey>;
}

/**
 * The admin's Platform settings (plan §3 `platformSettings`, §16): the values that wait for the client's
 * decisions, which checkout, listings and the public pages read from the database. One group shows at a
 * time; the others stay mounted but hidden, so changes not saved yet aren't lost on the way to another
 * group. Admin only; the API refuses everyone else.
 */
export function PlatformSettingsPanel({ view, unsaved }: PlatformSettingsPanelProps) {
  const query = usePlatformSettings();

  if (query.isPending) {
    return (
      <div aria-busy="true" className="grid gap-6">
        <span className="sr-only">Loading the platform settings</span>
        <Skeleton className="h-40 rounded-card" />
        <Skeleton className="h-96 rounded-card" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <Alert
        variant="danger"
        role="alert"
        title="We couldn't load the platform settings"
        action={
          <Button variant="secondary" size="sm" onClick={() => query.refetch()} loading={query.isFetching}>
            Try again
          </Button>
        }
      >
        {query.error.message}
      </Alert>
    );
  }

  // The fade replays each time a hidden panel is shown again.
  return (
    <>
      <div hidden={view !== 'overview'} className="animate-fade-up">
        <PlatformOverview {...query.data} unsaved={unsaved} />
      </div>
      {SETTINGS_GROUPS.map(({ key, Section }) => (
        <div key={key} hidden={view !== key} className="animate-fade-up">
          <Section settings={query.data.settings} />
        </div>
      ))}
    </>
  );
}
