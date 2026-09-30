import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CarFront, KeyRound } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ApiError } from '@/api/client';
import type { Booking, VehicleDetail } from '@/api/types';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { useSession } from '@/features/auth/use-session';
import { AccountSection } from '@/features/booking/account-section';
import {
  bookingQueryKey,
  bookingsQueryKey,
  readinessQueryKey,
  releaseHold,
  useBookingDetail,
  useCheckoutReadiness,
  useCreateBooking,
  useTripQuote,
} from '@/features/booking/booking-api';
import { formatNzd, formatWallClock } from '@/features/booking/booking-format';
import { CheckoutSection, type SectionState } from '@/features/booking/checkout-section';
import {
  addressLine,
  clearProgress,
  emptyAddress,
  loadProgress,
  needsDeliveryAddress,
  readChoices,
  resolveChoices,
  saveProgress,
  toDeliveryAddress,
  tripRequest,
  writeChoices,
  type AddressDraft,
  type CheckoutChoices,
} from '@/features/booking/checkout-state';
import { HoldNotice } from '@/features/booking/hold-countdown';
import { PayBooking, type PaidBooking } from '@/features/booking/pay-booking';
import { PriceBreakdown } from '@/features/booking/price-breakdown';
import {
  CheckoutSummary,
  MobileSummaryBar,
  type PricedTrip,
  type SummaryProps,
} from '@/features/booking/price-summary';
import { ProtectionSection } from '@/features/booking/protection-section';
import { HostLine, TripTerms } from '@/features/booking/trip-policies';
import { TripSection } from '@/features/booking/trip-section';
import { VerificationSection } from '@/features/booking/verification-section';
import { useDebouncedValue } from '@/features/search/use-debounced-value';
import { vehicleQueryOptions } from '@/features/vehicles/vehicle-api';

/*
 * Checkout (plan §12.6, spec §7): one page of numbered steps that open one at a time (the trip, protection,
 * the policies and price, logging in, verification and payment) with the price on screen throughout. The
 * dates are held (POST /bookings) only once a signed-in, verified Guest reaches payment (plan §8.2).
 */

const STEPS = ['trip', 'protection', 'details', 'account', 'verify', 'payment'] as const;
const TRIP = 0;
const PROTECTION = 1;
const DETAILS = 2;
const ACCOUNT = 3;
const VERIFY = 4;
const PAYMENT = 5;

/** How long the choices must settle before the price is asked for again, in ms. */
const QUOTE_DEBOUNCE = 300;

/** Errors from POST /bookings that are about the trip, so the Guest goes back to step 1. */
const TRIP_ERRORS = new Set([
  'DATES_UNAVAILABLE',
  'NOTICE_TOO_SHORT',
  'TRIP_TOO_SHORT',
  'TRIP_TOO_LONG',
  'DOCUMENTS_EXPIRE',
  'OPTION_NOT_FOUND',
  'ADDRESS_NEEDED',
  'OUTSIDE_DELIVERY_AREA',
  'PLAN_NOT_FOUND',
  'VALIDATION_ERROR',
]);

function CheckoutSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <span className="sr-only">Loading checkout</span>
      <div className="grid gap-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-80 rounded-card" />
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-18 rounded-card" />
        ))}
      </div>
      <Skeleton className="hidden h-96 rounded-card lg:block" />
    </div>
  );
}

function OwnCar({ vehicle }: { vehicle: VehicleDetail }) {
  return (
    <EmptyState
      className="mx-auto py-10"
      visual={
        <IconBadge size="xl">
          <KeyRound />
        </IconBadge>
      }
      title="This is your car"
      description="Hosts can’t book their own cars. To keep dates for yourself, block them on the car’s calendar."
      actions={
        <>
          <Button asChild>
            <Link to={`/host/vehicles/${vehicle.id}/calendar`}>Open the calendar</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to={`/cars/${vehicle.slug}`}>View the listing</Link>
          </Button>
        </>
      }
    />
  );
}

interface PaymentStepProps {
  booking: Booking | null;
  expired: boolean;
  error: string | null;
  onExpired: () => void;
  onRetry: () => void;
  onPaid: (booking: PaidBooking) => void;
  verificationInReview: boolean;
}

