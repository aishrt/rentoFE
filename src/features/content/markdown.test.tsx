import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { linkTarget, parseInline, parseMarkdown } from './markdown';
import { Markdown } from './markdown-view';

const renderMarkdown = (source: string, headingOffset = 0) =>
  renderWithProviders(<Markdown source={source} headingOffset={headingOffset} />);

describe('parseMarkdown', () => {
  it('reads headings, paragraphs, lists, quotes and rules into blocks', () => {
    const blocks = parseMarkdown(
      ['# Title', '', 'First line', 'same paragraph.', '', '- one', '- two', '', '> quoted', '', '---'].join(
        '\n',
      ),
    );

    expect(blocks.map((block) => block.type)).toEqual(['heading', 'paragraph', 'list', 'blockquote', 'rule']);
    expect(blocks[1]).toEqual({
      type: 'paragraph',
      children: [{ type: 'text', value: 'First line same paragraph.' }],
    });
  });

  it('gives headings unique ids for anchors', () => {
    const ids = parseMarkdown('## What we collect\n\n## What we collect\n\n## Tēnā koe!').flatMap((block) =>
      block.type === 'heading' ? [block.id] : [],
    );
    expect(ids).toEqual(['what-we-collect', 'what-we-collect-2', 'tena-koe']);
  });

  it('keeps underscores inside words and unmatched stars as text', () => {
    expect(parseInline('snake_case_name and 2 * 3')).toEqual([
      { type: 'text', value: 'snake_case_name and 2 * 3' },
    ]);
  });

  it('reads escaped characters literally', () => {
    expect(parseInline('\\*not italic\\*')).toEqual([{ type: 'text', value: '*not italic*' }]);
  });
});

describe('linkTarget', () => {
  it('sends site paths and full links to our own site through the router', () => {
    expect(linkTarget('/privacy')).toEqual({ kind: 'internal', to: '/privacy' });
    expect(linkTarget('https://www.rentovroom.com/terms#fees', 'https://www.rentovroom.com')).toEqual({
      kind: 'internal',
      to: '/terms#fees',
    });
  });

  it('refuses script and data links, however they are disguised', () => {
    expect(linkTarget('javascript:alert(1)')).toBeNull();
    expect(linkTarget('JaVaScRiPt:alert(1)')).toBeNull();
    expect(linkTarget('java\tscript:alert(1)')).toBeNull();
    expect(linkTarget(' data:text/html;base64,PHNjcmlwdD4=')).toBeNull();
    expect(linkTarget('vbscript:msgbox')).toBeNull();
  });

  it('keeps email and phone links as plain links', () => {
    expect(linkTarget('mailto:privacy@rentovroom.com')).toEqual({
      kind: 'plain',
      href: 'mailto:privacy@rentovroom.com',
    });
    expect(linkTarget('tel:111')).toEqual({ kind: 'plain', href: 'tel:111' });
  });
});

describe('Markdown', () => {
  it('renders headings one level down, under the page’s own h1', async () => {
    renderMarkdown('# Section\n\n## Subsection\n\n###### Deepest', 1);

    expect(await screen.findByRole('heading', { level: 2, name: 'Section' })).toHaveAttribute(
      'id',
      'section',
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Subsection' })).toBeInTheDocument();
    // Never deeper than h6.
    expect(screen.getByRole('heading', { level: 6, name: 'Deepest' })).toBeInTheDocument();
  });

  it('renders bold, italic, inline code and line breaks', async () => {
    const { container } = renderMarkdown('Some **bold**, *italic*, ***both*** and `code`.  \nNext line');

    expect(await screen.findByText('bold', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('italic', { selector: 'em' })).toBeInTheDocument();
    expect(screen.getByText('both', { selector: 'strong > em' })).toBeInTheDocument();
    expect(screen.getByText('code', { selector: 'code' })).toBeInTheDocument();
    expect(container.querySelector('p br')).not.toBeNull();
  });

  it('renders bullet, numbered and nested lists', async () => {
    renderMarkdown(['3. Third', '4. Fourth', '   - nested', '', 'After'].join('\n'));

    const lists = await screen.findAllByRole('list');
    const numbered = lists[0]!;
    expect(numbered.tagName).toBe('OL');
    expect(numbered).toHaveAttribute('start', '3');
    const items = within(numbered).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Third');
    expect(within(items[1]!).getByRole('list').tagName).toBe('UL');
    expect(within(items[1]!).getByRole('listitem')).toHaveTextContent('nested');
    expect(screen.getByText('After', { selector: 'p' })).toBeInTheDocument();
  });

  it('renders blockquotes and horizontal rules', async () => {
    const { container } = renderMarkdown('> A quote with **weight**\n\n***\n\nEnd');

    expect(await screen.findByText(/A quote with/, { selector: 'blockquote p' })).toBeInTheDocument();
    expect(container.querySelector('hr')).not.toBeNull();
  });

  it('opens site links in place through the router, and other sites in a new tab', async () => {
    renderMarkdown('Read the [Privacy policy](/privacy) or [the Act](https://www.legislation.govt.nz/).');

    const internal = await screen.findByRole('link', { name: 'Privacy policy' });
    expect(internal).toHaveAttribute('href', '/privacy');
    expect(internal).not.toHaveAttribute('target');

    const external = screen.getByRole('link', { name: /the Act/ });
    expect(external).toHaveAttribute('href', 'https://www.legislation.govt.nz/');
    expect(external).toHaveAttribute('target', '_blank');
    expect(external).toHaveAttribute('rel', 'noopener noreferrer');
    expect(external).toHaveTextContent('(opens in a new tab)');
  });

  it('keeps the words of an unsafe link but drops the link', async () => {
    renderMarkdown('[Click me](javascript:alert(1)) please');

    expect(await screen.findByText(/Click me please/)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows raw HTML as text instead of running it', async () => {
    const { container } = renderMarkdown(
      'Before <script>alert("x")</script> <img src=x onerror="alert(1)"> <b>bold?</b>\n\n<div>block</div>',
    );

    expect(await screen.findByText(/<script>alert\("x"\)<\/script>/)).toBeInTheDocument();
    expect(screen.getByText(/<b>bold\?<\/b>/)).toBeInTheDocument();
    expect(screen.getByText('<div>block</div>')).toBeInTheDocument();
    expect(container.querySelector('script, img, b')).toBeNull();
  });
});
