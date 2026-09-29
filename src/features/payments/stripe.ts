import type { Appearance, Stripe } from '@stripe/stripe-js';
import { loadStripe } from '@stripe/stripe-js/pure';
import { colors } from '@/styles/tokens';

// Stripe's publishable key (pk_test_… in the sandbox, pk_live_… at launch). Public by design: it can
// only start payments the API has created (plan §8). Read here rather than in lib/env.ts, which every
// page loads, so only the payment pages carry it.
const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || undefined;

let stripePromise: Promise<Stripe | null> | undefined;

/**
 * Stripe.js, loaded from js.stripe.com the first time a payment form needs it, so pages without
 * one never download it (plan §12.5). Null when the publishable key isn't set.
 */
export function getStripe(): Promise<Stripe | null> {
  if (!publishableKey) return Promise.resolve(null);
  stripePromise ??= loadStripe(publishableKey);
  return stripePromise;
}

/** Whether this build has a Stripe key, and whether it's a sandbox one (pk_test_, no real money). */
export function stripeKeyMode(): 'missing' | 'test' | 'live' {
  if (!publishableKey) return 'missing';
  return publishableKey.startsWith('pk_test_') ? 'test' : 'live';
}

/** The payment form in the site's colours and shapes (plan §12.2). */
export const stripeAppearance: Appearance = {
  theme: 'stripe',
  variables: {
    colorPrimary: colors.primary,
    colorText: colors.ink,
    colorTextSecondary: colors.muted,
    colorDanger: colors.danger,
    colorBackground: colors.surface,
    fontFamily: "'Inter Variable', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    borderRadius: '10px',
  },
};
