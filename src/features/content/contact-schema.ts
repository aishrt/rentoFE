import { z } from 'zod';
import type { ContactRequest } from '@/api/types';

export const ticketCategories = [
  'BOOKING',
  'PAYMENT',
  'ACCOUNT',
  'HOSTING',
  'SAFETY',
  'PRIVACY',
  'OTHER',
] as const satisfies readonly ContactRequest['category'][];

export type TicketCategory = (typeof ticketCategories)[number];

export const BOOKING_REF_PATTERN = /^RV-[A-Z0-9]{6}$/;

/**
 * The simple checks from the backend's contact schema (support.schemas.ts), for instant feedback (plan §2.3).
 * The backend checks again and answers per field.
 */
export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(100, 'That name is too long'),
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address')
    .max(254, 'That email address is too long')
    .pipe(z.email({ error: 'Enter a valid email address, like name@example.co.nz' })),
  category: z.enum(ticketCategories, { error: 'Choose what your message is about' }),
  subject: z.string().trim().min(3, 'Add a short subject').max(200, 'Keep the subject under 200 characters'),
  message: z
    .string()
    .trim()
    .min(10, 'Tell us a little more (at least 10 characters)')
    .max(5000, 'Keep it under 5,000 characters'),
  bookingRef: z
    .string()
    .trim()
    .toUpperCase()
    .refine(
      (value) => value === '' || BOOKING_REF_PATTERN.test(value),
      'Booking references look like RV-7K2Q9M',
    ),
});

export type ContactValues = z.infer<typeof contactSchema>;

/** The form's fields that the API can return errors for, in the order they appear. */
export const contactFields = ['name', 'email', 'category', 'bookingRef', 'subject', 'message'] as const;

/** How each topic reads in the form's "What's it about?" list. */
export const categoryLabels: Record<TicketCategory, string> = {
  BOOKING: 'A booking',
  PAYMENT: 'Payments and refunds',
  ACCOUNT: 'My account',
  HOSTING: 'Hosting my car',
  SAFETY: 'Safety or an incident',
  PRIVACY: 'Privacy and my data',
  OTHER: 'Something else',
};
