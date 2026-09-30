import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Slider } from './slider';

function PriceRange({
  onCommit = vi.fn(),
  disabled = false,
}: {
  onCommit?: (value: number[]) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState([40, 150]);
  return (
    <Slider
      value={value}
      onValueChange={setValue}
      onValueCommit={onCommit}
      min={20}
      max={300}
      step={5}
      thumbLabels={['Lowest price', 'Highest price']}
      formatValue={(dollars) => `$${dollars} a day`}
      disabled={disabled}
    />
  );
}

describe('Slider', () => {
  it('describes each thumb for screen readers', () => {
    render(<PriceRange />);
    const low = screen.getByRole('slider', { name: 'Lowest price' });
    expect(low).toHaveAttribute('aria-valuenow', '40');
    expect(low).toHaveAttribute('aria-valuemin', '20');
    expect(low).toHaveAttribute('aria-valuemax', '300');
    expect(low).toHaveAttribute('aria-valuetext', '$40 a day');
  });

  it('moves with the arrow, Page and Home/End keys, and commits each change', async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup();
    render(<PriceRange onCommit={onCommit} />);
    const high = screen.getByRole('slider', { name: 'Highest price' });

    high.focus();
    await user.keyboard('{ArrowRight}');
    expect(high).toHaveAttribute('aria-valuenow', '155');
    expect(onCommit).toHaveBeenLastCalledWith([40, 155]);
    await user.keyboard('{PageDown}');
    expect(high).toHaveAttribute('aria-valuenow', '105');
    await user.keyboard('{End}');
    expect(high).toHaveAttribute('aria-valuenow', '300');
  });

  it('never lets the thumbs cross', async () => {
    const user = userEvent.setup();
    render(<PriceRange />);
    const low = screen.getByRole('slider', { name: 'Lowest price' });

    low.focus();
    await user.keyboard('{End}');
    expect(low).toHaveAttribute('aria-valuenow', '150');
  });

  it('moves the nearest thumb to a press on the track', () => {
    const onCommit = vi.fn();
    const { container } = render(<PriceRange onCommit={onCommit} />);
    const root = container.firstElementChild as HTMLElement;
    const track = root.firstElementChild as HTMLElement;
    track.getBoundingClientRect = () => ({
      left: 0,
      width: 280,
      top: 0,
      height: 6,
      right: 280,
      bottom: 6,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    // 250 of 280 px is $270: nearer the high thumb.
    fireEvent.pointerDown(root, { button: 0, clientX: 250, pointerId: 1 });
    fireEvent.pointerUp(root, { pointerId: 1 });
    expect(screen.getByRole('slider', { name: 'Highest price' })).toHaveAttribute('aria-valuenow', '270');
    expect(onCommit).toHaveBeenCalledWith([40, 270]);
  });

  it('does nothing while disabled', async () => {
    const user = userEvent.setup();
    render(<PriceRange disabled />);
    const low = screen.getByRole('slider', { name: 'Lowest price' });
    expect(low).toHaveAttribute('aria-disabled', 'true');
    low.focus();
    await user.keyboard('{ArrowRight}');
    expect(low).toHaveAttribute('aria-valuenow', '40');
  });
});
