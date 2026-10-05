import { Plus } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';

export interface AccordionItem {
  id: string;
  title: ReactNode;
  content: ReactNode;
}

interface AccordionProps {
  items: readonly AccordionItem[];
  /** The level of the heading around each question, one below the section's heading. */
  headingLevel?: 2 | 3 | 4;
  className?: string;
}

function AccordionRow({ item, headingLevel }: { item: AccordionItem; headingLevel: 2 | 3 | 4 }) {
  const [open, setOpen] = useState(false);
  const baseId = useId();
  const buttonId = `${baseId}-button`;
  const panelId = `${baseId}-panel`;
  const Heading = `h${headingLevel}` as 'h3';

  return (
    <div>
      <Heading className="text-lg font-medium">
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="group flex min-h-16 w-full items-center justify-between gap-6 py-5 text-left transition-colors duration-120 hover:text-primary"
        >
          {item.title}
          <span
            aria-hidden="true"
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-full border border-line transition-[rotate,background-color,border-color,color] duration-320 ease-out',
              open ? 'rotate-45 border-primary bg-primary text-white' : 'group-hover:border-primary/40',
            )}
          >
            <Plus className="size-4" />
          </span>
        </button>
      </Heading>
      {/* Kept in the page while closed (hidden), so crawlers and find-in-page tools still reach the answer. */}
      <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!open}>
        <div className="max-w-2xl animate-fade-up pb-6 leading-relaxed text-muted">{item.content}</div>
      </div>
    </div>
  );
}

/** Holds a list of questions' place while they load. */
export function AccordionSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div aria-busy="true" className={cn('divide-y divide-line border-y border-line', className)}>
      <span className="sr-only">Loading questions</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex min-h-16 items-center justify-between gap-6 py-5">
          <Skeleton className={cn('h-5', index % 2 ? 'w-2/3' : 'w-1/2')} />
          <Skeleton className="size-9 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/**
 * Questions that open to show their answers (the WAI-ARIA accordion pattern): each question is a button in a
 * heading, with `aria-expanded`, controlling a labelled region. Any number can be open at once.
 */
export function Accordion({ items, headingLevel = 3, className }: AccordionProps) {
  return (
    <div className={cn('divide-y divide-line border-y border-line', className)}>
      {items.map((item) => (
        <AccordionRow key={item.id} item={item} headingLevel={headingLevel} />
      ))}
    </div>
  );
}
