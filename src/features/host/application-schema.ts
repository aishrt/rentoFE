import { z } from 'zod';
import { isValidGstNumber } from '@/lib/gst-number';

/** An NZ GST number: 8 or 9 digits, usually written 123-456-789. */
export const GST_NUMBER = /^\d{2,3}-?\d{3}-?\d{3}$/;

/**
 * What's wrong with a GST number as typed, as the API would say: its shape, then its check digit (skipped
 * with `checkDigit: false`, for a number already saved).
 */
export function gstNumberProblem(value: string, { checkDigit = true } = {}): string | undefined {
  if (!value) return 'Enter your GST number';
  if (!GST_NUMBER.test(value)) return 'GST numbers look like 123-456-789';
  if (checkDigit && !isValidGstNumber(value))
    return 'That isn’t a valid GST number. Check it on your IRD registration.';
  return undefined;
}

/**
 * The simple checks from the backend's Host application schema, for instant feedback (plan §2.3). The API
 * also needs a verified mobile, which the page checks before sending.
 */
export const applicationSchema = z
  .object({
    bio: z.string().trim().max(1000, 'Keep it under 1,000 characters'),
    gstRegistered: z.boolean(),
    gstNumber: z.string().trim(),
    acceptHostAgreement: z.boolean().refine(Boolean, { error: 'Please accept the Host Agreement' }),
  })
  .superRefine((values, context) => {
    const problem = values.gstRegistered ? gstNumberProblem(values.gstNumber) : undefined;
    if (problem) context.addIssue({ code: 'custom', path: ['gstNumber'], message: problem });
  });

export type ApplicationValues = z.infer<typeof applicationSchema>;
