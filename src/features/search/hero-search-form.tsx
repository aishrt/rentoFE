import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { SearchForm } from './search-form';
import type { SearchValues } from './search-validation';

interface HeroSearchFormProps {
  /** Starting values, e.g. a destination page's city. */
  initial?: Partial<SearchValues>;
  className?: string;
}

/** The homepage's search panel (spec §4): "Find your car", on a raised card over the hero. */
export function HeroSearchForm({ initial, className }: HeroSearchFormProps) {
  return (
    <Card asChild variant="raised" className={cn('p-5 text-ink sm:p-6', className)}>
      <SearchForm
        initial={initial}
        aria-labelledby="search-heading"
        heading={
          <h2 id="search-heading" className="headline text-2xl font-medium">
            Find your car
          </h2>
        }
      />
    </Card>
  );
}
