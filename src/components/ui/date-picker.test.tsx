import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { DatePicker } from './date-picker';
import { Field } from './field';

function PickUpDate() {
  const [value, setValue] = useState('2030-03-15');
  return (
    <Field label="Pick-up date">
      <DatePicker value={value} onChange={setValue} min="2030-03-10" calendarLabel="Choose a pick-up date" />
    </Field>
  );
}

describe('DatePicker', () => {
  it('is named by its label and its value', () => {
    render(<PickUpDate />);
    expect(screen.getByRole('button', { name: 'Pick-up date Fri, 15 Mar 2030' })).toHaveAttribute(
      'aria-haspopup',
      'dialog',
    );
  });

  it('opens a calendar on the chosen day and closes once a day is chosen', async () => {
    const user = userEvent.setup();
    render(<PickUpDate />);
    const trigger = screen.getByRole('button', { name: /Pick-up date/ });

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: 'Choose a pick-up date' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Friday, 15 March 2030' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Saturday, 16 March 2030' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveTextContent('Sat, 16 Mar 2030');
    expect(trigger).toHaveFocus();
  });

  it('closes on Escape and on a press outside', async () => {
    const user = userEvent.setup();
    render(<PickUpDate />);
    const trigger = screen.getByRole('button', { name: /Pick-up date/ });

    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await user.click(document.body);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps Tab inside the calendar', async () => {
    const user = userEvent.setup();
    render(<PickUpDate />);

    await user.click(screen.getByRole('button', { name: /Pick-up date/ }));
    // From the day, Tab wraps round to the next-month button (previous month is disabled by the minimum).
    await user.tab();
    expect(screen.getByRole('button', { name: 'Next month' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Friday, 15 March 2030' })).toHaveFocus();
  });
});
