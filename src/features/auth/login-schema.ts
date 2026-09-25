import { z } from 'zod';

/** The same simple checks as the backend's login schema, for instant feedback (plan §2.3). */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address')
    .pipe(z.email({ error: 'Enter a valid email address, like name@example.co.nz' })),
  password: z.string().min(1, 'Enter your password'),
});

export type LoginValues = z.infer<typeof loginSchema>;
