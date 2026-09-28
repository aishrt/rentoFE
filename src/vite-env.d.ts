/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend origin, e.g. http://localhost:4000 or https://api.<domain>. */
  readonly VITE_API_URL?: string;
  /** The site's own address for canonical URLs, e.g. https://www.<domain>. Defaults to the live site. */
  readonly VITE_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
