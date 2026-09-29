import { PageMeta } from '@/components/layout/page-meta';
import { TestPaymentSection } from '@/features/admin/test-payment-section';

/**
 * Payments and payouts in the staff portal. For now the Stripe test payment; the payments list,
 * refunds and Host payouts (plan §12.6) join it as they're built.
 */
export function AdminPaymentsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageMeta title="Payments & payouts · Staff portal" noindex />

      <header className="animate-fade-up">
        <p className="eyebrow text-primary">Finance</p>
        <h1 className="headline mt-2 text-title-3 font-medium">Payments &amp; payouts</h1>
        <p className="mt-2 text-muted">
          Guests pay by card, Apple Pay or Google Pay through Stripe, always in NZD. Bookings, refunds and
          Host payouts appear here as they&rsquo;re built.
        </p>
      </header>

      <div className="mt-8 grid gap-6">
        <TestPaymentSection />
      </div>
    </div>
  );
}
