import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AdminFaq, AdminHelpArticle, FaqInput } from '@/api/types';
import { Toaster } from '@/components/ui/toast';
import { mockApi, renderWithRouter } from '@/test/utils';
import { AdminHelpPage } from './help-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const render = (path = '/admin/help') =>
  renderWithRouter(
    [
      {
        path: '/admin/help',
        element: (
          <>
            <AdminHelpPage />
            <Toaster />
          </>
        ),
      },
    ],
    path,
  );

const json = (init: RequestInit | undefined) => JSON.parse(String(init?.body)) as unknown;
const dialog = async (name: string) => within(await screen.findByRole('dialog', { name }));

// FAQs -------------------------------------------------------------------------------------------------------

const cancelFaq: AdminFaq = {
  id: 'f1',
  question: 'Can I cancel a trip?',
  answer: 'Yes. The listing shows how much comes back, and when.',
  category: 'Booking',
  audience: 'GUEST',
  showOnHome: true,
  order: 0,
};
const payoutFaq: AdminFaq = {
  id: 'f2',
  question: 'When are Hosts paid?',
  answer: 'A few days after each trip ends.',
  category: 'Payments',
  audience: 'HOST',
  showOnHome: false,
  order: 1,
};

/** The FAQ API, keeping what's saved so the list refreshes as the backend's would. */
function mockFaqApi(
  overrides: Record<string, (init: RequestInit | undefined) => { status: number; body?: unknown }>,
) {
  let faqs = [cancelFaq, payoutFaq];
  mockApi({
    'GET /admin/content/faqs': () => ({ status: 200, body: { faqs } }),
    ...Object.fromEntries(
      Object.entries(overrides).map(([key, handler]) => [
        key,
        (init: RequestInit | undefined) => {
          const response = handler(init);
          const faq = (response.body as { faq?: AdminFaq } | undefined)?.faq;
          if (key.startsWith('POST') && faq) faqs = [...faqs, faq];
          if (key.startsWith('PUT') && faq) faqs = faqs.map((item) => (item.id === faq.id ? faq : item));
          if (key.startsWith('DELETE') && response.status === 204) {
            faqs = faqs.filter((item) => !key.endsWith(`/${item.id}`));
          }
          return response;
        },
      ]),
    ),
  });
}

const faqItem = async (question: string) => within(await screen.findByRole('listitem', { name: question }));

