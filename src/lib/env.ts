/** Public build-time settings. The frontend holds no secrets (plan §2.5). */
export const env = {
  apiUrl: (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/+$/, ''),
  // The live site's address, for canonical URLs (plan §1.4). Must match what the build step uses.
  siteUrl: (import.meta.env.VITE_SITE_URL || 'https://www.rentovroom.com').replace(/\/+$/, ''),
} as const;
