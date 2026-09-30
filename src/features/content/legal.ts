import { NZ_TIME_ZONE } from '@/lib/format';
import type { Block } from './markdown';

const updatedFormat = new Intl.DateTimeFormat('en-NZ', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: NZ_TIME_ZONE,
});

/** "28/09/2026": a legal page's last update, in NZ time (plan §12.7, NZ date formats). */
export function formatUpdatedDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : updatedFormat.format(date);
}

/**
 * Drops a first heading that repeats the page's title: the page shows the title as its own h1, and the
 * CMS documents open with it too.
 */
export function withoutTitleHeading(blocks: Block[], title: string): Block[] {
  const [first, ...rest] = blocks;
  const normalise = (text: string) => text.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ').trim();
  if (first?.type === 'heading' && normalise(first.text) === normalise(title)) return rest;
  return blocks;
}

export interface ContentsEntry {
  id: string;
  text: string;
}

/** The level of the document's main sections: its shallowest heading, or 1 when it has none. */
export function topHeadingLevel(blocks: Block[]): number {
  const levels = blocks.flatMap((block) => (block.type === 'heading' ? [block.level] : []));
  return levels.length > 0 ? Math.min(...levels) : 1;
}

/**
 * How far to move the document's headings so its main sections are h2s under the page's h1, whether the
 * document marks them with # or ## (plan §12.7: no skipped heading levels).
 */
export function sectionHeadingOffset(blocks: Block[]): number {
  return 2 - topHeadingLevel(blocks);
}

/** The document's main sections, for an "On this page" list. */
export function tableOfContents(blocks: Block[]): ContentsEntry[] {
  const top = topHeadingLevel(blocks);
  return blocks.flatMap((block) =>
    block.type === 'heading' && block.level === top ? [{ id: block.id, text: block.text }] : [],
  );
}
