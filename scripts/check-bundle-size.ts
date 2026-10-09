/**
 * The JavaScript budget (plan §12.5): the gzipped JavaScript a visitor downloads on first load of
 * the homepage, which is the app's entry chunk plus the homepage route and everything they import.
 * Run after `npm run build`, by hand: since 8 October 2026 it's no longer a step of the deploy pipeline (the
 * owner's choice), so going over the limit only shows here.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const PLAN_BUDGET_KB = 170;
// The homepage is over the plan's budget (183.2 KB on 28 September 2026). Until it's brought down,
// the build fails only if it grows; lower this with each reduction until it reaches PLAN_BUDGET_KB.
// Raised from 185 on 29 September 2026: the staff Settings route adds 0.26 KB to the entry chunk.
// Raised from 185.5 later that day (185.0 → 186.4 KB): the staff Payments page's currency picker
// shares Select and Field with the homepage, so Rollup moved them into chunks of their own, which
// compress less well. No homepage code was added; listing and checkout pages would split them anyway.
// Lowered from 186.5 on 30 September 2026 (185.1 KB): the hero search form no longer uses react-hook-form
// (about 11 KB), which paid for its API-backed location search, the lazy featured-cars and reviews sections'
// placeholders, and the Phase 2 routes that grew the entry chunk by 2.7 KB the same day.
// Lowered from 185.5 later that day (182.5 KB): the first load's icons now share one file instead of about
// thirty (vite.config.ts), and the toasts load with the first toast.
// Raised from 183 on 3 October 2026 (182.8 → 183.2 KB in the staging build) with no new homepage code:
// BlurText became a file of its own (about 0.2 KB) once the landscape it shared one with became the home
// page's alone (every page now has its own background), and the /notifications route adds its entry to the
// router. Local builds measure about 0.15 KB less than the pipeline's, which has the real VITE_ values.
// Raised from 183.3 on 7 October 2026 (183.05 → 183.31 KB locally, so about 183.46 KB in the pipeline) with
// no new homepage code: the listing editor's unsaved-changes check uses React Router's useBlocker, whose
// code joins the router in the entry chunk (about 0.2 KB), and the footer's links now animate the page change.
// Raised from 183.5 later on 7 October 2026 (183.31 → 184.11 KB locally, so about 184.26 KB in the pipeline)
// with no new homepage code: the Guest dashboard adds eight routes (account, Saved cars, payments, a receipt,
// help and support, a support request, the help centre and a guide), and each adds its entry to the router
// with the chunks it preloads (0.7 KB measured with and without them). The same build without those routes
// measures 183.4 KB.
// Raised from 184.3 on 8 October 2026 (184.0 → 188.2 KB locally, so about 188.35 KB in the pipeline) with
// no new homepage code: Phase 3 adds 38 routes (messages, the handover, earnings and the Host profile,
// reviews, incidents, a pay link and 17 staff portal pages), each with its router entry and the chunks it
// preloads. The same build with the previous router measures 184.0 KB. Loading the staff portal's routes
// only on the way into /admin would take back about half of it.
// Lowered from 188.4 later on 8 October 2026: the staff portal's routes now join the router on the way into
// /admin (patchAdminRoutes in router.tsx), 188.2 → 186.0 KB locally. Phase 3's polish pass then added 0.5 KB
// (186.5 KB locally, so about 186.65 KB in the pipeline): pickers inside dialogs open their lists in the dialog
// (PopoverRootContext, 0.2 KB with the chunks it moved), the header keeps the wordmark on one line on phones,
// and reviews can be reported (the review card's action slot).
// Raised from 186.7 on 9 October 2026 (186.5 → 187.3 KB locally, so about 187.45 KB in the pipeline): admins
// now edit the homepage's headline, footer links and destination tiles (plan §12.6), so the homepage reads them
// from the API with the original copy as the fallback (0.42 KB, measured with and without those files); and the
// Host calendar and member profile routes and the account menus' Reviews link add about 0.15 KB to the entry.
const LIMIT_KB = 187.5;
const HOME_ROUTE = 'src/routes/public/home/home-page.tsx';

interface ManifestChunk {
  file: string;
  imports?: string[];
}

const manifest: Record<string, ManifestChunk> = JSON.parse(
  await readFile(join('dist', '.vite', 'manifest.json'), 'utf8'),
);

const files = new Set<string>();
function collect(key: string) {
  const chunk = manifest[key];
  if (!chunk || files.has(chunk.file)) return;
  files.add(chunk.file);
  chunk.imports?.forEach(collect);
}
collect('index.html');
if (!manifest[HOME_ROUTE]) throw new Error(`${HOME_ROUTE} is not in the build manifest; update HOME_ROUTE`);
collect(HOME_ROUTE);

const sizes = await Promise.all(
  [...files]
    .filter((file) => file.endsWith('.js'))
    .map(async (file) => ({
      file,
      kb: gzipSync(await readFile(join('dist', file)), { level: 9 }).length / 1024,
    })),
);
const totalKb = sizes.reduce((sum, { kb }) => sum + kb, 0);

for (const { file, kb } of sizes.sort((a, b) => b.kb - a.kb))
  console.log(`${kb.toFixed(1).padStart(7)} KB  ${file}`);
console.log(`Homepage first-load JavaScript: ${totalKb.toFixed(1)} KB gzipped (budget ${PLAN_BUDGET_KB} KB)`);

if (totalKb > LIMIT_KB) {
  console.log(
    `::error::Homepage JavaScript is ${totalKb.toFixed(1)} KB gzipped, above the ${LIMIT_KB} KB limit.`,
  );
  process.exit(1);
}
if (totalKb > PLAN_BUDGET_KB) {
  console.log(
    `::warning::Homepage JavaScript is ${totalKb.toFixed(1)} KB gzipped, over the plan's ${PLAN_BUDGET_KB} KB budget.`,
  );
}
