import { render, screen } from '@testing-library/react';
import { X } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { IconButton } from './icon-button';

describe('IconButton', () => {
  it('is named by its label and never submits a form by accident', () => {
    render(
      <IconButton label="Close menu">
        <X aria-hidden="true" />
      </IconButton>,
    );
    const button = screen.getByRole('button', { name: 'Close menu' });
    expect(button).toHaveAttribute('type', 'button');
  });

  it('meets the 44px touch target by default', () => {
    render(
      <IconButton label="Open menu">
        <X aria-hidden="true" />
      </IconButton>,
    );
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveClass('size-11');
  });
});
