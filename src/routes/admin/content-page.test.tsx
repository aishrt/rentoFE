import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  AdminDestination,
  AdminFaq,
  AdminHelpArticle,
  AdminVehicleChoice,
  FaqInput,
  LegalPage,
} from '@/api/types';
import { Toaster } from '@/components/ui/toast';
import { mockApi, renderWithRouter } from '@/test/utils';
import { AdminContentPage } from './content-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const render = (path = '/admin/content') =>
  renderWithRouter(
    [
      {
        path: '/admin/content',
        element: (
          <>
            <AdminContentPage />
            <Toaster />
          </>
        ),
      },
    ],
    path,
  );

const json = (init: RequestInit | undefined) => JSON.parse(String(init?.body)) as unknown;
const dialog = async (name: string) => within(await screen.findByRole('dialog', { name }));

// Featured cars ----------------------------------------------------------------------------------------------

const corolla: AdminVehicleChoice = {
  id: 'v1',
  title: '2021 Toyota Corolla',
  city: 'Auckland',
  status: 'ACTIVE',
  live: true,
};
const rav4: AdminVehicleChoice = {
  id: 'v2',
  title: '2022 Toyota RAV4',
  city: 'Queenstown',
  status: 'ACTIVE',
  live: true,
};
const leaf: AdminVehicleChoice = {
  id: 'v3',
  title: '2020 Nissan Leaf',
  city: 'Wellington',
  status: 'INACTIVE',
  live: false,
};
const swift: AdminVehicleChoice = {
  id: 'v4',
  title: '2023 Suzuki Swift',
  city: 'Christchurch',
  status: 'ACTIVE',
  live: true,
};
const allCars = [corolla, rav4, leaf, swift];

const order = (list: HTMLElement) =>
  within(list)
    .getAllByRole('listitem')
    .map((item) => item.getAttribute('aria-label'));

