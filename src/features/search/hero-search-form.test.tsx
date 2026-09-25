import { screen } from '@testing-library/react';
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
});
