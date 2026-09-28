import { z } from 'zod';

export const MIN_PASSWORD_LENGTH = 10;

/**
 * The simple checks from the backend's sign-up schema, for instant feedback (plan §2.3). The backend
 * also refuses common passwords and taken email addresses; those errors come back per field.
 */
export const signupSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter your first name').max(50, 'That name is too long'),
  lastName: z.string().trim().min(1, 'Enter your last name').max(50, 'That name is too long'),
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address')
    .pipe(z.email({ error: 'Enter a valid email address, like name@example.co.nz' })),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
    .max(200, 'That password is too long'),
  acceptTerms: z.boolean().refine(Boolean, {
    error: 'Please accept the Terms and Conditions and the Privacy Policy',
  }),
});

export type SignupValues = z.infer<typeof signupSchema>;
