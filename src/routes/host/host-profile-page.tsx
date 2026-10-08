import { zodResolver } from '@hookform/resolvers/zod';
import { Bell, ReceiptText, Star, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Link } from 'react-router';
import type { HostProfile } from '@/api/types';
import { PageBackdrop } from '@/components/brand/page-backdrop';
import { ParkingBays } from '@/components/brand/patterns/parking-bays';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { applyFieldErrors, formErrorMessage } from '@/features/account/form-errors';
import { RequireSignedIn } from '@/features/auth/require-signed-in';
import { HostPageHeader, HostSubNav } from '@/features/host/host-nav';
import {
  hostProfileSchema,
  useHostProfile,
  useSaveHostProfile,
  type HostProfileValues,
} from '@/features/host/host-profile-api';
import { Textarea } from '@/features/host/textarea';
import { formatNumber } from '@/lib/format';

const FIELDS = ['bio', 'gstNumber'] as const;

/** A short card with a heading, used for the profile's side panels. */
function InfoCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Card className="grid gap-3 p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold [&_svg]:size-4 [&_svg]:text-primary">
        {icon}
        {title}
      </h2>
      {children}
    </Card>
  );
}

function ProfileForm({ host }: { host: HostProfile }) {
  const save = useSaveHostProfile();
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<HostProfileValues>({
    resolver: zodResolver(hostProfileSchema),
    defaultValues: {
      bio: host.bio ?? '',
      gstRegistered: host.gstRegistered,
      gstNumber: host.gstNumber ?? '',
    },
    mode: 'onTouched',
  });
  const gstRegistered = useWatch({ control, name: 'gstRegistered' });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await save.mutateAsync(values);
      reset({ bio: saved.bio ?? '', gstRegistered: saved.gstRegistered, gstNumber: saved.gstNumber ?? '' });
      toast('Profile saved', { description: 'Guests see your new details on your listings straight away.' });
    } catch (error) {
      applyFieldErrors(error, FIELDS, setError);
    }
  });

  const serverError = save.isError ? formErrorMessage(save.error) : null;

  return (
    <Card className="p-5 sm:p-6">
      <form noValidate onSubmit={onSubmit} aria-label="Your Host profile">
        <fieldset disabled={save.isPending} className="grid min-w-0 gap-6">
          {serverError && (
            <Alert variant="danger" role="alert">
              {serverError}
            </Alert>
          )}

          <Field
            label="About you"
            error={errors.bio?.message}
            description="A few friendly lines for guests: who you are, and how you look after your cars. It shows on your listings."
          >
            <Textarea
              rows={5}
              maxLength={1100}
              placeholder="Kia ora! I'm Aroha. My Corolla is serviced every six months and loves a road trip."
              {...register('bio')}
            />
          </Field>

          <div className="grid gap-4 rounded-card border border-line bg-canvas/60 p-4 sm:p-5">
            <Controller
              control={control}
              name="gstRegistered"
              render={({ field }) => (
                <Switch
                  ref={field.ref}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  label="I'm registered for GST"
                  description="Your earnings statements then show our commission with its GST, for your GST return."
                />
              )}
            />
            {gstRegistered && (
              <Field label="GST number" error={errors.gstNumber?.message} className="animate-fade-up">
                <Input
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="123-456-789"
                  leadingIcon={<ReceiptText />}
                  {...register('gstNumber')}
                />
              </Field>
            )}
          </div>

          <Button
            type="submit"
            loading={save.isPending}
            disabled={!isDirty}
            className="sm:justify-self-start"
          >
            Save profile
          </Button>
        </fieldset>
      </form>
    </Card>
  );
}

function HostProfileView() {
  const profile = useHostProfile();

  if (profile.isPending) {
    return (
      <div aria-busy="true" className="grid gap-6 lg:grid-cols-3">
        <span className="sr-only">Loading your profile</span>
        <Skeleton className="h-96 rounded-card lg:col-span-2" />
        <Skeleton className="h-96 rounded-card" />
      </div>
    );
  }

  if (profile.isError) {
    return (
      <Alert
        variant="danger"
        role="alert"
        title="We couldn’t load your profile"
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => profile.refetch()}
            loading={profile.isFetching}
          >
            Try again
          </Button>
        }
      >
        {profile.error.message}
      </Alert>
    );
  }

  const host = profile.data;
  if (host.status !== 'APPROVED') {
    return (
      <Alert variant="info" title="Your profile opens once you’re approved to host">
        {host.status === 'APPLIED'
          ? 'We’re checking your application and will email you soon.'
          : 'Please contact support if you have questions about your application.'}{' '}
        <Link to="/host" className="link-underline font-medium text-primary">
          Back to hosting
        </Link>
      </Alert>
    );
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <ProfileForm host={host} />
      </div>
      <div className="grid gap-4">
        <InfoCard title="How guests see you" icon={<Star aria-hidden="true" />}>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted">Rating</dt>
              <dd className="font-semibold">
                {host.rating.count > 0
                  ? `${host.rating.avg.toFixed(1)} (${formatNumber(host.rating.count)})`
                  : 'No reviews yet'}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Trips</dt>
              <dd className="font-semibold">{formatNumber(host.tripCount)}</dd>
            </div>
            {host.responseRate !== undefined && (
              <div>
                <dt className="text-muted">Response rate</dt>
                <dd className="font-semibold">{host.responseRate}%</dd>
              </div>
            )}
          </dl>
          <Link to="/account/reviews" className="link-underline text-sm font-medium text-primary">
            Your reviews
          </Link>
        </InfoCard>

        <InfoCard title="Payouts" icon={<Wallet aria-hidden="true" />}>
          <p className="text-sm text-muted">
            {host.payoutsEnabled
              ? 'Your payout account is set up. Payouts go to your bank through Stripe.'
              : 'Set up payouts so we can pay you, and so your approved cars can go live.'}
          </p>
          <Button asChild variant="secondary" size="sm" className="justify-self-start">
            <Link to="/host/earnings">{host.payoutsEnabled ? 'Earnings and payouts' : 'Set up payouts'}</Link>
          </Button>
        </InfoCard>

        <InfoCard title="Notifications" icon={<Bell aria-hidden="true" />}>
          <p className="text-sm text-muted">
            Booking and trip messages always reach you. Choose texts for unread messages and our news in your
            account settings.
          </p>
          <Link to="/account/settings" className="link-underline text-sm font-medium text-primary">
            Notification settings
          </Link>
        </InfoCard>
      </div>
    </div>
  );
}

/** The Host's profile and settings (spec §9, item 10): bio, GST, and where payouts and notifications live. */
export function HostProfilePage() {
  return (
    <Container className="max-w-5xl py-8 sm:py-12">
      <PageBackdrop art={ParkingBays} />
      <PageMeta title="Host profile" noindex />
      <div className="grid gap-8">
        <HostSubNav />
        <HostPageHeader
          eyebrow="Hosting"
          title="Profile"
          description="What guests read about you, and your GST details."
        />
        <RequireSignedIn fallback={<Skeleton className="h-96 rounded-card" />}>
          {() => <HostProfileView />}
        </RequireSignedIn>
      </div>
    </Container>
  );
}
