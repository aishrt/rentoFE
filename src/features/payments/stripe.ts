import type { Appearance, Stripe } from '@stripe/stripe-js';
import { loadStripe } from '@stripe/stripe-js/pure';
import { env } from '@/lib/env';
import { colors } from '@/styles/tokens';

let stripePromise: Promise<Stripe | null> | undefined;

/**
 * Stripe.js, loaded from js.stripe.com the first time a payment form needs it, so pages without
 * one never download it (plan §12.5). Null when the publishable key isn't set.
 */
export function getStripe(): Promise<Stripe | null> {
  if (!env.stripePublishableKey) return Promise.resolve(null);
  stripePromise ??= loadStripe(env.stripePublishableKey);
  return stripePromise;
}

/** Whether this build has a Stripe key, and whether it's a sandbox one (pk_test_, no real money). */
export function stripeKeyMode(): 'missing' | 'test' | 'live' {
  if (!env.stripePublishableKey) return 'missing';
  return env.stripePublishableKey.startsWith('pk_test_') ? 'test' : 'live';
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
