/*
 * A small Markdown reader for the legal pages that come from the CMS (plan §9, Days 12–14). It turns the text
 * into a tree that `Markdown` (markdown-view.tsx) renders as React elements, so raw HTML in the source shows
 * as text and nothing is ever injected as HTML. It covers what legal documents need: headings, paragraphs,
 * bold, italic, inline code, links, lists (nested too), blockquotes and horizontal rules. Tables, images and
 * code blocks aren't supported and show as plain paragraphs.
 */

export type Inline =
  | { type: 'text'; value: string }
  | { type: 'strong'; children: Inline[] }
  | { type: 'em'; children: Inline[] }
  | { type: 'code'; value: string }
  | { type: 'link'; href: string; title?: string; children: Inline[] }
  | { type: 'break' };

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type Block =
  | { type: 'heading'; level: HeadingLevel; id: string; text: string; children: Inline[] }
  | { type: 'paragraph'; children: Inline[] }
  | { type: 'list'; ordered: boolean; start: number; loose: boolean; items: Block[][] }
  | { type: 'blockquote'; children: Block[] }
  | { type: 'rule' };

const ATX_HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const SETEXT_UNDERLINE = /^ {0,3}(=+|-+)[ \t]*$/;
const RULE = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const BLOCKQUOTE = /^ {0,3}> ?(.*)$/;
const LIST_ITEM = /^( {0,3})([-*+]|\d{1,9}[.)])(?:([ \t]+)(.*))?$/;
const AUTOLINK = /^<((?:https?:\/\/|mailto:)[^\s<>]+)>/i;
/** The destination and optional title after `](`, up to the closing bracket. */
const LINK_TARGET =
  /^[ \t]*(<[^<>\n]*>|[^\s()]*(?:\([^\s()]*\)[^\s()]*)*)(?:[ \t]+("[^"\n]*"|'[^'\n]*'))?[ \t]*\)/;
const ESCAPABLE = /[\\`*_{}[\]()#+\-.!<>|~"']/;
const WORD_CHARACTER = /[\p{L}\p{N}]/u;

const isBlank = (line: string) => line.trim() === '';
const leadingSpaces = (line: string) => line.length - line.trimStart().length;

// ── Inline ───────────────────────────────────────────────────────────────────────────────────────────

/** Length of the run of `character` starting at `index`. */
function runLength(source: string, index: number, character: string): number {
  let end = index;
  while (source[end] === character) end += 1;
  return end - index;
}

/** `*em*`, `**strong**` or `***both***` (and the `_` forms, which never start or end inside a word). */
function matchEmphasis(source: string, start: number): { node: Inline; end: number } | null {
  const character = source[start] as '*' | '_';
  const length = runLength(source, start, character);
  const after = source[start + length];
  if (length > 3 || !after || /\s/.test(after)) return null;
  if (character === '_' && start > 0 && WORD_CHARACTER.test(source[start - 1] ?? '')) return null;

  let index = start + length;
  while (index < source.length) {
    const current = source[index];
    if (current === '\\') {
      index += 2;
      continue;
    }
    if (current !== character) {
      index += 1;
      continue;
    }
    const closing = runLength(source, index, character);
    const before = source[index - 1] ?? '';
    const next = source[index + closing] ?? '';
    const closes =
      closing === length && !/\s/.test(before) && !(character === '_' && WORD_CHARACTER.test(next));
    if (closes) {
      const children = parseInline(source.slice(start + length, index));
      const node: Inline =
        length === 1
          ? { type: 'em', children }
          : length === 2
            ? { type: 'strong', children }
            : { type: 'strong', children: [{ type: 'em', children }] };
      return { node, end: index + closing };
    }
    // A run of another length belongs to other emphasis: skip it whole.
    index += closing;
  }
  return null;
}

/** `[text](destination "title")`, with brackets allowed inside the text when they're balanced. */
function matchLink(source: string, start: number): { node: Inline; end: number } | null {
  let depth = 0;
  let close = start;
  for (; close < source.length; close += 1) {
    const current = source[close];
    if (current === '\\') close += 1;
    else if (current === '[') depth += 1;
    else if (current === ']' && --depth === 0) break;
  }
  if (close >= source.length || source[close + 1] !== '(') return null;

  const target = LINK_TARGET.exec(source.slice(close + 2));
  if (!target) return null;
  const rawHref = target[1] ?? '';
  const href = rawHref.startsWith('<') ? rawHref.slice(1, -1) : rawHref;
  const title = target[2]?.slice(1, -1);
  return {
    node: { type: 'link', href, title, children: parseInline(source.slice(start + 1, close)) },
    end: close + 2 + target[0].length,
  };
}

/** Bold, italic, code, links and line breaks within a paragraph, heading or list item. */
export function parseInline(source: string): Inline[] {
  const nodes: Inline[] = [];
  let text = '';
  const flush = () => {
    if (text) nodes.push({ type: 'text', value: text });
    text = '';
  };

  let index = 0;
  while (index < source.length) {
    const current = source[index] ?? '';

    if (current === '\\') {
      const next = source[index + 1];
      if (next === '\n') {
        flush();
        nodes.push({ type: 'break' });
        index += 2;
      } else if (next !== undefined && ESCAPABLE.test(next)) {
        text += next;
        index += 2;
      } else {
        text += current;
        index += 1;
      }
      continue;
    }

    if (current === '\n') {
      // Two spaces at the end of a line make a line break; otherwise the lines join with a space.
      const hardBreak = / {2,}$/.test(text);
      text = text.replace(/ +$/, '');
      if (hardBreak) {
        flush();
        nodes.push({ type: 'break' });
      } else {
        text += ' ';
      }
      index += 1;
      continue;
    }

    if (current === '`') {
      const length = runLength(source, index, '`');
      const fence = '`'.repeat(length);
      let close = source.indexOf(fence, index + length);
      while (close !== -1 && runLength(source, close, '`') !== length) {
        close = source.indexOf(fence, close + runLength(source, close, '`'));
      }
      if (close !== -1) {
        flush();
        nodes.push({
          type: 'code',
          value: source
            .slice(index + length, close)
            .replace(/\n/g, ' ')
            .trim(),
        });
        index = close + length;
      } else {
        text += fence;
        index += length;
      }
      continue;
    }

    const match =
      current === '['
        ? matchLink(source, index)
        : current === '*' || current === '_'
          ? matchEmphasis(source, index)
          : null;
    if (match) {
      flush();
      nodes.push(match.node);
      index = match.end;
      continue;
    }

    if (current === '<') {
      const autolink = AUTOLINK.exec(source.slice(index));
      if (autolink) {
        const href = autolink[1] ?? '';
        flush();
        nodes.push({
          type: 'link',
          href,
          children: [{ type: 'text', value: href.replace(/^mailto:/i, '') }],
        });
        index += autolink[0].length;
        continue;
      }
    }

    if (current === '*' || current === '_') {
      // An unmatched run stays as it is, so its characters aren't tried again one at a time.
      const length = runLength(source, index, current);
      text += current.repeat(length);
      index += length;
      continue;
    }

    text += current;
    index += 1;
  }

  flush();
  return nodes;
}