describe('AdminContentPage: featured cars', () => {
  it('lists the chosen cars in order and flags one that isn’t in search', async () => {
    mockApi({
      'GET /admin/content/featured-vehicles': {
        status: 200,
        body: { vehicleIds: ['v1', 'v2', 'v3'], vehicles: [corolla, rav4, leaf] },
      },
      'GET /admin/content/vehicles': { status: 200, body: { vehicles: [corolla, swift] } },
    });
    render();

    const list = await screen.findByRole('list', { name: 'Featured cars' });
    expect(order(list)).toEqual(['2021 Toyota Corolla', '2022 Toyota RAV4', '2020 Nissan Leaf']);
    expect(screen.getByText('3 of 8 chosen')).toBeInTheDocument();
    const notLive = within(within(list).getByRole('listitem', { name: '2020 Nissan Leaf' }));
    expect(notLive.getByText('Not in search now, so it’s left off the homepage')).toBeInTheDocument();
    expect(notLive.getByText('Live, switched off')).toBeInTheDocument();
    expect(
      screen.getByText(/With none chosen, the homepage shows the best-rated live cars/),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Featured cars' })).toHaveAttribute('aria-selected', 'true');

    // A car already chosen is marked in the search results rather than offered again.
    const results = await screen.findByRole('list', { name: 'Live cars to add' });
    expect(within(results).getByRole('listitem', { name: '2021 Toyota Corolla' })).toHaveTextContent('Added');
    expect(within(results).getByRole('button', { name: 'Add 2023 Suzuki Swift' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Save featured cars' })).toBeDisabled();
  });

  it('saves the cars in a new order, with one removed and one found by searching', async () => {
    let sent: unknown;
    const fetchMock = mockApi({
      'GET /admin/content/featured-vehicles': {
        status: 200,
        body: { vehicleIds: ['v1', 'v2', 'v3'], vehicles: [corolla, rav4, leaf] },
      },
      'GET /admin/content/vehicles': { status: 200, body: { vehicles: [corolla, swift] } },
      'PUT /admin/content/featured-vehicles': (init) => {
        sent = json(init);
        const { vehicleIds } = sent as { vehicleIds: string[] };
        return {
          status: 200,
          body: { vehicleIds, vehicles: vehicleIds.map((id) => allCars.find((car) => car.id === id)) },
        };
      },
    });
    render();

    const list = await screen.findByRole('list', { name: 'Featured cars' });
    await userEvent.click(screen.getByRole('button', { name: 'Move 2022 Toyota RAV4 up' }));
    await userEvent.click(screen.getByRole('button', { name: 'Remove 2020 Nissan Leaf' }));
    await userEvent.type(screen.getByLabelText('Find a live car'), 'swift');
    expect(await screen.findByText('Live cars matching “swift”')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add 2023 Suzuki Swift' }));
    expect(order(list)).toEqual(['2022 Toyota RAV4', '2021 Toyota Corolla', '2023 Suzuki Swift']);

    await userEvent.click(screen.getByRole('button', { name: 'Save featured cars' }));

    expect(await screen.findByText('Featured cars saved')).toBeInTheDocument();
    expect(sent).toEqual({ vehicleIds: ['v2', 'v1', 'v4'] });
    expect(order(screen.getByRole('list', { name: 'Featured cars' }))).toEqual([
      '2022 Toyota RAV4',
      '2021 Toyota Corolla',
      '2023 Suzuki Swift',
    ]);
    expect(screen.getByRole('button', { name: 'Save featured cars' })).toBeDisabled();
    const searched = fetchMock.mock.calls.map(([input]) => String((input as Request).url));
    expect(searched.some((url) => url.includes('/admin/content/vehicles?q=swift'))).toBe(true);
  });

  it('shows an error with a way to try again', async () => {
    mockApi({
      'GET /admin/content/featured-vehicles': {
        status: 403,
        body: { error: { code: 'FORBIDDEN', message: "Your account can't do this." } },
      },
      'GET /admin/content/vehicles': { status: 200, body: { vehicles: [] } },
    });
    render();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We couldn’t load the featured cars');
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

// Legal pages ------------------------------------------------------------------------------------------------

const terms: LegalPage = {
  key: 'legal.terms',
  version: '2026-09',
  title: 'Terms and conditions',
  markdown: '# Terms\n\nThese terms apply to every booking on Rento Vroom.',
  updatedAt: '2026-09-20T21:00:00.000Z',
};
const privacy: LegalPage = {
  key: 'legal.privacy',
  version: '2026-09',
  title: 'Privacy policy',
  markdown: '# Privacy\n\nWe keep your details safe and use them only to run Rento Vroom.',
  updatedAt: '2026-09-20T21:00:00.000Z',
};

describe('AdminContentPage: legal pages', () => {
  it('corrects a legal page’s wording, keeping its version', async () => {
    let sent: unknown;
    mockApi({
      'GET /admin/content/legal': { status: 200, body: { pages: [terms, privacy] } },
      'PUT /admin/content/legal/legal.terms': (init) => {
        sent = json(init);
        return {
          status: 200,
          body: { page: { ...terms, ...(sent as object), updatedAt: '2026-10-08T01:00:00.000Z' } },
        };
      },
    });
    const { router } = render('/admin/content?tab=legal');

    const table = within(await screen.findByRole('table', { name: 'Legal pages' }));
    expect(screen.getByRole('tab', { name: 'Legal pages' })).toHaveAttribute('aria-selected', 'true');
    expect(router.state.location.search).toBe('?tab=legal');
    expect(table.getByRole('row', { name: /Privacy policy/ })).toBeInTheDocument();
    expect(
      table.getByRole('link', { name: 'View the terms and conditions (opens in a new tab)' }),
    ).toHaveAttribute('href', '/terms');
    expect(screen.getByText(/keeps the version members accepted/)).toBeInTheDocument();

    await userEvent.click(table.getByRole('button', { name: 'Edit the terms and conditions' }));
    const editor = await dialog('Edit the terms and conditions');
    expect(editor.getByText(/Version 2026-09 stays the same/)).toBeInTheDocument();

    const text = editor.getByLabelText('Text');
    await userEvent.clear(text);
    await userEvent.type(text, 'Too short');
    await userEvent.click(editor.getByRole('button', { name: 'Save changes' }));
    expect(await editor.findByText('Write at least 20 characters')).toBeInTheDocument();
    expect(sent).toBeUndefined();

    await userEvent.clear(text);
    await userEvent.type(text, '# Terms of use\n\nThese terms apply to every trip booked on Rento Vroom.');
    await userEvent.clear(editor.getByLabelText('Title'));
    await userEvent.type(editor.getByLabelText('Title'), 'Terms of use');
    await userEvent.click(editor.getByRole('button', { name: 'Preview' }));
    expect(editor.getByRole('region', { name: 'Preview of text' })).toHaveTextContent('Terms of use');
    await userEvent.click(editor.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Terms and conditions saved')).toBeInTheDocument();
    expect(sent).toEqual({
      title: 'Terms of use',
      markdown: '# Terms of use\n\nThese terms apply to every trip booked on Rento Vroom.',
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(table.getByText('Terms of use')).toBeInTheDocument();
  });
});

// Destinations -----------------------------------------------------------------------------------------------

const auckland: AdminDestination = {
  slug: 'auckland',
  city: 'Auckland',
  maoriName: 'Tāmaki Makaurau',
  region: 'Auckland',
  tagline: 'The city of sails',
  intro: 'Harbours, beaches and islands, all within an easy drive of the city centre.',
  heroImage: 'https://images.example/auckland.jpg',
  featured: true,
  order: 1,
};
const queenstown: AdminDestination = {
  slug: 'queenstown',
  city: 'Queenstown',
  region: 'Otago',
  intro: 'Mountains, lakes and the Remarkables, with the best views from the road.',
  heroImage: 'https://images.example/queenstown.jpg',
  featured: false,
  order: 5,
};

describe('AdminContentPage: destinations', () => {
  it('edits a destination page, sending only what changed', async () => {
    let destinations = [auckland, queenstown];
    let sent: unknown;
    mockApi({
      'GET /admin/content/destinations': () => ({ status: 200, body: { destinations } }),
      'PATCH /admin/content/destinations/queenstown': (init) => {
        sent = json(init);
        const destination = { ...queenstown, ...(sent as object) };
        destinations = [auckland, destination];
        return { status: 200, body: { destination } };
      },
    });
    render('/admin/content?tab=destinations');

    const table = within(await screen.findByRole('table', { name: 'Destinations' }));
    const aucklandRow = within(table.getByRole('row', { name: /Tāmaki Makaurau/ }));
    expect(aucklandRow.getByText('Featured')).toBeInTheDocument();
    expect(
      aucklandRow.getByRole('link', { name: 'View the Auckland page (opens in a new tab)' }),
    ).toHaveAttribute('href', '/rental/auckland');
    expect(within(table.getByRole('row', { name: /Otago/ })).getByText('Not featured')).toBeInTheDocument();

    await userEvent.click(table.getByRole('button', { name: 'Edit Queenstown' }));
    const editor = await dialog('Edit Queenstown');
    const picture = editor.getByLabelText('Picture');
    await userEvent.clear(picture);
    await userEvent.click(editor.getByRole('button', { name: 'Save changes' }));
    expect(
      await editor.findByText('Enter the picture’s web address: this page keeps one'),
    ).toBeInTheDocument();
    await userEvent.type(picture, 'queenstown.jpg');
    expect(await editor.findByText('Enter a full web address, starting with https://')).toBeInTheDocument();
    await userEvent.clear(picture);
    await userEvent.type(picture, 'https://images.example/queenstown-lake.jpg');

    await userEvent.type(editor.getByLabelText('Tagline (optional)'), 'Adventure on the lake');
    await userEvent.click(editor.getByRole('switch', { name: 'Featured on the homepage' }));
    await userEvent.clear(editor.getByLabelText('Order'));
    await userEvent.type(editor.getByLabelText('Order'), '2');
    await userEvent.click(editor.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Queenstown saved')).toBeInTheDocument();
    expect(sent).toEqual({
      tagline: 'Adventure on the lake',
      heroImage: 'https://images.example/queenstown-lake.jpg',
      featured: true,
      order: 2,
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      await within(screen.getByRole('row', { name: /Otago/ })).findByText('Featured'),
    ).toBeInTheDocument();
  });
});

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

describe('AdminContentPage: FAQs', () => {
  it('lists the questions by category, with who they’re for', async () => {
    mockFaqApi({});
    render('/admin/content?tab=faqs');

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
    render('/admin/content?tab=faqs');

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
    render('/admin/content?tab=faqs');

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
    render('/admin/content?tab=faqs');

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

describe('AdminContentPage: help articles', () => {
  it('lists published articles and drafts, linking to the published ones', async () => {
    mockApi({
      'GET /admin/content/help-articles': { status: 200, body: { articles: [refundsArticle, draftArticle] } },
    });
    render('/admin/content?tab=help');

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
    render('/admin/content?tab=help');

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

describe('AdminContentPage: tabs', () => {
  it('keeps the tab in the address', async () => {
    mockApi({
      'GET /admin/content/featured-vehicles': { status: 200, body: { vehicleIds: [], vehicles: [] } },
      'GET /admin/content/vehicles': { status: 200, body: { vehicles: [] } },
      'GET /admin/content/faqs': { status: 200, body: { faqs: [] } },
    });
    const { router } = render();

    expect(
      await screen.findByText('No cars chosen, so the homepage shows the best-rated live cars.'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'FAQs' }));

    expect(await screen.findByText('No questions yet')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?tab=faqs');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'content-tab-faqs');
  });
});
