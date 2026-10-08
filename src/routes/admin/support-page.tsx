import { LifeBuoy, RefreshCw, SearchX } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { IconButton } from '@/components/ui/icon-button';
import { SegmentedTabs, type TabOption } from '@/components/ui/segmented-tabs';
import { tabId, tabPanelId } from '@/components/ui/tab-ids';
import { AdminPageHeader } from '@/features/admin/ops/admin-page-header';
import { Pagination } from '@/features/admin/ops/admin-table';
import { EmptyList, ListSkeleton, LoadError } from '@/features/admin/ops/query-feedback';
import { inboxFiltersFrom, inboxSearchParams, isFiltered } from '@/features/admin/support/inbox-filters';
import { InboxToolbar } from '@/features/admin/support/inbox-toolbar';
import {
  INBOX_PAGE_SIZE,
  TICKET_STATUSES,
  useInbox,
  type InboxFilters,
  type TicketStatus,
} from '@/features/admin/support/support-api';
import { TicketTable } from '@/features/admin/support/ticket-table';

const TAB_PREFIX = 'support-inbox';

type Tab = 'TO_ANSWER' | TicketStatus;

const TABS = [
  { value: 'TO_ANSWER', label: 'To answer' },
  { value: 'OPEN', label: 'Open' },
  { value: 'PENDING', label: 'Waiting on them' },
  { value: 'RESOLVED', label: 'Resolved' },
] as const satisfies readonly TabOption<Tab>[];

const EMPTY: Record<Tab, { title: string; description: string }> = {
  TO_ANSWER: {
    title: 'Nothing to answer',
    description:
      'New requests and replies from Guests, Hosts and visitors show here, the longest waiting first.',
  },
  OPEN: { title: 'No open tickets', description: 'Tickets waiting for a reply from the team show here.' },
  PENDING: {
    title: 'Nobody to wait on',
    description: 'Tickets you’ve answered show here until the person replies or the ticket is resolved.',
  },
  RESOLVED: { title: 'No resolved tickets', description: 'Resolved tickets show here, the latest first.' },
};

/**
 * The support inbox (plan §12.6): requests from the Contact form, a booking's Contact support link and
 * privacy requests. Tabs, search, category and "Assigned to me" are all in the address.
 */
export function AdminSupportPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = inboxFiltersFrom(searchParams);
  const tab: Tab = filters.status ?? 'TO_ANSWER';
  const inbox = useInbox(filters);

  // Each change starts again from the first page. The update reads the address as it is now, so a search
  // sent after a pause in typing keeps a filter chosen meanwhile.
  const change = (changes: Partial<InboxFilters>) =>
    setSearchParams((previous) => inboxSearchParams({ ...inboxFiltersFrom(previous), page: 1, ...changes }), {
      replace: true,
    });
  const changeTab = (next: Tab) => change({ status: TICKET_STATUSES.find((status) => status === next) });
  const changePage = (page: number) => {
    setSearchParams((previous) => inboxSearchParams({ ...inboxFiltersFrom(previous), page }));
    window.scrollTo({ top: 0 });
  };

  const data = inbox.data;
  // While another tab or page loads, the last table stays, faded; an empty one gives way to grey rows.
  const loading = inbox.isPending || (inbox.isPlaceholderData && data?.tickets.length === 0);
  const empty = isFiltered(filters)
    ? {
        title: 'No tickets match',
        description: 'Try another search, or clear the category and “Assigned to me”.',
      }
    : EMPTY[tab];

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        eyebrow="Operations"
        title="Support"
        description="Requests from Guests, Hosts and visitors. Replies are emailed to them; internal notes stay with the team."
        actions={
          <IconButton label="Refresh the inbox" onClick={() => inbox.refetch()} disabled={inbox.isFetching}>
            <RefreshCw aria-hidden="true" className={inbox.isFetching ? 'animate-spin' : undefined} />
          </IconButton>
        }
      />

      <div className="mt-8 grid gap-6">
        {/*
          Four tabs are wider than a phone: they scroll sideways there. The padding leaves room for the tabs'
          shadow, which the scroller would clip, and the negative margins take that room back.
        */}
        <div className="scrollbar-subtle relative -mx-4 -mt-2 -mb-6 overflow-x-auto px-4 pt-2 pb-6">
          <SegmentedTabs
            idPrefix={TAB_PREFIX}
            label="Ticket status"
            options={TABS}
            value={tab}
            onChange={changeTab}
            className="min-w-max sm:w-fit"
          />
        </div>
        <InboxToolbar filters={filters} onChange={change} />
      </div>

      <div
        role="tabpanel"
        id={tabPanelId(TAB_PREFIX, tab)}
        aria-labelledby={tabId(TAB_PREFIX, tab)}
        className="mt-6"
      >
        {loading && <ListSkeleton label="Loading tickets" rows={6} height="h-16" />}

        {inbox.isError && !data && (
          <LoadError
            title="We couldn’t load the inbox"
            error={inbox.error}
            onRetry={() => inbox.refetch()}
            retrying={inbox.isFetching}
          />
        )}

        {data && data.tickets.length === 0 && !inbox.isPlaceholderData && (
          <EmptyList
            title={empty.title}
            description={empty.description}
            icon={isFiltered(filters) ? <SearchX /> : <LifeBuoy />}
          />
        )}

        {data && data.tickets.length > 0 && (
          <>
            <TicketTable tickets={data.tickets} stale={inbox.isPlaceholderData} />
            <Pagination
              page={data.page}
              total={data.total}
              pageSize={INBOX_PAGE_SIZE}
              onChange={changePage}
              noun="tickets"
            />
          </>
        )}
      </div>
    </div>
  );
}
