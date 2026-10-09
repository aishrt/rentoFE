import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  AdminDestination,
  AdminFaq,
  AdminHelpArticle,
  AdminReviewChoice,
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
  lat: -36.8485,
  lng: 174.7633,
  airports: ['AKL'],
  featured: true,
  order: 1,
  published: true,
};
const queenstown: AdminDestination = {
  slug: 'queenstown',
  city: 'Queenstown',
  region: 'Otago',
  intro: 'Mountains, lakes and the Remarkables, with the best views from the road.',
  heroImage: 'https://images.example/queenstown.jpg',
  lat: -45.0312,
  lng: 168.6626,
  airports: ['ZQN'],
  featured: false,
  order: 5,
  published: true,
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
    expect(aucklandRow.getByText('Published')).toBeInTheDocument();
    expect(
      aucklandRow.getByRole('link', { name: 'View the Auckland page (opens in a new tab)' }),
    ).toHaveAttribute('href', '/rental/auckland');
    expect(within(table.getByRole('row', { name: /Otago/ })).getByText('Not featured')).toBeInTheDocument();

    await userEvent.click(table.getByRole('button', { name: 'Edit Queenstown' }));
    const editor = await dialog('Edit Queenstown');
    expect(editor.getByText('/rental/queenstown')).toBeInTheDocument();
    expect(editor.getByLabelText('Airports (optional)')).toHaveValue('ZQN');
    const picture = editor.getByLabelText('Picture (optional)');
    await userEvent.clear(picture);
    await userEvent.type(picture, 'queenstown.jpg');
    await userEvent.clear(editor.getByLabelText('Latitude'));
    await userEvent.type(editor.getByLabelText('Latitude'), '-12');
    await userEvent.click(editor.getByRole('button', { name: 'Save changes' }));
    expect(
      await editor.findByText(
        'Use a full address starting with https://, or a path on this website starting with /',
      ),
    ).toBeInTheDocument();
    expect(editor.getByText('Enter a latitude in New Zealand, between -48 and -34')).toBeInTheDocument();
    await userEvent.clear(picture);
    await userEvent.type(picture, 'https://images.example/queenstown-lake.jpg');
    await userEvent.clear(editor.getByLabelText('Latitude'));
    await userEvent.type(editor.getByLabelText('Latitude'), '-45.03');

    await userEvent.type(editor.getByLabelText('Tagline (optional)'), 'Adventure on the lake');
    await userEvent.click(editor.getByRole('switch', { name: 'Featured on the homepage' }));
    await userEvent.clear(editor.getByLabelText('Order'));
    await userEvent.type(editor.getByLabelText('Order'), '2');
    await userEvent.click(editor.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Queenstown saved')).toBeInTheDocument();
    // The place is one point, so both numbers go together.
    expect(sent).toEqual({
      tagline: 'Adventure on the lake',
      heroImage: 'https://images.example/queenstown-lake.jpg',
      lat: -45.03,
      lng: 168.6626,
      featured: true,
      order: 2,
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      await within(screen.getByRole('row', { name: /Otago/ })).findByText('Featured'),
    ).toBeInTheDocument();
  });

  it('unpublishes a page and removes its picture', async () => {
    let destinations = [auckland, queenstown];
    let sent: unknown;
    mockApi({
      'GET /admin/content/destinations': () => ({ status: 200, body: { destinations } }),
      'PATCH /admin/content/destinations/auckland': (init) => {
        sent = json(init);
        const { heroImage: _removed, ...rest } = auckland;
        const destination = { ...rest, published: false };
        destinations = [destination, queenstown];
        return { status: 200, body: { destination } };
      },
    });
    render('/admin/content?tab=destinations');

    const table = within(await screen.findByRole('table', { name: 'Destinations' }));
    await userEvent.click(table.getByRole('button', { name: 'Edit Auckland' }));
    const editor = await dialog('Edit Auckland');
    await userEvent.clear(editor.getByLabelText('Picture (optional)'));
    await userEvent.click(editor.getByRole('switch', { name: 'Published' }));
    await userEvent.click(editor.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Auckland saved')).toBeInTheDocument();
    expect(screen.getByText('It’s unpublished, so the website doesn’t show it.')).toBeInTheDocument();
    expect(sent).toEqual({ heroImage: '', published: false });
    const row = within(screen.getByRole('row', { name: /Tāmaki Makaurau/ }));
    expect(await row.findByText('Unpublished')).toBeInTheDocument();
    // An unpublished page has nothing to view.
    expect(row.queryByRole('link', { name: /View the Auckland page/ })).not.toBeInTheDocument();
  });

  it('adds a destination, with its web address from the name, and says when the address is taken', async () => {
    const sent: unknown[] = [];
    let destinations = [auckland];
    mockApi({
      'GET /admin/content/destinations': () => ({ status: 200, body: { destinations } }),
      'POST /admin/content/destinations': (init) => {
        const body = json(init) as Omit<AdminDestination, 'published'> & { published: boolean };
        sent.push(body);
        if (sent.length === 1) {
          return {
            status: 409,
            body: {
              error: { code: 'SLUG_TAKEN', message: 'Another destination already uses that web address.' },
            },
          };
        }
        destinations = [...destinations, body];
        return { status: 201, body: { destination: body } };
      },
    });
    render('/admin/content?tab=destinations');

    await userEvent.click(await screen.findByRole('button', { name: 'Add a destination' }));
    const form = await dialog('Add a destination');
    await userEvent.type(form.getByLabelText('Name'), 'Bay of Islands');
    expect(form.getByLabelText('Web address')).toHaveValue('bay-of-islands');
    await userEvent.type(form.getByLabelText('Māori name (optional)'), 'Pēwhairangi');
    await userEvent.click(form.getByRole('button', { name: /^Region/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Northland' }));
    await userEvent.type(
      form.getByLabelText('Introduction'),
      'A subtropical coast of 144 islands, with Paihia, Russell and Kerikeri close by.',
    );
    await userEvent.type(form.getByLabelText('Latitude'), '-35.28');
    await userEvent.type(form.getByLabelText('Longitude'), '174.09');
    await userEvent.type(form.getByLabelText('Airports (optional)'), 'kke, xx');
    await userEvent.click(form.getByRole('button', { name: 'Add destination' }));
    expect(
      await form.findByText('Use 3-letter airport codes, like AKL, separated by commas'),
    ).toBeInTheDocument();
    await userEvent.clear(form.getByLabelText('Airports (optional)'));
    await userEvent.type(form.getByLabelText('Airports (optional)'), 'kke');
    await userEvent.click(form.getByRole('button', { name: 'Add destination' }));

    expect(await form.findByRole('alert')).toHaveTextContent(
      'Another destination already uses that web address.',
    );
    await userEvent.clear(form.getByLabelText('Web address'));
    await userEvent.type(form.getByLabelText('Web address'), 'bay-of-islands-north');
    await userEvent.click(form.getByRole('button', { name: 'Add destination' }));

    expect(await screen.findByText('Bay of Islands added')).toBeInTheDocument();
    expect(sent[1]).toEqual({
      slug: 'bay-of-islands-north',
      city: 'Bay of Islands',
      maoriName: 'Pēwhairangi',
      region: 'Northland',
      intro: 'A subtropical coast of 144 islands, with Paihia, Russell and Kerikeri close by.',
      lat: -35.28,
      lng: 174.09,
      airports: ['KKE'],
      featured: false,
      order: 0,
      published: true,
    });
    expect(await screen.findByRole('row', { name: /Pēwhairangi/ })).toBeInTheDocument();
  });
});

// Homepage headline, customer reviews and footer links ------------------------------------------------------

const ORIGINAL_HERO = {
  headline: 'Rent a car from local owners across New Zealand.',
  subheading: 'City runabouts, family SUVs and EVs for the long way round, booked in minutes.',
};

describe('AdminContentPage: homepage headline', () => {
  it('shows the original text, and saves a new headline', async () => {
    let sent: unknown;
    mockApi({
      'GET /admin/content/hero': { status: 200, body: { hero: ORIGINAL_HERO, saved: false } },
      'PUT /admin/content/hero': (init) => {
        sent = json(init);
        return { status: 200, body: { hero: sent, saved: true } };
      },
    });
    render('/admin/content?tab=headline');

    expect(await screen.findByText('The original text')).toBeInTheDocument();
    // The tab panel is named after its tab, Headline, too.
    const headline = screen.getByRole('textbox', { name: 'Headline' });
    expect(headline).toHaveValue(ORIGINAL_HERO.headline);
    expect(screen.getByRole('button', { name: 'Save headline' })).toBeDisabled();

    await userEvent.clear(headline);
    await userEvent.type(headline, 'Short');
    await userEvent.click(screen.getByRole('button', { name: 'Save headline' }));
    expect(await screen.findByText('Write a headline of at least 10 characters')).toBeInTheDocument();
    await userEvent.clear(headline);
    await userEvent.type(headline, 'Drive Aotearoa with a local’s car.');
    await userEvent.click(screen.getByRole('button', { name: 'Save headline' }));

    expect(await screen.findByText('Homepage headline saved')).toBeInTheDocument();
    expect(sent).toEqual({ ...ORIGINAL_HERO, headline: 'Drive Aotearoa with a local’s car.' });
    expect(screen.queryByText('The original text')).not.toBeInTheDocument();
  });
});

const review = (id: string, authorName: string, body: string, shown = true): AdminReviewChoice => ({
  id,
  authorName,
  overall: 5,
  body,
  vehicleTitle: '2021 Toyota Corolla',
  city: 'Auckland',
  createdAt: '2026-09-23T10:00:00.000Z',
  shown,
});
const nikau = review('r1', 'Nikau', 'Spotless car and an easy pick-up.');
const mere = review('r2', 'Mere', 'The Host met us at the airport.', false);
const tama = review('r3', 'Tama', 'Great value for a week away.');

describe('AdminContentPage: customer reviews', () => {
  it('picks reviews for the homepage in order, and says while too few are published to show any', async () => {
    let sent: unknown;
    mockApi({
      'GET /admin/content/featured-reviews': {
        status: 200,
        body: { reviewIds: ['r1', 'r2'], reviews: [nikau, mere], homepageThreshold: 10, publishedCount: 3 },
      },
      'GET /admin/content/reviews': { status: 200, body: { reviews: [nikau, tama] } },
      'PUT /admin/content/featured-reviews': (init) => {
        sent = json(init);
        const { reviewIds } = sent as { reviewIds: string[] };
        const all = [nikau, mere, tama];
        return {
          status: 200,
          body: {
            reviewIds,
            reviews: reviewIds.map((id) => all.find((choice) => choice.id === id)),
            homepageThreshold: 10,
            publishedCount: 3,
          },
        };
      },
    });
    render('/admin/content?tab=reviews');

    const list = await screen.findByRole('list', { name: 'Homepage reviews' });
    expect(order(list)).toEqual([
      'Nikau: Spotless car and an easy pick-up.',
      'Mere: The Host met us at the airport.',
    ]);
    expect(
      within(within(list).getByRole('listitem', { name: /^Mere/ })).getByText(
        'Hidden since it was picked, so it’s left off the homepage',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('The homepage isn’t showing reviews yet')).toBeInTheDocument();
    expect(
      screen.getByText(/It shows them once 10 reviews are published, and 3 are so far/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Change the number' })).toHaveAttribute(
      'href',
      '/admin/settings?tab=platform&section=reviewsAndTrips',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Remove Mere’s review' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Add Tama’s review' }));
    await userEvent.click(screen.getByRole('button', { name: 'Move Tama’s review up' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save homepage reviews' }));

    expect(await screen.findByText('Homepage reviews saved')).toBeInTheDocument();
    expect(sent).toEqual({ reviewIds: ['r3', 'r1'] });
  });
});

const ORIGINAL_FOOTER = {
  groups: [
    { title: 'Rent', links: [{ label: 'Browse cars', href: '/cars' }] },
    { title: 'Support', links: [{ label: 'Help centre', href: '/help' }] },
  ],
  socialLinks: [],
};

describe('AdminContentPage: footer links', () => {
  it('adds links and a social account, accepting only https:// addresses and paths on the website', async () => {
    let sent: unknown;
    mockApi({
      'GET /admin/content/footer': { status: 200, body: { footer: ORIGINAL_FOOTER, saved: false } },
      'PUT /admin/content/footer': (init) => {
        sent = json(init);
        return { status: 200, body: { footer: sent, saved: true } };
      },
    });
    render('/admin/content?tab=footer');

    expect(await screen.findByText('The original links')).toBeInTheDocument();
    const support = within(screen.getByRole('group', { name: 'Group 2' }));
    expect(support.getByLabelText('Heading')).toHaveValue('Support');
    await userEvent.click(support.getByRole('button', { name: 'Add a link' }));
    await userEvent.type(support.getByLabelText('Link 2 name'), 'Roadside help');
    await userEvent.type(support.getByLabelText('Link 2 address'), 'javascript:alert(1)');

    const social = within(screen.getByRole('group', { name: 'Social media' }));
    await userEvent.click(social.getByRole('button', { name: 'Add an account' }));
    await userEvent.type(social.getByLabelText('Account 1 name'), 'Instagram');
    await userEvent.type(social.getByLabelText('Account 1 address'), '/instagram');
    await userEvent.click(screen.getByRole('button', { name: 'Save footer links' }));

    expect(
      await support.findByText(
        'Use a full address starting with https://, or a path on this website starting with /',
      ),
    ).toBeInTheDocument();
    expect(social.getByText('Use a full address starting with https://')).toBeInTheDocument();

    await userEvent.clear(support.getByLabelText('Link 2 address'));
    await userEvent.type(support.getByLabelText('Link 2 address'), 'https://aa.co.nz/roadservice');
    await userEvent.click(support.getByRole('button', { name: 'Move link 2 up' }));
    await userEvent.clear(social.getByLabelText('Account 1 address'));
    await userEvent.type(social.getByLabelText('Account 1 address'), 'https://instagram.com/rentovroom');
    await userEvent.click(screen.getByRole('button', { name: 'Save footer links' }));

    expect(await screen.findByText('Footer links saved')).toBeInTheDocument();
    expect(sent).toEqual({
      groups: [
        { title: 'Rent', links: [{ label: 'Browse cars', href: '/cars' }] },
        {
          title: 'Support',
          links: [
            { label: 'Roadside help', href: 'https://aa.co.nz/roadservice' },
            { label: 'Help centre', href: '/help' },
          ],
        },
      ],
      socialLinks: [{ label: 'Instagram', href: 'https://instagram.com/rentovroom' }],
    });
    expect(screen.queryByText('The original links')).not.toBeInTheDocument();
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