/** Step 6: the dates held for 30 minutes, then the Guest Agreement and the payment. */
function PaymentStep({
  booking,
  expired,
  error,
  onExpired,
  onRetry,
  onPaid,
  verificationInReview,
}: PaymentStepProps) {
  if (expired) {
    return (
      <Alert
        variant="danger"
        role="alert"
        title="Time’s up: the dates were released"
        action={<Button onClick={onRetry}>Hold the dates again</Button>}
      >
        We held these dates for 30 minutes. Nothing was charged. Hold them again to carry on, if they’re still
        free.
      </Alert>
    );
  }
  if (error) {
    return (
      <Alert
        variant="danger"
        role="alert"
        title="We couldn’t hold these dates"
        action={
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }
  if (!booking?.holdExpiresAt) {
    return (
      <div aria-busy="true" className="grid gap-3">
        <p className="text-sm text-muted">Holding these dates for you…</p>
        <Skeleton className="h-20 rounded-control" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }
  return (
    <div className="grid gap-6">
      <HoldNotice expiresAt={booking.holdExpiresAt} onExpired={onExpired} />
      <PayBooking
        booking={booking}
        onPaid={onPaid}
        onHoldExpired={onExpired}
        verificationInReview={verificationInReview}
      />
    </div>
  );
}

function Checkout({ vehicle }: { vehicle: VehicleDetail }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const reduceMotion = useReducedMotion();
  const [params, setParams] = useSearchParams();
  const session = useSession();
  const user = session.data ?? null;

  const choices = readChoices(params);
  const resolved = resolveChoices(choices, vehicle);
  const deliveryNeeded = needsDeliveryAddress(resolved, vehicle);

  const [saved] = useState(() => loadProgress(vehicle.slug));
  const [address, setAddress] = useState<AddressDraft>(saved?.address ?? emptyAddress);
  const { address: deliveryAddress, errors: addressErrors } = toDeliveryAddress(address);
  const request = tripRequest(resolved, deliveryNeeded ? deliveryAddress : undefined);
  const requestKey = request ? JSON.stringify(request) : '';
  const [resumed] = useState(() => (saved && saved.tripKey === requestKey ? saved : null));

  const [step, setStep] = useState(resumed?.step ?? TRIP);
  const [attempted, setAttempted] = useState(false);
  const [tripNotice, setTripNotice] = useState<string | null>(null);
  const [ownCar, setOwnCar] = useState(false);

  // The booking holding the dates for the trip on screen. Any change to the trip releases it.
  const [holdRef, setHoldRef] = useState<string | null>(resumed?.holdRef ?? null);
  const [holdExpired, setHoldExpired] = useState(false);
  const [holdError, setHoldError] = useState<string | null>(null);
  const holdQuery = useBookingDetail(holdRef ?? '', holdRef !== null);
  const holdBooking = holdQuery.data?.status === 'PAYMENT_PENDING' ? holdQuery.data : null;
  // A reload looks the hold up again; until then it still counts, so the quote isn't asked (see useTripQuote).
  const holding = holdBooking !== null || (holdRef !== null && holdQuery.isPending);

  const settledKey = useDebouncedValue(requestKey, QUOTE_DEBOUNCE);
  const quote = useTripQuote(vehicle.id, settledKey ? JSON.parse(settledKey) : null, holding);
  const current =
    Boolean(quote.data) && requestKey !== '' && settledKey === requestKey && !quote.isPlaceholderData;
  const problems = current && !holding ? (quote.data?.problems ?? []) : [];
  const fieldErrors = quote.error instanceof ApiError ? quote.error.fields : undefined;
  const datesComplete = Boolean(resolved.start && resolved.end);
  const tripBlocked =
    !datesComplete ||
    (deliveryNeeded && !deliveryAddress) ||
    problems.length > 0 ||
    (quote.isError && !holding);
  const tripReady = holding || (!tripBlocked && current);
  const pricing = datesComplete && !current && !quote.isError && !holding;

  const readiness = useCheckoutReadiness(resolved.end || undefined, user !== null);
  const readinessOk = readiness.data ? readiness.data.problems.length === 0 : null;
  // The identity check is with support: the Guest can still book, and the card is only authorised (plan §8.2).
  const verificationInReview = readiness.data?.identityStatus === 'PENDING';
  const isOwnCar = ownCar || (user !== null && vehicle.host.id === user.id);

  // The step on screen: never past what's still missing, and skipping what's already done.
  let active = step;
  if (active > TRIP && tripBlocked && !holding) active = TRIP;
  if (active > ACCOUNT && !user) active = ACCOUNT;
  if (active === ACCOUNT && user) active = VERIFY;
  if (active === VERIFY && readinessOk) active = PAYMENT;
  if (active === PAYMENT && readinessOk === false) active = VERIFY;

  // Remembers the address, how far the Guest got and the hold, for a reload or a detour to log in.
  useEffect(() => {
    saveProgress(vehicle.slug, { address, step, tripKey: requestKey, holdRef });
  }, [vehicle.slug, address, step, requestKey, holdRef]);

  // Opening a step moves to it and puts focus on its heading.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const id = `checkout-${STEPS[active]}`;
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    document.getElementById(`${id}-heading`)?.focus({ preventScroll: true });
  }, [active, reduceMotion]);

  // Reaching payment holds the dates: once per trip, and again only when asked.
  const create = useCreateBooking();
  const startedFor = useRef<string | null>(null);
  const wantsHold =
    active === PAYMENT &&
    request !== null &&
    !holding &&
    !holdExpired &&
    holdError === null &&
    !isOwnCar &&
    readinessOk === true;
  useEffect(() => {
    if (!wantsHold || !request || startedFor.current === requestKey) return;
    startedFor.current = requestKey;
    create.mutate(
      { vehicleId: vehicle.id, ...request },
      {
        onSuccess: (booking) => {
          queryClient.setQueryData(bookingQueryKey(booking.ref), booking);
          setHoldRef(booking.ref);
        },
        onError: (error) => {
          const code = error instanceof ApiError ? error.code : '';
          if (TRIP_ERRORS.has(code)) {
            setTripNotice(
              code === 'DATES_UNAVAILABLE'
                ? 'Someone has just booked some of these times. Choose other dates to carry on.'
                : error.message,
            );
            setStep(TRIP);
            void queryClient.invalidateQueries({ queryKey: ['vehicle', vehicle.id] });
          } else if (code === 'VERIFICATION_REQUIRED') {
            startedFor.current = null;
            void queryClient.invalidateQueries({ queryKey: readinessQueryKey });
          } else if (code === 'OWN_CAR') {
            setOwnCar(true);
          } else {
            setHoldError(
              code === 'NOT_BOOKABLE'
                ? 'This car can’t be booked right now. Please choose another.'
                : error.message,
            );
          }
        },
      },
    );
    // The mutation object changes on every render; each trip is keyed by requestKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsHold, requestKey]);

  /** Lets go of held dates the Guest no longer wants, so the new choices are priced and held afresh. */
  const releaseCurrentHold = () => {
    startedFor.current = null;
    setHoldExpired(false);
    setHoldError(null);
    if (!holdRef) return;
    const ref = holdRef;
    setHoldRef(null);
    void releaseHold(ref)
      .then((released) => queryClient.setQueryData(bookingQueryKey(released.ref), released))
      .catch(() => undefined)
      .finally(() => void queryClient.invalidateQueries({ queryKey: ['vehicle', vehicle.id] }));
  };

  const holdAgain = () => {
    startedFor.current = null;
    setHoldRef(null);
    setHoldExpired(false);
    setHoldError(null);
    create.reset();
  };

  const updateChoices = (patch: Partial<CheckoutChoices>) => {
    const next = writeChoices({ ...choices, ...patch }, vehicle);
    if (next.toString() === writeChoices(choices, vehicle).toString()) return;
    setTripNotice(null);
    releaseCurrentHold();
    setParams(next, { replace: true, preventScrollReset: true });
  };

  const updateAddress = (draft: AddressDraft) => {
    setTripNotice(null);
    releaseCurrentHold();
    setAddress(draft);
  };

  const continueFromTrip = () => {
    setAttempted(true);
    if (!tripReady) return;
    setTripNotice(null);
    setStep(PROTECTION);
  };

  const finished = (booking: PaidBooking) => {
    clearProgress(vehicle.slug);
    void queryClient.invalidateQueries({ queryKey: bookingsQueryKey });
    if (booking.status === 'CONFIRMED') {
      toast('You’re booked', { description: `Your trip in the ${vehicle.title} is confirmed.` });
    } else if (booking.verificationReview === 'PENDING') {
      toast('Your booking is held', {
        description: 'We’re finishing your identity check. You’re only charged once it’s approved.',
      });
    } else if (booking.status === 'PENDING') {
      toast('Request sent', {
        description: `${vehicle.host.firstName} has 24 hours to answer. You’re only charged if they accept.`,
      });
    } else {
      toast('Payment received', { description: 'We’re confirming your booking.', tone: 'neutral' });
    }
    navigate(`/trips/${booking.ref}`, { replace: true, viewTransition: true });
  };

  if (isOwnCar) return <OwnCar vehicle={vehicle} />;

  const state = (index: number): SectionState =>
    index === active ? 'current' : index < active ? 'done' : 'upcoming';
  const plan = vehicle.protectionPlans.find((item) => item.code === resolved.planCode);
  const pickup = vehicle.deliveryOptions.find((option) => option.id === resolved.pickupOptionId);
  const priced: PricedTrip | undefined = holdBooking
    ? {
        lineItems: holdBooking.lineItems,
        price: holdBooking.price,
        instantBook: holdBooking.instantBook,
        start: holdBooking.start,
        cancellationTier: holdBooking.cancellationTier ?? undefined,
      }
    : quote.data;
  const summary: SummaryProps = {
    vehicle,
    resolved,
    priced,
    current: current || holdBooking !== null,
    pricing,
    verificationInReview,
  };
  const instant = priced?.instantBook ?? vehicle.rules.instantBook;
  const back = new URLSearchParams();
  if (resolved.start && resolved.end) {
    back.set('start', resolved.start);
    back.set('end', resolved.end);
  }

  return (
    <>
      <Link
        to={`/cars/${vehicle.slug}${back.size > 0 ? `?${back.toString()}` : ''}`}
        className="link-underline inline-flex items-center gap-1.5 text-sm font-medium text-primary"
      >
        <ArrowLeft aria-hidden="true" className="nudge-left size-4" />
        Back to the listing
      </Link>
      <div className="mt-4">
        <p className="eyebrow text-primary">Checkout</p>
        <h1 className="headline mt-2 text-title-3 font-medium text-balance">
          {instant ? 'Confirm and pay' : 'Request to book'}
        </h1>
        <p className="mt-2 text-muted">
          The {vehicle.title}, hosted by {vehicle.host.firstName}.
          {!instant && ' Your host answers within 24 hours, and you’re only charged if they accept.'}
        </p>
      </div>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="grid min-w-0 gap-4">
          <CheckoutSection
            id="checkout-trip"
            number={1}
            title="Your trip"
            state={state(TRIP)}
            onEdit={() => setStep(TRIP)}
            summary={
              <>
                {formatWallClock(resolved.start)} – {formatWallClock(resolved.end)} (NZ time)
                {pickup && <span className="block">{pickup.label}</span>}
                {deliveryNeeded && deliveryAddress && (
                  <span className="block">{addressLine(deliveryAddress)}</span>
                )}
              </>
            }
          >
            <TripSection
              vehicle={vehicle}
              resolved={resolved}
              onChange={updateChoices}
              deliveryNeeded={deliveryNeeded}
              address={address}
              onAddressChange={updateAddress}
              addressErrors={addressErrors}
              fieldErrors={fieldErrors}
              showErrors={attempted}
              problems={problems}
              notice={tripNotice ?? (quote.isError && !fieldErrors ? quote.error.message : null)}
              pricing={pricing}
              onContinue={continueFromTrip}
            />
          </CheckoutSection>

          <CheckoutSection
            id="checkout-protection"
            number={2}
            title="Protection"
            state={state(PROTECTION)}
            onEdit={() => setStep(PROTECTION)}
            summary={plan && `${plan.name}, with a ${formatNzd(plan.excessCents)} excess`}
          >
            <ProtectionSection
              plans={vehicle.protectionPlans}
              value={resolved.planCode}
              onChange={(code) => updateChoices({ plan: code })}
              onContinue={() => setStep(DETAILS)}
            />
          </CheckoutSection>

          <CheckoutSection
            id="checkout-details"
            number={3}
            title="Trip details and price"
            state={state(DETAILS)}
            onEdit={() => setStep(DETAILS)}
            summary="Policies and price reviewed"
          >
            <div className="grid gap-6">
              <HostLine host={vehicle.host} />
              <TripTerms
                vehicle={vehicle}
                start={priced?.start}
                tier={priced?.cancellationTier ?? vehicle.cancellationTier}
              />
              {/* On desktop the summary beside the steps shows it. */}
              {priced && (
                <div className="rounded-card border border-line p-4 lg:hidden">
                  <PriceBreakdown lineItems={priced.lineItems} price={priced.price} />
                </div>
              )}
              <div>
                <Button size="lg" onClick={() => setStep(ACCOUNT)} className="max-sm:w-full">
                  {user ? 'Continue' : 'Continue to log in'}
                </Button>
              </div>
            </div>
          </CheckoutSection>

          <CheckoutSection
            id="checkout-account"
            number={4}
            title={user ? 'Your account' : 'Log in or sign up'}
            state={user ? (active > ACCOUNT ? 'done' : 'upcoming') : state(ACCOUNT)}
            summary={user && `Logged in as ${user.firstName} (${user.email})`}
          >
            {session.isPending ? (
              <Skeleton className="h-40 rounded-card" />
            ) : (
              <AccountSection onSignedIn={() => setStep(VERIFY)} />
            )}
          </CheckoutSection>

          <CheckoutSection
            id="checkout-verify"
            number={5}
            title="Mobile and driver licence"
            state={state(VERIFY)}
            summary="Your mobile and licence details are ready"
            upcomingNote={user ? undefined : 'Log in first'}
          >
            {user && <VerificationSection user={user} readiness={readiness} />}
          </CheckoutSection>

          <CheckoutSection
            id="checkout-payment"
            number={6}
            title="Payment"
            state={state(PAYMENT)}
            upcomingNote={user ? 'Verify your mobile and licence first' : 'Log in first'}
          >
            <PaymentStep
              booking={holdBooking}
              expired={holdExpired}
              error={holdError}
              onExpired={() => setHoldExpired(true)}
              onRetry={holdAgain}
              onPaid={finished}
              verificationInReview={verificationInReview}
            />
          </CheckoutSection>

          <MobileSummaryBar {...summary} />
        </div>

        <aside aria-label="Your trip and price" className="sticky top-24 hidden lg:block">
          <CheckoutSummary {...summary} />
        </aside>
      </div>
    </>
  );
}

/**
 * The booking flow (plan §9, Days 11–13) at /book/:slug?start=…&end=…&pickup=…&return=…&plan=…, the link the
 * listing's Book button makes.
 */
export function CheckoutPage() {
  const { slug = '' } = useParams();
  const vehicle = useQuery(vehicleQueryOptions(slug));

  let body;
  if (vehicle.isPending) {
    body = <CheckoutSkeleton />;
  } else if (vehicle.isError) {
    const missing = vehicle.error instanceof ApiError && vehicle.error.status === 404;
    body = (
      <EmptyState
        className="mx-auto py-10"
        visual={
          <IconBadge size="xl">
            <CarFront />
          </IconBadge>
        }
        title={missing ? 'This car isn’t available' : 'We couldn’t load this car'}
        description={
          missing
            ? 'It may have been taken off Rento Vroom. There are plenty more to choose from.'
            : vehicle.error.message
        }
        actions={
          missing ? (
            <Button asChild>
              <Link to="/cars">Browse cars</Link>
            </Button>
          ) : (
            <Button onClick={() => void vehicle.refetch()}>Try again</Button>
          )
        }
      />
    );
  } else {
    body = <Checkout key={vehicle.data.id} vehicle={vehicle.data} />;
  }

  return (
    <Container className="py-8 sm:py-12">
      <PageMeta title={vehicle.data ? `Book the ${vehicle.data.title}` : 'Checkout'} noindex />
      {body}
    </Container>
  );
}
