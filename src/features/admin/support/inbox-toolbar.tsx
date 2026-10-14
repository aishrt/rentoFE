import { Search, Tag } from 'lucide-react';
import { useEffect, useEffectEvent, useState, type FormEvent } from 'react';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { TICKET_CATEGORY } from '@/features/admin/ops/admin-labels';
import { TICKET_CATEGORIES, type InboxFilters } from './support-api';

/** How long typing pauses before the list follows, in ms. Enter searches straight away. */
const SEARCH_DELAY = 400;

const CATEGORY_OPTIONS = [
  { value: '', label: 'All categories' },
  ...TICKET_CATEGORIES.map((category) => ({ value: category, label: TICKET_CATEGORY[category] })),
];

function InboxSearch({ value, onSearch }: { value: string; onSearch: (q: string) => void }) {
  const [text, setText] = useState(value);
  // The search last sent to the address. When the address changes elsewhere (Back, a link), the box follows.
  const [sent, setSent] = useState(value);
  if (value !== sent) {
    setSent(value);
    setText(value);
  }

  const send = (q: string) => {
    setSent(q);
    if (q !== value) onSearch(q);
  };
  const sendAfterPause = useEffectEvent(send);

  useEffect(() => {
    const q = text.trim();
    if (q === sent) return;
    const timer = setTimeout(() => sendAfterPause(q), SEARCH_DELAY);
    return () => clearTimeout(timer);
  }, [text, sent]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    send(text.trim());
  };

  return (
    <form role="search" onSubmit={submit} className="min-w-0 flex-1 basis-72">
      <Input
        type="search"
        aria-label="Search tickets"
        placeholder="Ticket ref, subject, name or email"
        enterKeyHint="search"
        maxLength={100}
        value={text}
        onChange={(event) => setText(event.target.value)}
        leadingIcon={<Search />}
      />
    </form>
  );
}

interface InboxToolbarProps {
  filters: InboxFilters;
  onChange: (changes: Partial<InboxFilters>) => void;
}

/** Search, a category and "Assigned to me": each narrows the tab's tickets. */
export function InboxToolbar({ filters, onChange }: InboxToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <InboxSearch value={filters.q ?? ''} onSearch={(q) => onChange({ q: q || undefined })} />
      <Field label="Category" hideLabel className="w-full sm:w-56">
        <Select
          value={filters.category ?? ''}
          onChange={(value) =>
            onChange({ category: TICKET_CATEGORIES.find((category) => category === value) })
          }
          options={CATEGORY_OPTIONS}
          icon={<Tag />}
          listLabel="Categories"
        />
      </Field>
      <Switch
        checked={filters.mine}
        onCheckedChange={(mine) => onChange({ mine })}
        label="Assigned to me"
        className="shrink-0"
      />
    </div>
  );
}
