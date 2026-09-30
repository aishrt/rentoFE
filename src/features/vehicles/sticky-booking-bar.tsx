import { m } from 'motion/react';
import { Link } from 'react-router';
import type { VehicleDetail } from '@/api/types';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { PriceWithEstimate } from '@/features/currency/price-with-estimate';
import { motion } from '@/styles/tokens';
import type { Booking } from './use-booking';

interface StickyBookingBarProps {
  vehicle: VehicleDetail;
  booking: Booking;
  /** Shown once the gallery has scrolled away. */
  visible: boolean;
  /** Opens the booking sheet, to choose dates or review the trip. */
  onOpen: () => void;
}

/**
 * The sticky booking bar on phones and tablets (spec §20, plan §12.6): "$89/day · $267 total [Book]". It
 * slides up once the gallery has scrolled away (plan §12.4). Book goes straight to checkout when the trip
 * is ready; otherwise the button opens the booking sheet to choose dates.
 */
export function StickyBookingBar({ vehicle, booking, visible, onOpen }: StickyBookingBarProps) {
  const total = booking.current ? booking.quote.data?.price.totalCents : undefined;

  return (
    <m.div
      className="glass fixed inset-x-0 bottom-0 z-30 border-t border-line/70 lg:hidden"
      initial={false}
      animate={{ y: visible ? 0 : '110%' }}
      transition={{ duration: motion.duration.medium, ease: motion.ease.out }}
      inert={!visible}
    >
      <Container className="flex items-center justify-between gap-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <p className="min-w-0 text-sm tabular-nums">
          <span className="text-base font-semibold text-ink">
            <PriceWithEstimate cents={vehicle.pricing.dailyCents} />
          </span>
          <span className="text-muted">/day</span>
          {total !== undefined ? (
            <>
              <span className="text-muted"> · </span>
              <span className="text-base font-semibold text-ink">
                <PriceWithEstimate cents={total} />
              </span>
              <span className="text-muted"> total</span>
            </>
          ) : (
            <span className="block text-xs text-muted">Add your dates for the total</span>
          )}
        </p>
        {booking.canBook ? (
          <Button asChild className="shrink-0">
            <Link to={booking.checkoutUrl} viewTransition>
              {booking.bookLabel}
            </Link>
          </Button>
        ) : (
          <Button className="shrink-0" onClick={onOpen}>
            {booking.hasDates ? 'Review trip' : 'Choose dates'}
          </Button>
        )}
      </Container>
    </m.div>
  );
}
