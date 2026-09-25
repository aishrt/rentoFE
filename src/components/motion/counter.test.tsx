import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { formatNumber } from '@/lib/format';
import { Counter } from './counter';
import { MotionProvider } from './motion-provider';

describe('Counter', () => {
  it('gives screen readers the final, formatted value only', () => {
    render(
      <MotionProvider>
        <p>
          <Counter value={12345} format={formatNumber} />
        </p>
      </MotionProvider>,
    );

    expect(screen.getByText(formatNumber(12345))).toHaveClass('sr-only');
    // The rolling digits are decoration.
    const rolling = screen.getByText(formatNumber(12345)).previousElementSibling;
    expect(rolling).toHaveAttribute('aria-hidden', 'true');
  });

  it('rolls each digit in its own column and keeps separators still', () => {
    const { container } = render(
      <MotionProvider>
        <Counter value={1234} format={formatNumber} />
      </MotionProvider>,
    );

    const rolling = container.querySelector('[aria-hidden="true"]');
    const columns = rolling?.querySelectorAll(':scope > .overflow-hidden');
    expect(columns).toHaveLength(4);
    expect(rolling?.textContent).toContain(',');
  });
});
