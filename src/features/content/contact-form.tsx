import { zodResolver } from '@hookform/resolvers/zod';
import { Hash, Tag } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useLocation } from 'react-router';
import { CheckDraw } from '@/components/motion/check-draw';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ApiError } from '@/api/client';
import { formErrorMessage } from '@/features/account/form-errors';
import { useSession } from '@/features/auth/use-session';
import { EvidencePicker } from '@/features/incidents/evidence-picker';
import { useTicketFiles } from '@/features/support/use-ticket-files';
import { useContactRequest } from './content-api';
import {
  categoryLabels,
  contactFields,
  contactSchema,
  ticketCategories,
  type ContactValues,
  type TicketCategory,
} from './contact-schema';
import { Textarea } from './textarea';

const categoryOptions = ticketCategories.map((value) => ({ value, label: categoryLabels[value] }));

function isCategory(value: string | null | undefined): value is TicketCategory {
  return ticketCategories.includes(value as TicketCategory);
}

interface ContactFormProps {
  /** A topic to start on, e.g. from a "contact us about privacy" link (?category=PRIVACY). */
  initialCategory?: string | null;
  /** A booking to start with, e.g. from a trip (?booking=RV-7K2Q9M). */
  initialBookingRef?: string | null;
}

function SentMessage({
  reference,
  email,
  onReset,
}: {
  reference: string;
  email: string;
  onReset: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Moves focus to the confirmation, so screen readers announce it in place of the form that's gone.
  useEffect(() => headingRef.current?.focus(), []);

  return (
    <div className="flex animate-fade-up flex-col items-start">
      <span
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-full bg-primary text-white inset-shadow-highlight"
      >
        <CheckDraw className="size-6" delay={0.1} />
      </span>
      <h2 ref={headingRef} tabIndex={-1} className="headline mt-6 text-title-3 font-medium outline-none">
        Message sent
      </h2>
      <p className="mt-3 text-lg text-muted">
        Thanks for getting in touch. Our support team will reply by email.
      </p>
      <dl className="mt-8 w-full rounded-card border border-line bg-canvas p-5">
        <dt className="eyebrow text-muted">Your reference</dt>
        <dd className="headline mt-1.5 text-3xl font-medium text-primary">{reference}</dd>
      </dl>
      <p className="mt-4 text-sm text-muted">
        We’ve emailed a copy to <span className="font-medium text-ink">{email}</span>. Quote the reference if
        you write to us again about this.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button variant="secondary" onClick={onReset}>
          Send another message
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/faq" viewTransition>
            Browse the FAQs
          </Link>
        </Button>
      </div>
    </div>
  );
}

/**
 * Contact Us (plan §9, Days 12–14): creates a support ticket, signed in or not. Signed-in members start with
 * their name and email filled in, and can add photos and documents: uploads need an account, so visitors
 * are asked to log in for that. The API's answers show next to their fields; a rate limit shows above.
 */
export function ContactForm({ initialCategory, initialBookingRef }: ContactFormProps) {
  const session = useSession();
  const contact = useContactRequest();
  const files = useTicketFiles();
  const location = useLocation();
  const errorId = useId();
  const user = session.data;

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: user ? `${user.firstName} ${user.lastName}`.trim() : '',
      email: user?.email ?? '',
      category: isCategory(initialCategory) ? initialCategory : undefined,
      subject: '',
      message: '',
      bookingRef: initialBookingRef ?? '',
    },
    mode: 'onTouched',
  });

  // The session may arrive after the form: fill in what the visitor hasn't typed yet.
  useEffect(() => {
    if (!user) return;
    const current = getValues();
    if (!current.name) setValue('name', `${user.firstName} ${user.lastName}`.trim());
    if (!current.email) setValue('email', user.email);
  }, [user, getValues, setValue]);

  const onSubmit = handleSubmit(async ({ bookingRef, ...values }) => {
    try {
      await contact.mutateAsync({
        ...values,
        ...(bookingRef ? { bookingRef } : {}),
        ...(user && files.attachments.length > 0 ? { attachments: files.attachments } : {}),
      });
      files.reset();
    } catch (error) {
      if (!(error instanceof ApiError) || !error.fields) return;
      // Only the first is focused: moving focus on would blur it, and re-checking a field on blur clears an
      // error the API found but the form's own checks can't see.
      const withErrors = contactFields.filter((field) => error.fields?.[field]);
      withErrors.forEach((field, index) =>
        setError(field, { message: error.fields?.[field] ?? '' }, { shouldFocus: index === 0 }),
      );
    }
  });

  if (contact.isSuccess) {
    const { name, email } = getValues();
    return (
      <SentMessage
        reference={contact.data}
        email={email}
        onReset={() => {
          contact.reset();
          reset({ name, email, category: undefined, subject: '', message: '', bookingRef: '' });
        }}
      />
    );
  }

  // The API's word on the files: from a visitor, or an upload it can't find.
  const filesError =
    contact.error instanceof ApiError
      ? (contact.error.fields?.attachments ??
        (contact.error.code === 'UPLOAD_NOT_FOUND' ? contact.error.message : undefined))
      : undefined;
  const serverError = contact.isError && !filesError ? formErrorMessage(contact.error) : null;
  const pending = contact.isPending;
  const next = encodeURIComponent(`${location.pathname}${location.search}`);

  return (
    <form noValidate onSubmit={onSubmit} aria-describedby={serverError ? errorId : undefined}>
      <fieldset disabled={pending} className="grid min-w-0 gap-5">
        <legend className="sr-only">Your message</legend>

        {serverError && (
          <Alert id={errorId} variant="danger" role="alert">
            {serverError}
          </Alert>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Your name" error={errors.name?.message}>
            <Input autoComplete="name" {...register('name')} />
          </Field>
          <Field label="Email address" error={errors.email?.message}>
            <Input
              type="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="you@example.co.nz"
              {...register('email')}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="What’s it about?" error={errors.category?.message}>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select
                  ref={field.ref}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  options={categoryOptions}
                  placeholder="Choose a topic"
                  icon={<Tag />}
                  listLabel="Topics"
                />
              )}
            />
          </Field>
          <Field
            label="Booking reference (optional)"
            error={errors.bookingRef?.message}
            description="Looks like RV-7K2Q9M. It helps us find your trip."
          >
            <Input
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              leadingIcon={<Hash />}
              {...register('bookingRef')}
            />
          </Field>
        </div>

        <Field label="Subject" error={errors.subject?.message}>
          <Input {...register('subject')} />
        </Field>

        <Field label="Message" error={errors.message?.message}>
          <Textarea rows={7} {...register('message')} />
        </Field>

        {user ? (
          <div className="grid gap-2">
            <p className="text-sm font-medium text-ink">Photos or documents (optional)</p>
            <p className="text-sm text-muted">
              Screenshots, receipts or photos of the car. Only you and our support team see them.
            </p>
            <EvidencePicker evidence={files} />
            {filesError && (
              <Alert variant="danger" role="alert">
                {filesError}
              </Alert>
            )}
          </div>
        ) : (
          !session.isPending && (
            <p className="text-sm text-muted">
              To send photos or documents,{' '}
              <Link to={`/login?next=${next}`} className="link-underline font-medium text-primary">
                log in
              </Link>{' '}
              first: they’re kept private, for you and our support team only.
            </p>
          )
        )}

        <div className="mt-1 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            We use your details only to answer your message. Read our{' '}
            <Link to="/privacy" className="link-underline font-medium text-primary">
              Privacy policy
            </Link>
            .
          </p>
          <Button type="submit" size="lg" loading={pending} disabled={files.uploading} className="shrink-0">
            {pending ? 'Sending…' : 'Send message'}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
