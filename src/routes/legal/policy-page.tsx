import { useLocation } from 'react-router';
import type { PublicPolicies } from '@/api/types';
import { SectionError } from '@/components/errors/section-error';
import { Container } from '@/components/layout/container';
import { SectionHeading } from '@/components/layout/section-heading';
import { Reveal } from '@/components/motion/reveal';
import { CheckList } from '@/components/ui/check-list';
import { CancellationTiers, CancellationTiersSkeleton } from '@/features/content/cancellation-tiers';
import { usePolicies } from '@/features/content/content-api';
import { EligibilitySummary, EligibilitySummarySkeleton } from '@/features/content/eligibility-summary';
import { documentLabels, photoAngleLabels } from '@/features/content/policies';
import { ExcessComparison } from '@/features/content/protection-plans';
import { NotFoundPage } from '@/routes/errors/not-found-page';
import { DocumentFrame } from './legal-page';
import { policyDocumentFor, policyDocuments, POLICY_UPDATED_AT, type PolicyLive } from './policy-documents';

const LIVE_COPY: Record<PolicyLive, { title: string; description: string }> = {
  refunds: {
    title: 'Cancellation tiers',
    description:
      'The refunds our booking system applies right now. Every listing shows its tier before you book.',
  },
  driver: {
    title: 'Who can drive',
    description: 'The rules our booking system checks right now.',
  },
  vehicle: {
    title: 'What a listing needs',
    description: 'The documents and photos we ask for right now.',
  },
  fees: {
    title: 'Fees in force',
    description: 'The rates our booking system applies right now.',
  },
  excess: {
    title: 'The most you pay towards a covered claim',
    description: 'Each protection plan’s excess, as set right now.',
  },
};

function LiveFigures({ live, policies }: { live: PolicyLive; policies: PublicPolicies }) {
  switch (live) {
    case 'refunds':
      return <CancellationTiers cancellation={policies.cancellation} />;
    case 'driver':
      return <EligibilitySummary eligibility={policies.eligibility} />;
    case 'vehicle':
      return (
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <h3 className="font-semibold">Documents</h3>
            <CheckList
              className="mt-3"
              items={[
                ...policies.vehicles.requiredDocuments.map((document) => documentLabels[document]),
                ...(policies.vehicles.vinOrChassisRequired
                  ? ['VIN or chassis number (only without a number plate)']
                  : []),
              ]}
            />
          </div>
          <div>
            <h3 className="font-semibold">Photos</h3>
            <CheckList
              className="mt-3"
              items={policies.vehicles.requiredPhotoAngles.map((angle) => photoAngleLabels[angle])}
            />
          </div>
        </div>
      );
    case 'fees':
      return (
        <CheckList
          items={[
            `Guest service fee: ${policies.fees.guestServiceFeePct}% of the rental`,
            `Host commission: ${policies.fees.hostCommissionPct}% of the rental`,
            `GST: ${policies.fees.gstRatePct}%`,
          ]}
        />
      );
    case 'excess':
      return <ExcessComparison plans={policies.protectionPlans} />;
  }
}

/** The figures in force, read from the API, so this page can't differ from what the system charges. */
function LiveSection({ live }: { live: PolicyLive }) {
  const policies = usePolicies();
  const copy = LIVE_COPY[live];

  return (
    <section aria-labelledby="live-heading" className="pt-12 sm:pt-16 lg:pt-20">
      <Container>
        <Reveal>
          <SectionHeading
            id="live-heading"
            eyebrow="In force today"
            title={copy.title}
            description={copy.description}
          />
        </Reveal>
        <div className="mt-10">
          {policies.isPending &&
            (live === 'refunds' ? <CancellationTiersSkeleton /> : <EligibilitySummarySkeleton />)}
          {policies.isError && (
            <SectionError
              title="We couldn’t load the current figures"
              description="Try again in a moment. The policy text below still applies."
              onRetry={() => policies.refetch()}
            />
          )}
          {policies.data && <LiveFigures live={live} policies={policies.data} />}
        </div>
      </Container>
    </section>
  );
}

/**
 * The policies beyond the five legal documents (spec §3): Community guidelines, Refund policy, Vehicle and
 * Driver eligibility, Payment and fees, Damage and claims, Security deposit, Prohibited uses, and Late
 * returns and charges.
 */
export function PolicyPage() {
  const { pathname } = useLocation();
  const document = policyDocumentFor(pathname);
  if (!document) return <NotFoundPage />;

  return (
    <DocumentFrame
      key={document.path}
      path={document.path}
      eyebrow="Policy"
      page={{
        title: document.label,
        version: '1.0',
        updatedAt: POLICY_UPDATED_AT,
        markdown: document.markdown,
      }}
      above={document.live ? <LiveSection live={document.live} /> : undefined}
      relatedPolicies={policyDocuments}
    />
  );
}
