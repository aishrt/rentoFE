import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { HeroSearchForm } from './hero-search-form';

describe('HeroSearchForm', () => {
  it('clears the location and puts the cursor back in the field', async () => {
    renderWithProviders(<HeroSearchForm />);

    const where = await screen.findByLabelText('Where are you going?');
    await userEvent.type(where, 'Queenstown');
    expect(where).toHaveValue('Queenstown');

    await userEvent.click(screen.getByRole('button', { name: 'Clear location' }));
    expect(where).toHaveValue('');
    expect(where).toHaveFocus();
  });

  it('fills the location from a suggestion', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HeroSearchForm />);
    const where = await screen.findByRole('combobox', { name: 'Where are you going?' });

    await user.type(where, 'queens');
    await user.click(screen.getByRole('option', { name: 'Queenstown Airport (ZQN)' }));
    expect(where).toHaveValue('Queenstown Airport (ZQN)');
  });

  it('opens a calendar for the dates and a list for the times', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HeroSearchForm />);

    await user.click(await screen.findByRole('button', { name: /^Pick-up date/ }));
    expect(screen.getByRole('dialog', { name: 'Choose a pick-up date' })).toBeInTheDocument();
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: /^Return time/ }));
    expect(screen.getByRole('listbox', { name: 'Return times' })).toBeInTheDocument();
  });

  it('searches with the chosen place and times', async () => {
    const user = userEvent.setup();
    const { router } = renderWithProviders(<HeroSearchForm />);

    await user.type(await screen.findByRole('combobox', { name: 'Where are you going?' }), 'Wellington');
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: /^Pick-up time/ }));
    await user.click(screen.getByRole('option', { name: '9:30 am' }));
    await user.click(screen.getByRole('button', { name: 'Search Cars' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/search'));
    const params = new URLSearchParams(router.state.location.search);
    expect(params.get('where')).toBe('Wellington');
    expect(params.get('start')).toMatch(/T09:30$/);
    expect(params.get('end')).toMatch(/T10:00$/);
  });
});
