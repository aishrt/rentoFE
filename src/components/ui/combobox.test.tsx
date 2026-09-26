import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Combobox } from './combobox';
import { Field } from './field';

const PLACES = ['Auckland', 'Auckland Airport (AKL)', 'Queenstown', 'Queenstown Airport (ZQN)', 'Taupō'];

function Destination() {
  const [value, setValue] = useState('');
  return (
    <Field label="Where are you going?">
      <Combobox value={value} onValueChange={setValue} options={PLACES} listLabel="Popular destinations" />
    </Field>
  );
}

const optionNames = () => screen.getAllByRole('option').map((option) => option.textContent);

describe('Combobox', () => {
  it('suggests matches as you type, ignoring accents', async () => {
    const user = userEvent.setup();
    render(<Destination />);
    const input = screen.getByRole('combobox', { name: 'Where are you going?' });

    await user.type(input, 'taupo');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(optionNames()).toEqual(['Taupō']);
  });

  it('puts names that start with the text before other matches', async () => {
    const user = userEvent.setup();
    render(<Destination />);

    await user.type(screen.getByRole('combobox'), 'airport');
    expect(optionNames()).toEqual(['Auckland Airport (AKL)', 'Queenstown Airport (ZQN)']);
  });

  it('chooses with the arrow keys and Enter, keeping focus in the input', async () => {
    const user = userEvent.setup();
    render(<Destination />);
    const input = screen.getByRole('combobox');

    await user.type(input, 'queen');
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(input).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[1]?.id);
    await user.keyboard('{Enter}');
    expect(input).toHaveValue('Queenstown Airport (ZQN)');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it('shows every suggestion on a click, and chooses one with a click', async () => {
    const user = userEvent.setup();
    render(<Destination />);
    const input = screen.getByRole('combobox');

    await user.click(input);
    expect(screen.getByRole('listbox', { name: 'Popular destinations' })).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(PLACES.length);

    await user.click(screen.getByRole('option', { name: 'Queenstown' }));
    expect(input).toHaveValue('Queenstown');
    expect(input).toHaveFocus();
  });

  it('closes on Escape and hides when nothing matches', async () => {
    const user = userEvent.setup();
    render(<Destination />);
    const input = screen.getByRole('combobox');

    await user.type(input, 'a');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    await user.type(input, 'zzz');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });
});
