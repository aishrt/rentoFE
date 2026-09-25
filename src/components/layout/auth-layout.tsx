import { ArrowLeft } from 'lucide-react';
import { m } from 'motion/react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { LandscapeArt } from '@/components/brand/landscape-art';
import { Logo } from '@/components/brand/logo';
import { fadeUp } from '@/components/motion/presets';
import { CheckList } from '@/components/ui/check-list';
import { motion } from '@/styles/tokens';
import { SkipLink } from './root-layout';

const COPY = {
  guest: {
    eyebrow: 'Kia ora',
    title: 'Your next road trip starts with a local.',
    points: ['Cars from real people across Aotearoa', 'All-in pricing in NZD', 'Verified hosts and guests'],
  },
  staff: {
    eyebrow: 'Staff portal',
    title: 'Keep every trip running smoothly.',
    points: ['Approvals and verifications', 'Bookings, payments and payouts', 'Support and incident cases'],
  },
} as const;

interface AuthLayoutProps {
  variant?: keyof typeof COPY;
  children: ReactNode;
}

/** Split screen for sign-in pages: the form on one side, brand art on the other (desktop only). */
export function AuthLayout({ variant = 'guest', children }: AuthLayoutProps) {
  const copy = COPY[variant];

  return (
    <div className="grid min-h-dvh bg-canvas lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <SkipLink />
      <div className="flex flex-col px-4 py-5 sm:px-10 sm:py-8">
        <header className="flex items-center justify-between gap-4">
          <Link to="/" viewTransition aria-label="Rento Vroom home" className="rounded-control">
            <Logo />
          </Link>
          <Link
            to="/"
            viewTransition
            className="inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-sm font-medium text-muted transition-colors duration-120 hover:text-ink"
          >
            <ArrowLeft aria-hidden="true" className="nudge-left size-4" />
            Back to home
          </Link>
        </header>

        <main id="main" className="flex flex-1 items-center justify-center py-10 sm:py-16">
          <m.div className="w-full max-w-[26rem]" {...fadeUp()}>
            {children}
          </m.div>
        </main>

        <p className="text-xs text-muted">© Rento Vroom · Car sharing across New Zealand</p>
      </div>

      <aside
        aria-label="About Rento Vroom"
        className="relative hidden overflow-hidden bg-ink text-canvas lg:m-3 lg:flex lg:rounded-sheet"
      >
        <LandscapeArt idPrefix="auth-art" className="absolute inset-0 h-full w-full animate-hero-drift" />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-t from-ink/90 via-ink/30 to-transparent"
        />
        <m.div className="relative mt-auto p-12 xl:p-16" {...fadeUp(motion.stagger * 2)}>
          <p className="eyebrow text-gold">{copy.eyebrow}</p>
          <p className="headline mt-4 max-w-md text-title-2 font-medium">{copy.title}</p>
          <CheckList items={copy.points} tone="dark" className="mt-8" />
        </m.div>
      </aside>
    </div>
  );
}
