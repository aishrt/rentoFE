import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Dialog, DialogContent } from './dialog';
import { Field } from './field';
import { TimePicker } from './time-picker';

function BlockTimes() {
  const [value, setValue] = useState('10:00');
  return (
    <Dialog open>
      <DialogContent title="Block these dates">
        <Field label="From">
          <TimePicker value={value} onChange={setValue} listLabel="Times" />
        </Field>
      </DialogContent>
    </Dialog>
  );
}

describe('DialogContent', () => {
  it('lets a picker inside it be used: its list opens in the dialog, where the modal allows it', async () => {
    const user = userEvent.setup();
    render(<BlockTimes />);

    await user.click(screen.getByRole('button', { name: 'From 10:00 am' }));
    const list = screen.getByRole('listbox', { name: 'Times' });
    expect(screen.getByRole('dialog')).toContainElement(list);
    expect(list).toHaveFocus();

    await user.click(screen.getByRole('option', { name: '2:30 pm' }));
    expect(screen.getByRole('button', { name: 'From 2:30 pm' })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Block these dates' })).toBeInTheDocument();
  });
});
