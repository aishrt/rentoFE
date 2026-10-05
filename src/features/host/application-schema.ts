import { z } from 'zod';

/** An NZ GST number: 8 or 9 digits, usually written 123-456-789. */
export const GST_NUMBER = /^\d{2,3}-?\d{3}-?\d{3}$/;

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
    if (!values.gstRegistered) return;
    if (!values.gstNumber) {
      context.addIssue({ code: 'custom', path: ['gstNumber'], message: 'Enter your GST number' });
    } else if (!GST_NUMBER.test(values.gstNumber)) {
      context.addIssue({ code: 'custom', path: ['gstNumber'], message: 'GST numbers look like 123-456-789' });
    }
  });

export type ApplicationValues = z.infer<typeof applicationSchema>;
