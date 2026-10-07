import { Elements } from '@stripe/react-stripe-js';
import { useQueryClient } from '@tanstack/react-query';
import { CreditCard, Plus, ReceiptText, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { ApiError } from '@/api/client';
import type { PaymentHistoryItem, SavedCard } from '@/api/types';
import { PageBackdrop } from '@/components/brand/page-backdrop';
import { DotGrid } from '@/components/brand/patterns/dot-grid';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { IconBadge } from '@/components/ui/icon-badge';
import { IconButton } from '@/components/ui/icon-button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { AccountPageHeader, AccountShell } from '@/features/account/account-shell';
import {
  savedCardsQueryKey,
  usePaymentHistory,
  useRemoveCard,
  useSavedCards,
  useStartCardSetup,
} from '@/features/account/dashboard-api';
import { SettingsSection } from '@/features/account/settings-section';
import { RequireSignedIn } from '@/features/auth/require-signed-in';
import { formatNzNumericDate, formatNzd } from '@/features/booking/booking-format';
import { CardSetupForm } from '@/features/payments/card-setup-form';
import { getStripe, stripeAppearance, stripeKeyMode } from '@/features/payments/stripe';

const BRANDS: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  diners: 'Diners Club',
  jcb: 'JCB',
  unionpay: 'UnionPay',
};

const WALLETS: Record<NonNullable<SavedCard['wallet']>, string> = {
  apple_pay: 'Apple Pay',
  google_pay: 'Google Pay',
};

const cardName = (card: Pick<SavedCard, 'brand' | 'last4'>) =>
  `${BRANDS[card.brand] ?? card.brand.charAt(0).toUpperCase() + card.brand.slice(1)} ending ${card.last4}`;

const twoDigits = (value: number) => String(value).padStart(2, '0');

function CardRow({ card }: { card: SavedCard }) {
  const remove = useRemoveCard();
  const [confirming, setConfirming] = useState(false);
  const name = cardName(card);

  return (
    <li className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
      <IconBadge tone="muted" shape="square">
        <CreditCard />
      </IconBadge>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink">{name}</p>
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
          Expires {twoDigits(card.expMonth)}/{String(card.expYear).slice(-2)}
          {card.wallet && <Badge variant="outline">{WALLETS[card.wallet]}</Badge>}
          {card.expired && (
            <Badge variant="neutral" className="bg-danger/8 text-danger">
              Expired
            </Badge>
          )}
        </p>
      </div>
      <IconButton
        label={`Remove ${name}`}
        onClick={() => setConfirming(true)}
        className="hover:bg-danger/8 hover:text-danger"
      >
        <Trash2 aria-hidden="true" />
      </IconButton>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent
          title="Remove this card?"
          description={`${name} won’t be offered at checkout any more. Charges after a trip, such as extra kilometres, will come with a link to pay instead.`}
        >
          <div className="flex flex-wrap justify-end gap-3">
            <DialogClose asChild>
              <Button variant="ghost">Keep card</Button>
            </DialogClose>
            <Button
              variant="danger"
              loading={remove.isPending}
              onClick={() =>
                remove.mutate(card.id, {
                  onSuccess: () => {
                    setConfirming(false);
                    toast('Card removed');
                  },
                  onError: (error) =>
                    toast('We couldn’t remove that card', { tone: 'danger', description: error.message }),
                })
              }
            >
              Remove card
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </li>
  );
}

