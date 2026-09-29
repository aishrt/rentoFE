import type { components, paths } from './schema';

/**
 * Names for the API shapes the website uses. They all come from schema.d.ts, which
 * `npm run api:types` generates from the backend's openapi.json (plan §2.3), so they can't drift.
 */
type Schemas = components['schemas'];

export type SessionUser = Schemas['PublicUser'];
export type Role = SessionUser['roles'][number];
/** A legal document a user accepts: TERMS, PRIVACY, GUEST or HOST (agreement). */
export type AgreementType = SessionUser['pendingAgreements'][number];
export type LoginRequest = paths['/auth/login']['post']['requestBody']['content']['application/json'];
export type SignupRequest = paths['/auth/signup']['post']['requestBody']['content']['application/json'];
export type AdminOverview = Schemas['AdminOverview'];
/** A staff member's authenticator app setup: a QR code and the key to type by hand. */
export type MfaSetup = Schemas['MfaSetupResponse'];
/** A staff member's two-factor sign-in: whether it's on, and their authenticator apps (up to two). */
export type MfaStatus = Schemas['MfaStatus'];
export type MfaDevice = Schemas['MfaDevice'];
/** The day's exchange rates per NZ$1, for estimates in other currencies. */
export type ExchangeRates = Schemas['ExchangeRates'];
/** A NZ$1 sandbox payment from the staff portal, and how it went. */
export type TestPayment = Schemas['TestPayment'];
export type TestPaymentStatus = Schemas['TestPaymentStatus'];
