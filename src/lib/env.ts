/** Public build-time settings. The frontend holds no secrets (plan §2.5). */
export const env = {
  apiUrl: (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/+$/, ''),
} as const;
