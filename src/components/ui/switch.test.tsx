import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { RatingStars } from './rating-stars';
import { Switch } from './switch';

function PetFriendly({ disabled = false }: { disabled?: boolean }) {
  const [on, setOn] = useState(false);
  return (
    <Switch
      label="Pet friendly"
      description="Dogs welcome"
      checked={on}
      onCheckedChange={setOn}
      disabled={disabled}
    />
  );
}

describe('Switch', () => {
  it('flips with a press on the switch or its label, and with Space', async () => {
    const user = userEvent.setup();
    render(<PetFriendly />);
    const toggle = screen.getByRole('switch', { name: 'Pet friendly' });
    expect(toggle).toHaveAccessibleDescription('Dogs welcome');
    expect(toggle).not.toBeChecked();

    await user.click(toggle);
    expect(toggle).toBeChecked();
    await user.click(screen.getByText('Pet friendly'));
    expect(toggle).not.toBeChecked();
    toggle.focus();
    await user.keyboard(' ');
    expect(toggle).toBeChecked();
  });

  it('stays put while disabled', async () => {
    const user = userEvent.setup();
    render(<PetFriendly disabled />);
    const toggle = screen.getByRole('switch', { name: 'Pet friendly' });
    await user.click(toggle);
    expect(toggle).not.toBeChecked();
  });
});

describe('RatingStars', () => {
  it('is one image to screen readers', () => {
    render(<RatingStars value={4.86} />);
    expect(screen.getByRole('img', { name: 'Rated 4.9 out of 5' })).toBeInTheDocument();
  });
});