/** The words of some inline content, without the formatting. */
export function plainText(nodes: Inline[]): string {
  return nodes
    .map((node) => {
      if (node.type === 'text' || node.type === 'code') return node.value;
      if (node.type === 'break') return ' ';
      return plainText(node.children);
    })
    .join('');
}

// ── Blocks ───────────────────────────────────────────────────────────────────────────────────────────

/** A list item marker, and whether it may interrupt a paragraph (bullets and lists starting at 1). */
function listMarker(line: string) {
  const match = LIST_ITEM.exec(line);
  if (!match) return null;
  const [, indent = '', marker = '', spacing = '', content = ''] = match;
  // A marker needs a space after it, unless the item is empty ("-" alone).
  if (!spacing && content) return null;
  const ordered = /\d/.test(marker);
  // Content starting more than four spaces in is indented content: count the marker as followed by one.
  const gap = spacing.length === 0 || spacing.length > 4 ? 1 : spacing.length;
  return {
    ordered,
    delimiter: ordered ? marker.slice(-1) : marker,
    start: ordered ? Number.parseInt(marker, 10) : 1,
    contentIndent: indent.length + marker.length + gap,
    content: spacing.length > 4 ? `${' '.repeat(spacing.length - 1)}${content}` : content,
    interrupts: content !== '' && (!ordered || Number.parseInt(marker, 10) === 1),
  };
}

type Marker = NonNullable<ReturnType<typeof listMarker>>;

/** Whether a line starts a new block, ending the paragraph before it. */
function interruptsParagraph(line: string): boolean {
  return (
    ATX_HEADING.test(line) ||
    RULE.test(line) ||
    BLOCKQUOTE.test(line) ||
    Boolean(listMarker(line)?.interrupts)
  );
}

function heading(level: number, source: string): Block {
  const children = parseInline(source.trim());
  return {
    type: 'heading',
    level: level as HeadingLevel,
    id: '',
    text: plainText(children).trim(),
    children,
  };
}

function parseList(lines: string[], start: number, first: Marker): { block: Block; next: number } {
  const items: Block[][] = [];
  let loose = false;
  let index = start;

  while (index < lines.length) {
    const marker = listMarker(lines[index] ?? '');
    if (!marker || marker.ordered !== first.ordered || marker.delimiter !== first.delimiter) break;

    const itemLines = [marker.content];
    let afterBlank = false;
    index += 1;
    while (index < lines.length) {
      const line = lines[index] ?? '';
      if (isBlank(line)) {
        itemLines.push('');
        afterBlank = true;
      } else if (leadingSpaces(line) >= marker.contentIndent) {
        itemLines.push(line.slice(marker.contentIndent));
        afterBlank = false;
      } else if (!afterBlank && !interruptsParagraph(line) && !listMarker(line)) {
        // A lazy continuation line: the paragraph carries on without indenting.
        itemLines.push(line.trim());
      } else {
        break;
      }
      index += 1;
    }

    let trailingBlanks = 0;
    while (itemLines.length > 0 && itemLines[itemLines.length - 1] === '') {
      itemLines.pop();
      trailingBlanks += 1;
    }
    const blocks = parseBlocks(itemLines);
    if (itemLines.includes('') && blocks.length > 1) loose = true;
    items.push(blocks);

    if (trailingBlanks > 0) {
      const next = listMarker(lines[index] ?? '');
      if (!next || next.ordered !== first.ordered || next.delimiter !== first.delimiter) break;
      loose = true;
    }
  }

  return { block: { type: 'list', ordered: first.ordered, start: first.start, loose, items }, next: index };
}

function parseBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? '';
    if (isBlank(line)) {
      index += 1;
      continue;
    }

    const atx = ATX_HEADING.exec(line);
    if (atx) {
      blocks.push(heading(atx[1]?.length ?? 1, atx[2] ?? ''));
      index += 1;
      continue;
    }

    if (RULE.test(line)) {
      blocks.push({ type: 'rule' });
      index += 1;
      continue;
    }

    if (BLOCKQUOTE.test(line)) {
      const quoted: string[] = [];
      while (index < lines.length && !isBlank(lines[index] ?? '')) {
        const current = lines[index] ?? '';
        const quote = BLOCKQUOTE.exec(current);
        if (quote) quoted.push(quote[1] ?? '');
        else if (!interruptsParagraph(current)) quoted.push(current.trim());
        else break;
        index += 1;
      }
      blocks.push({ type: 'blockquote', children: parseBlocks(quoted) });
      continue;
    }

    const marker = listMarker(line);
    if (marker) {
      const { block, next } = parseList(lines, index, marker);
      blocks.push(block);
      index = next;
      continue;
    }

    // A paragraph runs until a blank line or another block. An underline of = or - makes it a heading.
    const paragraph = [line.trimStart()];
    let setextLevel = 0;
    index += 1;
    while (index < lines.length) {
      const current = lines[index] ?? '';
      if (isBlank(current)) break;
      const underline = SETEXT_UNDERLINE.exec(current);
      if (underline) {
        setextLevel = underline[1]?.startsWith('=') ? 1 : 2;
        index += 1;
        break;
      }
      if (interruptsParagraph(current)) break;
      paragraph.push(current.trimStart());
      index += 1;
    }
    blocks.push(
      setextLevel
        ? heading(setextLevel, paragraph.join(' '))
        : { type: 'paragraph', children: parseInline(paragraph.join('\n').trimEnd()) },
    );
  }

  return blocks;
}

/** "What we collect" → "what-we-collect", for heading anchors. */
function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section'
  );
}

/** Gives every heading a unique id, so sections can be linked to. */
function assignHeadingIds(blocks: Block[], used: Map<string, number>) {
  for (const block of blocks) {
    if (block.type === 'heading') {
      const slug = slugify(block.text);
      const count = used.get(slug) ?? 0;
      used.set(slug, count + 1);
      block.id = count === 0 ? slug : `${slug}-${count + 1}`;
    } else if (block.type === 'blockquote') {
      assignHeadingIds(block.children, used);
    } else if (block.type === 'list') {
      for (const item of block.items) assignHeadingIds(item, used);
    }
  }
}

/** Reads a Markdown document into blocks. */
export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
  const blocks = parseBlocks(lines);
  assignHeadingIds(blocks, new Map());
  return blocks;
}

// ── Links ────────────────────────────────────────────────────────────────────────────────────────────

const SAFE_SCHEMES = new Set(['http', 'https', 'mailto', 'tel']);

export type LinkTarget =
  { kind: 'internal'; to: string } | { kind: 'external'; href: string } | { kind: 'plain'; href: string };

/**
 * Where a link goes: a page on this site (opened by the router), another site, or an email address,
 * phone number or anchor. Anything else, such as `javascript:`, returns null and shows as text.
 */
export function linkTarget(href: string, siteUrl?: string): LinkTarget | null {
  // Browsers ignore whitespace and control characters in a URL, so "java\tscript:" is still a script.
  // eslint-disable-next-line no-control-regex
  const cleaned = href.replace(/[\u0000- \u007f]/g, '');
  if (!cleaned) return null;

  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(cleaned)?.[1]?.toLowerCase();
  if (scheme && !SAFE_SCHEMES.has(scheme)) return null;

  if (scheme === 'http' || scheme === 'https') {
    let url: URL;
    try {
      url = new URL(cleaned);
    } catch {
      return null;
    }
    // A full link to one of our own pages still opens in place, through the router.
    if (siteUrl && url.host === new URL(siteUrl).host) {
      return { kind: 'internal', to: `${url.pathname}${url.search}${url.hash}` };
    }
    return { kind: 'external', href: url.href };
  }
  if (scheme) return { kind: 'plain', href: cleaned };
  if (cleaned.startsWith('/') && !cleaned.startsWith('//')) return { kind: 'internal', to: cleaned };
  if (cleaned.startsWith('//')) return { kind: 'external', href: `https:${cleaned}` };
  return { kind: 'plain', href: cleaned };
}
