import { screen } from '@testing-library/react';
import { Outlet } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithRouter } from '@/test/utils';
import { PageError, RouteErrorPage } from './route-error-page';

function Throws({ error }: { error: Error }): never {
  throw error;
}

const crash = new Error('Cannot read properties of undefined');
const chunkFailure = new TypeError(
  'Failed to fetch dynamically imported module: https://www.rentovroom.com/assets/home-page.js',
);

describe('route error pages', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('keeps the site header when a public page fails', async () => {
    renderWithRouter(
      [
        {
          element: (
            <>
              <header>Site header</header>
              <Outlet />
            </>
          ),
          errorElement: <RouteErrorPage />,
          children: [
            { errorElement: <PageError />, children: [{ path: '*', element: <Throws error={crash} /> }] },
          ],
        },
      ],
      '/cars',
    );

    expect(await screen.findByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByText('Site header')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the homepage' })).toHaveAttribute('href', '/');
  });

  it('explains a page whose code failed to download', async () => {
    renderWithRouter(
      [{ errorElement: <PageError />, children: [{ path: '*', element: <Throws error={chunkFailure} /> }] }],
      '/',
    );
    expect(await screen.findByRole('heading', { name: "We couldn't load this page" })).toBeInTheDocument();
    expect(screen.getByText(/connection may have dropped/)).toBeInTheDocument();
  });

  it('stands alone when a layout fails', async () => {
    renderWithRouter(
      [{ path: '*', element: <Throws error={crash} />, errorElement: <RouteErrorPage /> }],
      '/',
    );
    expect(await screen.findByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Rento Vroom home' })).toHaveAttribute('href', '/');
  });
});
