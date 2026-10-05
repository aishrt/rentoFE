import { AnimatePresence, m } from 'motion/react';
import type { VehicleCard as VehicleCardData } from '@/api/types';
import { VehicleCard, VehicleCardSkeleton } from '@/features/vehicles/vehicle-card';
import { cn } from '@/lib/cn';
import { motion } from '@/styles/tokens';

const gridClasses = 'grid gap-5 sm:grid-cols-2 xl:grid-cols-3';

interface ResultsGridProps {
  vehicles: readonly VehicleCardData[];
  /** Carried to each listing, e.g. the search's dates. */
  listingSearch?: string;
  /** New results are loading: the current ones dim until they arrive. */
  busy?: boolean;
  className?: string;
}

/**
 * The results, one column on phones, two on tablets and three beside the filters on desktop (plan §12.6).
 * When the filters change, cars that stay glide to their new places, cars that go fade out and new ones fade
 * in (plan §12.4: Motion layout animations, transform and opacity only; they need `MaxMotion`).
 */
export function ResultsGrid({ vehicles, listingSearch, busy = false, className }: ResultsGridProps) {
  return (
    <ul
      aria-busy={busy || undefined}
      className={cn(gridClasses, 'relative transition-opacity duration-200', busy && 'opacity-60', className)}
    >
      <AnimatePresence mode="popLayout">
        {vehicles.map((vehicle, index) => (
          <m.li
            key={vehicle.id}
            layout="position"
            className="min-w-0"
            initial={{ opacity: 0, y: motion.travel.sm }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{
              layout: motion.spring.gentle,
              default: {
                duration: motion.duration.medium,
                ease: motion.ease.out,
                // Only the first few wait their turn, so a long list never feels slow.
                delay: Math.min(index % 24, motion.staggerLimit - 1) * motion.stagger,
              },
            }}
          >
            <VehicleCard
              vehicle={vehicle}
              listingSearch={listingSearch}
              priority={index < 3}
              className="h-full"
            />
          </m.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

/** Placeholder cards in the same grid, while the first results load. */
export function ResultsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading cars" className={gridClasses}>
      {Array.from({ length: count }, (_, index) => (
        <VehicleCardSkeleton key={index} />
      ))}
    </div>
  );
}
