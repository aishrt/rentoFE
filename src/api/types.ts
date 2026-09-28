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
