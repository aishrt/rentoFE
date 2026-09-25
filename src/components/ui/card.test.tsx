import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Card } from './card';

describe('Card', () => {
  it('lends its styles to the child with asChild, letting Card classes override the variant', () => {
    render(
      <Card asChild variant="flat" className="bg-surface">
        <li>Step one</li>
      </Card>,
    );
    const item = screen.getByRole('listitem');
    expect(item).toHaveClass('rounded-card', 'bg-surface');
    expect(item).not.toHaveClass('bg-canvas');
  });
});

describe('Card spotlight', () => {
  it('moves the light to the mouse without losing the caller’s own handler', () => {
    const onPointerMove = vi.fn();
    render(
      <Card spotlight data-testid="card" onPointerMove={onPointerMove}>
        Content
      </Card>,
    );
    const card = screen.getByTestId('card');

    fireEvent.pointerMove(card, { pointerType: 'mouse', clientX: 30, clientY: 40 });

    expect(card).toHaveClass('spotlight');
    expect(card.style.getPropertyValue('--spotlight-x')).toBe('30px');
    expect(card.style.getPropertyValue('--spotlight-y')).toBe('40px');
    expect(onPointerMove).toHaveBeenCalledOnce();
  });

  it('ignores touch, which has no hover to light up', () => {
    render(
      <Card spotlight data-testid="card">
        Content
      </Card>,
    );
    const card = screen.getByTestId('card');

    fireEvent.pointerMove(card, { pointerType: 'touch', clientX: 30, clientY: 40 });

    expect(card.style.getPropertyValue('--spotlight-x')).toBe('');
  });

  it('uses the light for dark backgrounds on tinted cards', () => {
    render(
      <Card spotlight variant="tinted" data-testid="card">
        Content
      </Card>,
    );
    expect(screen.getByTestId('card')).toHaveClass('spotlight', 'spotlight-on-dark');
  });
});
