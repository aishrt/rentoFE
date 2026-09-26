import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Field } from './field';
import { TimePicker } from './time-picker';

function PickUpTime({ initial = '10:00' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <Field label="Pick-up time">
      <TimePicker value={value} onChange={setValue} listLabel="Pick-up times" />
    </Field>
  );
}

describe('TimePicker', () => {
  it('lists times in half-hour steps with the chosen one selected', async () => {
    const user = userEvent.setup();
    render(<PickUpTime />);

    await user.click(screen.getByRole('button', { name: 'Pick-up time 10:00 am' }));
    expect(screen.getByRole('listbox', { name: 'Pick-up times' })).toHaveFocus();
    expect(screen.getAllByRole('option')).toHaveLength(48);
    expect(screen.getByRole('option', { name: '10:00 am' })).toHaveAttribute('aria-selected', 'true');
  });

  it('chooses with the arrow keys and Enter, then returns focus to the field', async () => {
    const user = userEvent.setup();
    render(<PickUpTime />);
    const trigger = screen.getByRole('button', { name: /Pick-up time/ });

    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toHaveFocus();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveTextContent('10:30 am');
    expect(trigger).toHaveFocus();
  });

  it('jumps to a time as you type it', async () => {
    const user = userEvent.setup();
    render(<PickUpTime />);

    await user.click(screen.getByRole('button', { name: /Pick-up time/ }));
    await user.keyboard('2');
    const active = screen.getByRole('listbox').getAttribute('aria-activedescendant');
    expect(document.getElementById(active ?? '')).toHaveTextContent('2:00 am');
  });

  it('chooses with a click', async () => {
    const user = userEvent.setup();
    render(<PickUpTime />);
    const trigger = screen.getByRole('button', { name: /Pick-up time/ });

    await user.click(trigger);
    await user.click(screen.getByRole('option', { name: '2:30 pm' }));
    expect(trigger).toHaveTextContent('2:30 pm');
  });

  it('keeps a time that falls between steps', () => {
    render(<PickUpTime initial="10:15" />);
    expect(screen.getByRole('button', { name: /Pick-up time/ })).toHaveTextContent('10:15 am');
  });
});