/** Adding a card: a SetupIntent opens the Payment Element, which saves the card with Stripe. */
function AddCardDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const setup = useStartCardSetup();
  const [secret, setSecret] = useState<string | null>(null);

  const change = (next: boolean) => {
    onOpenChange(next);
    if (next && !secret && !setup.isPending) setup.mutate(undefined, { onSuccess: setSecret });
    // A SetupIntent works once; the next card gets a new one.
    if (!next) {
      setSecret(null);
      setup.reset();
    }
  };

  const saved = () => {
    void queryClient.invalidateQueries({ queryKey: savedCardsQueryKey });
    change(false);
    toast('Card saved', { description: 'You can choose it at checkout.' });
  };

  return (
    <>
      <Button variant="secondary" onClick={() => change(true)}>
        <Plus aria-hidden="true" />
        Add a card
      </Button>
      <Dialog open={open} onOpenChange={change}>
        <DialogContent
          title="Add a card"
          description="Saved securely with Stripe for your next booking. Nothing is charged now."
        >
          {setup.isError ? (
            <Alert variant="danger" role="alert" title="We couldn’t open the card form">
              {setup.error.message}
            </Alert>
          ) : secret ? (
            <Elements
              key={secret}
              stripe={getStripe()}
              options={{ clientSecret: secret, appearance: stripeAppearance }}
            >
              <CardSetupForm onSaved={saved} />
            </Elements>
          ) : (
            <p className="flex items-center gap-2.5 text-sm text-muted" aria-live="polite">
              <Spinner />
              Opening the secure card form…
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SavedCards() {
  const cards = useSavedCards();
  const [adding, setAdding] = useState(false);
  const unavailable = cards.error instanceof ApiError && cards.error.status === 503;

  return (
    <SettingsSection
      title="Saved cards"
      description="Cards you’ve saved at checkout or here. Rento Vroom never sees the full card number: Stripe keeps it."
    >
      {cards.isError ? (
        <Alert
          variant="danger"
          role="alert"
          title={unavailable ? 'Payments aren’t available right now' : 'We couldn’t load your cards'}
          action={
            unavailable ? undefined : (
              <Button variant="secondary" size="sm" onClick={() => void cards.refetch()}>
                Try again
              </Button>
            )
          }
        >
          {cards.error.message}
        </Alert>
      ) : !cards.data ? (
        <div aria-hidden="true" className="grid gap-3">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : cards.data.length === 0 ? (
        <p className="text-sm text-muted">
          No saved cards yet. The card you pay with at checkout is saved here.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {cards.data.map((card) => (
            <CardRow key={card.id} card={card} />
          ))}
        </ul>
      )}
      {stripeKeyMode() !== 'missing' && !unavailable && (
        <div className="mt-6">
          <AddCardDialog open={adding} onOpenChange={setAdding} />
        </div>
      )}
    </SettingsSection>
  );
}

const STATUS: Record<PaymentHistoryItem['status'], string> = {
  AUTHORISED: 'Authorised, not charged yet',
  SUCCEEDED: 'Paid',
  FAILED: 'Still to pay',
  REFUNDED: 'Refunded',
  PARTIALLY_REFUNDED: 'Partly refunded',
};

function PaymentRow({ payment }: { payment: PaymentHistoryItem }) {
  const refunded = payment.refunds.filter((refund) => refund.status !== 'FAILED');
  return (
    <li className="grid gap-2 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-6">
      <div className="min-w-0">
        <p className="font-medium text-ink">
          {payment.type === 'EXTRA_CHARGE' ? 'Extra charge: ' : ''}
          {payment.vehicleTitle}
        </p>
        <p className="text-sm text-muted">
          {formatNzNumericDate(payment.at)} ·{' '}
          <Link to={`/trips/${payment.bookingRef}`} className="link-underline text-primary">
            {payment.bookingRef}
          </Link>
          {payment.method ? ` · ${payment.method}` : ''}
        </p>
        {refunded.map((refund, index) => (
          <p key={index} className="text-sm text-muted">
            {refund.status === 'PENDING' ? 'Refund on its way' : 'Refunded'} {formatNzd(refund.amountCents)}{' '}
            on {formatNzNumericDate(refund.at)}
          </p>
        ))}
      </div>
      <div className="grid justify-items-start gap-1 sm:justify-items-end sm:text-right">
        <p className="font-semibold text-ink tabular-nums">{formatNzd(payment.amountCents)}</p>
        <p className="text-sm text-muted">{STATUS[payment.status]}</p>
        {payment.hasReceipt && (
          <Link
            to={`/trips/${payment.bookingRef}/receipt`}
            className="link-underline inline-flex items-center gap-1.5 text-sm font-medium text-primary"
          >
            <ReceiptText aria-hidden="true" className="size-4" />
            Receipt
          </Link>
        )}
      </div>
    </li>
  );
}

function PaymentHistory() {
  const history = usePaymentHistory();
  return (
    <SettingsSection
      title="Payment history"
      description="What you’ve paid for each trip, with any refunds. Every amount is in NZD and includes GST."
    >
      {history.isError ? (
        <Alert
          variant="danger"
          role="alert"
          title="We couldn’t load your payments"
          action={
            <Button variant="secondary" size="sm" onClick={() => void history.refetch()}>
              Try again
            </Button>
          }
        >
          {history.error.message}
        </Alert>
      ) : !history.data ? (
        <div aria-hidden="true" className="grid gap-3">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : history.data.length === 0 ? (
        <p className="text-sm text-muted">No payments yet. They show here once you’ve booked a trip.</p>
      ) : (
        <ul className="divide-y divide-line">
          {history.data.map((payment) => (
            <PaymentRow key={payment.id} payment={payment} />
          ))}
        </ul>
      )}
    </SettingsSection>
  );
}

function PaymentsSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-6">
      <Skeleton className="h-12 w-56" />
      <Skeleton className="h-48 rounded-card" />
      <Skeleton className="h-64 rounded-card" />
    </div>
  );
}

/** Payment methods and history (spec §8; plan §8.1, item 7): saved cards to add or remove, and receipts. */
export function PaymentsPage() {
  return (
    <Container className="py-8 sm:py-12">
      <PageBackdrop art={DotGrid} />
      <PageMeta title="Payments" noindex />
      <RequireSignedIn
        fallback={
          <AccountShell>
            <PaymentsSkeleton />
          </AccountShell>
        }
      >
        {() => (
          <AccountShell>
            <div className="grid max-w-3xl gap-6">
              <AccountPageHeader
                title="Payments"
                description="Your saved cards, and what you’ve paid with receipts and refunds."
              />
              <SavedCards />
              <PaymentHistory />
            </div>
          </AccountShell>
        )}
      </RequireSignedIn>
    </Container>
  );
}
