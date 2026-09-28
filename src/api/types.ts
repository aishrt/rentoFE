import type { components, paths } from './schema';

/**
 * Names for the API shapes the website uses. They all come from schema.d.ts, which
 * `npm run api:types` generates from the backend's openapi.json (plan §2.3), so they can't drift.
 */
type Schemas = components['schemas'];

export type SessionUser = Schemas['PublicUser'];
export type Role = SessionUser['roles'][number];
export type LoginRequest = paths['/auth/login']['post']['requestBody']['content']['application/json'];
export type AdminOverview = Schemas['AdminOverview'];
