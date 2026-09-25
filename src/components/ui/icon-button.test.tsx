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

  it('shows its label as a tooltip that screen readers skip, so the name is read once', () => {
    render(
      <IconButton label="Refresh figures">
        <X aria-hidden="true" />
      </IconButton>,
    );
    const button = screen.getByRole('button', { name: 'Refresh figures' });
    const tooltip = button.querySelector('.tooltip');
    expect(tooltip).toHaveTextContent('Refresh figures');
    expect(tooltip).toHaveAttribute('aria-hidden', 'true');
    expect(tooltip).toHaveClass('tooltip-bottom');
  });

  it('puts the tooltip above buttons inside an input, and can leave it out', () => {
    const { rerender } = render(
      <IconButton label="Clear location" size="inset">
        <X aria-hidden="true" />
      </IconButton>,
    );
    expect(screen.getByRole('button').querySelector('.tooltip')).toHaveClass('tooltip-top');

    rerender(
      <IconButton label="Clear location" tooltip="none">
        <X aria-hidden="true" />
      </IconButton>,
    );
    expect(screen.getByRole('button').querySelector('.tooltip')).toBeNull();
  });
});
