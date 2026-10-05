/**
 * Structured data for search engines, as a JSON-LD script in the page. React sets it as text, and `<` is
 * escaped so no value can ever close the script element early.
 */
export function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json">{json}</script>;
}
