/**
 * Runs after `vite build` (plan §1.4, item 1). Writes one HTML file per static public page, each
 * with its own title, description, robots rule, canonical URL, link-preview tags and JSON-LD, and
 * gives dist/index.html (the file for every other app URL) the site's default tags.
 * The CloudFront Function in infra/web-router.js serves each page's file for its URL.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { renderSeoHead, replaceSeoBlock } from '../src/seo/head.ts';
import { pageFile, seoPages } from '../src/seo/pages.ts';

const DIST = 'dist';
// Canonical and preview URLs use the live site unless the build is for another one (staging).
const siteUrl = (process.env.VITE_SITE_URL || 'https://www.rentovroom.com').replace(/\/+$/, '');

const shell = await readFile(join(DIST, 'index.html'), 'utf8');

for (const page of seoPages) {
  const file = join(DIST, pageFile(page.path));
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, replaceSeoBlock(shell, renderSeoHead(page, siteUrl)));
}
await writeFile(join(DIST, 'index.html'), replaceSeoBlock(shell, renderSeoHead(undefined, siteUrl)));

console.log(`SEO: wrote ${seoPages.length} page files to ${DIST}/pages for ${siteUrl}`);
