import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