describe('AdminHelpPage: FAQs', () => {
  it('lists the questions by category, with who they’re for', async () => {
    mockFaqApi({});
    render();

    const booking = within(await screen.findByRole('region', { name: /^Booking/ }));
    const cancel = within(booking.getByRole('listitem', { name: 'Can I cancel a trip?' }));
    expect(cancel.getByText('For guests')).toBeInTheDocument();
    expect(cancel.getByText('On the homepage')).toBeInTheDocument();
    const payments = within(screen.getByRole('region', { name: /^Payments/ }));
    expect(payments.getByRole('listitem', { name: 'When are Hosts paid?' })).toHaveTextContent('For hosts');
  });

  it('adds a question', async () => {
    let sent: FaqInput | undefined;
    mockFaqApi({
      'POST /admin/content/faqs': (init) => {
        sent = json(init) as FaqInput;
        return { status: 201, body: { faq: { id: 'f3', ...sent } } };
      },
    });
    render();

    await userEvent.click(await screen.findByRole('button', { name: 'Add a question' }));
    const form = await dialog('Add a question');
    await userEvent.click(form.getByRole('button', { name: 'Add question' }));
    expect(await form.findByText('Write a question of at least 5 characters')).toBeInTheDocument();
    expect(form.getByText('Give it a category, like Booking')).toBeInTheDocument();
    expect(sent).toBeUndefined();

    await userEvent.type(form.getByLabelText('Question'), 'Can I bring my dog?');
    await userEvent.type(form.getByLabelText('Answer'), 'Only when the Host says pets are welcome.');
    await userEvent.click(
      within(form.getByRole('group', { name: 'Categories in use' })).getByRole('button', { name: 'Booking' }),
    );
    expect(form.getByLabelText('Category')).toHaveValue('Booking');
    expect(form.getByRole('radio', { name: 'Everyone' })).toBeChecked();
    await userEvent.click(form.getByRole('radio', { name: 'Guests' }));
    await userEvent.click(form.getByRole('switch', { name: 'Show on the homepage' }));
    await userEvent.click(form.getByRole('button', { name: 'Add question' }));

    expect(await screen.findByText('Question added')).toBeInTheDocument();
    expect(sent).toEqual({
      question: 'Can I bring my dog?',
      answer: 'Only when the Host says pets are welcome.',
      category: 'Booking',
      audience: 'GUEST',
      showOnHome: true,
      order: 0,
    });
    expect(await faqItem('Can I bring my dog?')).toBeTruthy();
  });

  it('edits a question, showing the API’s field errors beside the field', async () => {
    const sent: unknown[] = [];
    mockFaqApi({
      'PUT /admin/content/faqs/f1': (init) => {
        const body = json(init) as FaqInput;
        sent.push(body);
        if (sent.length === 1) {
          return {
            status: 400,
            body: {
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Check the highlighted fields.',
                fields: { answer: 'Say how much comes back.' },
              },
            },
          };
        }
        return { status: 200, body: { faq: { ...cancelFaq, ...body } } };
      },
    });
    render();

    await userEvent.click(
      (await faqItem('Can I cancel a trip?')).getByRole('button', { name: /^Edit the question/ }),
    );
    const form = await dialog('Edit the question');
    expect(form.getByLabelText('Question')).toHaveValue('Can I cancel a trip?');
    expect(form.getByRole('radio', { name: 'Guests' })).toBeChecked();
    expect(form.getByRole('switch', { name: 'Show on the homepage' })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    await userEvent.click(form.getByRole('button', { name: 'Save changes' }));
    expect(await form.findByText('Say how much comes back.')).toBeInTheDocument();
    expect(form.getByLabelText('Answer')).toHaveAttribute('aria-invalid', 'true');
    expect(form.queryByRole('alert')).not.toBeInTheDocument();

    const answer = form.getByLabelText('Answer');
    await userEvent.clear(answer);
    await userEvent.type(answer, 'Yes. You get it all back up to 48 hours before the trip.');
    await userEvent.click(form.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Question saved')).toBeInTheDocument();
    expect(sent[1]).toEqual({
      ...Object.fromEntries(Object.entries(cancelFaq).filter(([key]) => key !== 'id')),
      answer: 'Yes. You get it all back up to 48 hours before the trip.',
    });
    expect(
      await screen.findByText('Yes. You get it all back up to 48 hours before the trip.'),
    ).toBeInTheDocument();
  });

  it('deletes a question after asking', async () => {
    let deleted = false;
    mockFaqApi({
      'DELETE /admin/content/faqs/f2': () => {
        deleted = true;
        return { status: 204 };
      },
    });
    render();

    await userEvent.click(
      (await faqItem('When are Hosts paid?')).getByRole('button', { name: /^Delete the question/ }),
    );
    const confirm = await dialog('Delete this question?');
    expect(confirm.getByText(/“When are Hosts paid\?” comes off the FAQ pages/)).toBeInTheDocument();
    await userEvent.click(confirm.getByRole('button', { name: 'Delete question' }));

    expect(await screen.findByText('Question deleted')).toBeInTheDocument();
    expect(deleted).toBe(true);
    expect(screen.queryByRole('listitem', { name: 'When are Hosts paid?' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /^Payments/ })).not.toBeInTheDocument();
  });
});

// Help articles ----------------------------------------------------------------------------------------------

const refundsArticle: AdminHelpArticle = {
  id: 'h1',
  slug: 'getting-a-refund',
  title: 'Getting a refund',
  body: 'Refunds go back to the card you paid with, within 5 to 10 working days.',
  category: 'Payments',
  audience: 'GUEST',
  published: true,
  order: 0,
  updatedAt: '2026-10-01T22:00:00.000Z',
};
const draftArticle: AdminHelpArticle = {
  id: 'h2',
  slug: 'pricing-your-car',
  title: 'Pricing your car',
  body: 'Start near similar cars in your town, then adjust after your first few trips.',
  category: 'Hosting',
  audience: 'HOST',
  published: false,
  order: 0,
  updatedAt: '2026-10-02T22:00:00.000Z',
};

describe('AdminHelpPage: help articles', () => {
  it('lists published articles and drafts, linking to the published ones', async () => {
    mockApi({
      'GET /admin/content/help-articles': { status: 200, body: { articles: [refundsArticle, draftArticle] } },
    });
    render('/admin/help?tab=articles');

    const table = within(await screen.findByRole('table', { name: 'Help articles' }));
    const published = within(table.getByRole('row', { name: /Getting a refund/ }));
    expect(published.getByText('Published')).toBeInTheDocument();
    expect(published.getByText('/help/getting-a-refund')).toBeInTheDocument();
    expect(
      published.getByRole('link', { name: 'View Getting a refund (opens in a new tab)' }),
    ).toHaveAttribute('href', '/help/getting-a-refund');
    const draft = within(table.getByRole('row', { name: /Pricing your car/ }));
    expect(draft.getByText('Draft')).toBeInTheDocument();
    expect(draft.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows a web address another article uses beside the field, then adds the article', async () => {
    const sent: { slug: string }[] = [];
    let articles = [refundsArticle, draftArticle];
    mockApi({
      'GET /admin/content/help-articles': () => ({ status: 200, body: { articles } }),
      'POST /admin/content/help-articles': (init) => {
        const body = json(init) as AdminHelpArticle;
        sent.push(body);
        if (body.slug === 'getting-a-refund') {
          return {
            status: 409,
            body: {
              error: { code: 'SLUG_TAKEN', message: 'Another article already uses that web address.' },
            },
          };
        }
        const article = { ...body, id: 'h3', updatedAt: '2026-10-08T01:00:00.000Z' };
        articles = [...articles, article];
        return { status: 201, body: { article } };
      },
    });
    render('/admin/help?tab=articles');

    await userEvent.click(await screen.findByRole('button', { name: 'Add an article' }));
    const form = await dialog('Add a help article');
    // The address follows the title until it's changed by hand.
    await userEvent.type(form.getByLabelText('Title'), 'Getting a refund');
    expect(form.getByLabelText('Web address')).toHaveValue('getting-a-refund');
    await userEvent.type(
      form.getByLabelText('Article'),
      'If a Host cancels, the whole booking comes back to your card.',
    );
    await userEvent.type(form.getByLabelText('Category'), 'Payments');
    await userEvent.click(form.getByRole('button', { name: 'Add article' }));

    expect(await form.findByText('Another article already uses that web address.')).toBeInTheDocument();
    expect(form.getByLabelText('Web address')).toHaveAttribute('aria-invalid', 'true');
    expect(form.queryByRole('alert')).not.toBeInTheDocument();

    await userEvent.clear(form.getByLabelText('Web address'));
    await userEvent.type(form.getByLabelText('Web address'), 'refunds-when-a-host-cancels');
    await userEvent.click(form.getByRole('button', { name: 'Add article' }));

    expect(await screen.findByText('Getting a refund added')).toBeInTheDocument();
    expect(sent[1]).toEqual({
      slug: 'refunds-when-a-host-cancels',
      title: 'Getting a refund',
      body: 'If a Host cancels, the whole booking comes back to your card.',
      category: 'Payments',
      audience: 'ALL',
      published: true,
      order: 0,
    });
    expect(await screen.findByText('/help/refunds-when-a-host-cancels')).toBeInTheDocument();
  });
});

describe('AdminHelpPage: tabs', () => {
  it('opens on the FAQs and keeps the tab in the address', async () => {
    mockApi({
      'GET /admin/content/faqs': { status: 200, body: { faqs: [] } },
      'GET /admin/content/help-articles': { status: 200, body: { articles: [] } },
    });
    const { router } = render();

    expect(await screen.findByRole('heading', { level: 1, name: 'FAQs & help' })).toBeInTheDocument();
    expect(await screen.findByText('No questions yet')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Help articles' }));

    expect(router.state.location.search).toBe('?tab=articles');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'help-tab-articles');
    expect(await screen.findByRole('button', { name: 'Add an article' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'FAQs' }));
    expect(router.state.location.search).toBe('');
  });
});
