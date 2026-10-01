import type { DecisionKey } from '@/api/types';
import { isSettingsGroup } from './platform-settings/settings-groups';

/** What the Settings page shows: the staff member's own sign-in, the platform overview, or one group. */
export type SettingsView = 'account' | 'overview' | DecisionKey;

/**
 * The view is in the address, so a link can open it: `?tab=platform` for the overview, and
 * `?tab=platform&section=fees` for one group. Anything else is the sign-in settings.
 */
export function readSettingsView(params: URLSearchParams): SettingsView {
  if (params.get('tab') !== 'platform') return 'account';
  const section = params.get('section');
  return isSettingsGroup(section) ? section : 'overview';
}

export function settingsSearch(view: SettingsView): string {
  if (view === 'account') return '';
  if (view === 'overview') return '?tab=platform';
  return `?tab=platform&section=${view}`;
}
