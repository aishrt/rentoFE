import { z } from 'zod';

/** A 6-digit code from an SMS or an authenticator app, typed with or without a space in the middle. */
export const codeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{3} ?\d{3}$/, 'Enter the 6-digit code'),
});

export type CodeValues = z.infer<typeof codeSchema>;

/** The code as the API expects it: digits only. */
export const digitsOnly = (code: string) => code.replaceAll(/\D/g, '');

/** Props for a one-time-code input: the number pad on phones, and SMS autofill where supported. */
export const oneTimeCodeInputProps = {
  inputMode: 'numeric',
  autoComplete: 'one-time-code',
  maxLength: 7,
  placeholder: '123 456',
  className: 'tracking-widest',
} as const;
