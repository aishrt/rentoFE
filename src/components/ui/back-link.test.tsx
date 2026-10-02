import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createBrowserRouter, type RouteObject } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackLink } from './back-link';

const routes = (back: RouteObject['element']): RouteObject[] => [
  { path: '/host', element: <h1>Hosting</h1> },
  { path: '/host/vehicles/v1', element: <h1>Listing overview</h1> },
  { path: '/host/vehicles/v1/calendar', element: back },
];

/** A browser router, as in the app, so the tab's real history decides where Back goes. */
async function renderAt(element: RouteObject['element'], visited: string[]) {
  const router = createBrowserRouter(routes(element));
  for (const path of visited) await router.navigate(path);
  render(<RouterProvider router={router} />);
  return router;
}

describe('BackLink', () => {
  beforeEach(() => {
    // Each test opens the site afresh: the first entry of the tab's history.
    window.history.replaceState(null, '', '/host/vehicles/v1/calendar');
  });

  it('links to the page this one belongs to, behind an arrow screen readers skip', async () => {
    await renderAt(<BackLink to="/host/vehicles/v1">Listing overview</BackLink>, []);
    const link = screen.getByRole('link', { name: 'Listing overview' });
    expect(link).toHaveAttribute('href', '/host/vehicles/v1');
    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('goes to that page, not the one before, unless told to go back', async () => {
    window.history.replaceState(null, '', '/host');
    await renderAt(<BackLink to="/host/vehicles/v1">Listing overview</BackLink>, [
      '/host/vehicles/v1/calendar',
    ]);
    await userEvent.click(screen.getByRole('link', { name: 'Listing overview' }));
    expect(await screen.findByRole('heading', { name: 'Listing overview' })).toBeInTheDocument();
  });

  it('with `previous`, goes back to whichever of our pages came before', async () => {
    window.history.replaceState(null, '', '/host');
    const router = await renderAt(
      <BackLink to="/host/vehicles/v1" previous>
        Back
      </BackLink>,
      ['/host/vehicles/v1/calendar'],
    );
    await userEvent.click(screen.getByRole('link', { name: 'Back' }));
    expect(await screen.findByRole('heading', { name: 'Hosting' })).toBeInTheDocument();
    expect(router.state.historyAction).toBe('POP');
  });

  it('with `previous`, opened directly, goes to its page instead of leaving the site', async () => {
    const router = await renderAt(
      <BackLink to="/host/vehicles/v1" previous>
        Back
      </BackLink>,
      [],
    );
    await userEvent.click(screen.getByRole('link', { name: 'Back' }));
    expect(await screen.findByRole('heading', { name: 'Listing overview' })).toBeInTheDocument();
    expect(router.state.historyAction).toBe('PUSH');
  });

  it('lets the page go somewhere itself, such as after saving', async () => {
    const save = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    const router = await renderAt(
      <BackLink to="/host/vehicles/v1" onClick={save}>
        Listing overview
      </BackLink>,
      [],
    );
    await userEvent.click(screen.getByRole('link', { name: 'Listing overview' }));
    expect(save).toHaveBeenCalledOnce();
    expect(router.state.location.pathname).toBe('/host/vehicles/v1/calendar');
  });
});
