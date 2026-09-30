import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router';
import { env } from '@/lib/env';
import { cn } from '@/lib/cn';
import { linkTarget, parseMarkdown, type Block, type Inline } from './markdown';

const LINK_CLASSES =
  'font-medium text-primary underline decoration-primary/35 underline-offset-4 transition-colors duration-120 hover:decoration-primary';

const HEADING_CLASSES: Record<number, string> = {
  1: 'headline mt-14 text-3xl font-medium sm:text-4xl',
  2: 'headline mt-12 text-2xl font-medium sm:text-3xl',
  3: 'mt-10 text-xl font-semibold',
  4: 'mt-8 text-lg font-semibold',
  5: 'mt-6 text-base font-semibold',
  6: 'mt-6 text-sm font-semibold uppercase',
};

function MarkdownLink({ href, title, children }: { href: string; title?: string; children: ReactNode }) {
  const target = linkTarget(href, env.siteUrl);
  // Unsafe links (javascript: and the like) keep their words and lose the link.
  if (!target) return <>{children}</>;
  if (target.kind === 'internal') {
    return (
      <Link to={target.to} title={title} className={LINK_CLASSES}>
        {children}
      </Link>
    );
  }
  if (target.kind === 'external') {
    return (
      <a href={target.href} title={title} target="_blank" rel="noopener noreferrer" className={LINK_CLASSES}>
        {children}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  return (
    <a href={target.href} title={title} className={LINK_CLASSES}>
      {children}
    </a>
  );
}

function renderInline(nodes: Inline[], insideLink = false): ReactNode {
  return nodes.map((node, index) => {
    switch (node.type) {
      case 'text':
        // React escapes it, so any HTML in the source shows as text.
        return <Fragment key={index}>{node.value}</Fragment>;
      case 'break':
        return <br key={index} />;
      case 'code':
        return (
          <code key={index} className="rounded-inner bg-ink/5 px-1.5 py-0.5 font-mono text-sm text-ink">
            {node.value}
          </code>
        );
      case 'strong':
        return (
          <strong key={index} className="font-semibold text-ink">
            {renderInline(node.children, insideLink)}
          </strong>
        );
      case 'em':
        return <em key={index}>{renderInline(node.children, insideLink)}</em>;
      case 'link':
        // A link inside a link isn't valid HTML: the inner one keeps only its words.
        return insideLink ? (
          <Fragment key={index}>{renderInline(node.children, true)}</Fragment>
        ) : (
          <MarkdownLink key={index} href={node.href} title={node.title}>
            {renderInline(node.children, true)}
          </MarkdownLink>
        );
    }
  });
}

function renderBlocks(blocks: Block[], headingOffset: number, tight = false): ReactNode {
  return blocks.map((block, index) => {
    switch (block.type) {
      case 'heading': {
        const level = Math.min(6, block.level + headingOffset);
        const Heading = `h${level}` as 'h2';
        return (
          <Heading
            key={index}
            id={block.id}
            className={cn('scroll-mt-28 text-ink first:mt-0', HEADING_CLASSES[level])}
          >
            {renderInline(block.children)}
          </Heading>
        );
      }
      case 'paragraph':
        // A tight list item holds its text directly, without a paragraph around it.
        return tight ? (
          <Fragment key={index}>{renderInline(block.children)}</Fragment>
        ) : (
          <p key={index} className="mt-4 leading-relaxed first:mt-0">
            {renderInline(block.children)}
          </p>
        );
      case 'list': {
        const List = block.ordered ? 'ol' : 'ul';
        return (
          <List
            key={index}
            start={block.ordered && block.start !== 1 ? block.start : undefined}
            className={cn(
              'mt-4 grid gap-2 pl-6 first:mt-0',
              block.ordered
                ? 'list-decimal marker:font-medium marker:text-muted'
                : 'list-disc marker:text-primary',
            )}
          >
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} className="pl-1.5 leading-relaxed">
                {renderBlocks(item, headingOffset, !block.loose)}
              </li>
            ))}
          </List>
        );
      }
      case 'blockquote':
        return (
          <blockquote key={index} className="mt-6 border-l-2 border-primary/40 pl-5 text-muted first:mt-0">
            {renderBlocks(block.children, headingOffset)}
          </blockquote>
        );
      case 'rule':
        return <hr key={index} className="my-10 border-line" />;
    }
  });
}

interface MarkdownProps {
  /** The Markdown text, or blocks already read with `parseMarkdown`. */
  source: string | Block[];
  /**
   * Levels to add to each heading, so a document's `#` sits under the page's own h1: with 1, `#` renders as
   * an h2 (plan §12.7, a single h1 per page).
   */
  headingOffset?: number;
  className?: string;
}

/**
 * Renders Markdown as React elements, never as HTML strings, so text from the CMS can't inject markup or
 * scripts. Links to pages on this site go through the router; others open in a new tab.
 */
export function Markdown({ source, headingOffset = 0, className }: MarkdownProps) {
  const blocks = typeof source === 'string' ? parseMarkdown(source) : source;
  return <div className={cn('text-base text-ink/85', className)}>{renderBlocks(blocks, headingOffset)}</div>;
}
