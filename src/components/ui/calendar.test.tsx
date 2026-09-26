import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Calendar } from './calendar';

const day = (name: string) => screen.getByRole('button', { name });

describe('Calendar', () => {
  it('shows the chosen day and blocks days before the minimum', () => {
    render(<Calendar value="2030-03-15" min="2030-03-10" onSelect={() => {}} />);

    expect(screen.getByRole('grid', { name: 'March 2030' })).toBeInTheDocument();
    expect(day('Friday, 15 March 2030').parentElement).toHaveAttribute('aria-selected', 'true');
    expect(day('Saturday, 9 March 2030')).toBeDisabled();
    expect(day('Sunday, 10 March 2030')).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled();
  });

  it('moves by keyboard, across months, and chooses with Enter', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Calendar value="2030-03-15" onSelect={onSelect} autoFocus />);

    expect(day('Friday, 15 March 2030')).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(day('Friday, 22 March 2030')).toHaveFocus();
    await user.keyboard('{PageDown}');
    expect(screen.getByRole('grid', { name: 'April 2030' })).toBeInTheDocument();
    expect(day('Monday, 22 April 2030')).toHaveFocus();
    await user.keyboard('{End}{Enter}');
    expect(onSelect).toHaveBeenCalledWith('2030-04-28');
  });

  it('does not move focus before the minimum day', async () => {
    const user = userEvent.setup();
    render(<Calendar value="2030-03-12" min="2030-03-10" onSelect={() => {}} autoFocus />);

    await user.keyboard('{ArrowUp}');
    expect(day('Sunday, 10 March 2030')).toHaveFocus();
  });

  it('keeps focus on the month buttons when they change the month', async () => {
    const user = userEvent.setup();
    render(<Calendar value="2030-03-15" onSelect={() => {}} autoFocus />);
    const next = screen.getByRole('button', { name: 'Next month' });

    await user.click(next);
    expect(screen.getByRole('grid', { name: 'April 2030' })).toBeInTheDocument();
    expect(next).toHaveFocus();
  });

  it('shows the trip as a band between its first and last days', () => {
    render(<Calendar value="2030-03-18" range={['2030-03-15', '2030-03-18']} onSelect={() => {}} />);

    expect(day('Saturday, 16 March 2030').parentElement).toHaveClass('bg-primary/8');
    expect(day('Tuesday, 19 March 2030').parentElement).not.toHaveClass('bg-primary/8');
  });
});
