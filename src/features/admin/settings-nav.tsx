import { ChevronDown, CircleCheck, CircleDashed, KeyRound, SlidersHorizontal } from 'lucide-react';
import { useId, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { DecisionKey } from '@/api/types';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { usePlatformSettings } from './platform-settings/settings-api';
import { SETTINGS_GROUPS } from './platform-settings/settings-groups';
import { settingsSearch, type SettingsView } from './settings-view';

const itemClasses =
  'relative flex min-h-11 w-full items-center gap-3 rounded-control px-3 py-2 text-left text-sm leading-snug font-medium transition-colors duration-120';
const idleClasses = 'text-muted hover:bg-ink/5 hover:text-ink';
// The bar grows in from its centre, as in the staff portal's sidebar.
const activeClasses =
  'bg-primary/8 text-primary before:absolute before:inset-y-2.5 before:left-0 before:w-0.5 before:animate-bar-in before:rounded-full before:bg-primary';

function viewLabel(view: SettingsView): string {
  if (view === 'account') return 'Your sign-in';
  if (view === 'overview') return 'Platform settings';
  return SETTINGS_GROUPS.find((group) => group.key === view)?.label ?? 'Platform settings';
}

interface NavItemProps {
  view: SettingsView;
  current: SettingsView;
  onNavigate: () => void;
  icon?: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
}

function NavItem({ view, current, onNavigate, icon, trailing, children }: NavItemProps) {
  const active = view === current;
  return (
    <li>
      <Link
        to={{ search: settingsSearch(view) }}
        replace
        aria-current={active ? 'page' : undefined}
        onClick={onNavigate}
        className={cn(itemClasses, active ? activeClasses : idleClasses)}
      >
        {icon}
        <span className="min-w-0 flex-1">{children}</span>
        {trailing}
      </Link>
    </li>
  );
}

/** Where a group's decision stands, and whether it has changes not saved yet. */
function GroupStatus({ confirmed, unsaved }: { confirmed?: boolean; unsaved: boolean }) {
  return (
    <>
      {unsaved && (
        <span title="Unsaved changes" className="flex size-4 shrink-0 items-center justify-center">
          <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
          <span className="sr-only">, unsaved changes</span>
        </span>
      )}
      {confirmed !== undefined && (
        <span title={confirmed ? 'Confirmed by the client' : 'Placeholder: waiting for the client'}>
          {confirmed ? (
            <CircleCheck aria-hidden="true" className="size-4 text-primary" />
          ) : (
            <CircleDashed aria-hidden="true" className="size-4 text-muted" />
          )}
          <span className="sr-only">{confirmed ? ', confirmed' : ', placeholder'}</span>
        </span>
      )}
    </>
  );
}

interface SettingsNavProps {
  view: SettingsView;
  unsaved: ReadonlySet<DecisionKey>;
}

/**
 * The admin's settings menu: their own sign-in, then Platform settings, which opens and closes on the
 * groups of the client's decisions. Beside the settings on wide screens; a menu above them on smaller ones.
 */
export function SettingsNav({ view, unsaved }: SettingsNavProps) {
  const platform = usePlatformSettings();
  const decisions = platform.data?.settings.decisions;
  const pending = decisions
    ? SETTINGS_GROUPS.filter(({ key }) => decisions[key].status === 'PENDING').length
    : 0;
  const [platformOpen, setPlatformOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const groupId = useId();

  // On smaller screens, choosing a page closes the menu and leaves focus on its button.
  const onNavigate = () => {
    if (!menuOpen) return;
    setMenuOpen(false);
    menuButton.current?.focus();
  };

  return (
    <div className="xl:sticky xl:top-24">
      <button
        ref={menuButton}
        type="button"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        onClick={() => setMenuOpen((open) => !open)}
        className="flex min-h-14 w-full items-center gap-3 rounded-card border border-line/80 bg-surface px-4 text-left shadow-card transition-[scale] duration-120 ease-out active:scale-98 xl:hidden"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-muted">Settings menu</span>{' '}
          <span className="block truncate text-sm font-medium text-ink">{viewLabel(view)}</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'size-5 text-muted transition-transform duration-200 ease-out',
            menuOpen && 'rotate-180',
          )}
        />
      </button>

      <Card
        id={menuId}
        className={cn(
          'scrollbar-subtle mt-2 animate-fade-in overflow-y-auto p-2 xl:mt-0 xl:block xl:max-h-[calc(100dvh-7rem)]',
          !menuOpen && 'hidden',
        )}
      >
        <nav aria-label="Settings">
          <ul className="grid gap-0.5">
            <NavItem
              view="account"
              current={view}
              onNavigate={onNavigate}
              icon={<KeyRound aria-hidden="true" className="size-4.5 shrink-0" />}
            >
              Your sign-in
            </NavItem>

            <li>
              <button
                type="button"
                aria-expanded={platformOpen}
                aria-controls={groupId}
                onClick={() => setPlatformOpen((open) => !open)}
                className={cn(
                  itemClasses,
                  // While it's closed on one of its pages, it shows where the admin is.
                  view !== 'account' && !platformOpen ? 'text-primary hover:bg-ink/5' : idleClasses,
                )}
              >
                <SlidersHorizontal aria-hidden="true" className="size-4.5 shrink-0" />
                <span className="min-w-0 flex-1">Platform settings</span>
                {pending > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary tabular-nums">
                    {/* The spaces sit outside the hidden text, so screen readers hear them. */}
                    <span className="sr-only">,</span> {pending}{' '}
                    <span className="sr-only">waiting for the client</span>
                  </span>
                )}
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    'size-4 shrink-0 transition-transform duration-200 ease-out',
                    platformOpen && 'rotate-180',
                  )}
                />
              </button>

              <ul
                id={groupId}
                hidden={!platformOpen}
                className="mt-0.5 ml-5 grid animate-fade-in gap-0.5 border-l border-line pl-2"
              >
                <NavItem view="overview" current={view} onNavigate={onNavigate}>
                  Overview
                </NavItem>
                {SETTINGS_GROUPS.map(({ key, label }) => (
                  <NavItem
                    key={key}
                    view={key}
                    current={view}
                    onNavigate={onNavigate}
                    trailing={
                      <GroupStatus
                        confirmed={decisions ? decisions[key].status === 'CONFIRMED' : undefined}
                        unsaved={unsaved.has(key)}
                      />
                    }
                  >
                    {label}
                  </NavItem>
                ))}
              </ul>
            </li>
          </ul>
        </nav>
      </Card>
    </div>
  );
}
