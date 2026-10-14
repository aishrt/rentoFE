import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Photo } from './photo';

const PLACEHOLDER = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJaQAA3AA/v3AgAA=';

/** The blurred copy is drawn just after the photo. */
const blurOf = (photo: HTMLElement) => photo.nextElementSibling as HTMLElement;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Photo', () => {
  it('shows a blurred copy until the photo loads, then fades it away', () => {
    render(
      <Photo src="https://images.test/front-800.webp" placeholder={PLACEHOLDER} alt="Front of the car" />,
    );
    const photo = screen.getByRole('img', { name: 'Front of the car' });
    const blur = blurOf(photo);

    expect(blur).toHaveAttribute('aria-hidden', 'true');
    expect(blur.style.backgroundImage).toContain(PLACEHOLDER);
    expect(blur).not.toHaveAttribute('data-loaded');

    fireEvent.load(photo);
    expect(blur).toHaveAttribute('data-loaded');
  });

  it('shows the blurred copy again for a new photo, until that one loads', () => {
    const { rerender } = render(
      <Photo src="https://images.test/front-800.webp" placeholder={PLACEHOLDER} alt="Car" />,
    );
    const photo = screen.getByRole('img', { name: 'Car' });
    fireEvent.load(photo);
    expect(blurOf(photo)).toHaveAttribute('data-loaded');

    rerender(<Photo src="https://images.test/rear-800.webp" placeholder={PLACEHOLDER} alt="Car" />);
    expect(blurOf(photo)).not.toHaveAttribute('data-loaded');
    fireEvent.load(photo);
    expect(blurOf(photo)).toHaveAttribute('data-loaded');
  });

  it('counts a photo the browser already had as loaded straight away', () => {
    // jsdom never loads images; this one reports itself complete, as a cached photo does.
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(800);
    render(<Photo src="https://images.test/front-800.webp" placeholder={PLACEHOLDER} alt="Car" />);

    expect(blurOf(screen.getByRole('img', { name: 'Car' }))).toHaveAttribute('data-loaded');
  });

  it('is only the photo when there is no placeholder, as for older uploads and the demo cars', () => {
    const onLoad = vi.fn();
    const { container } = render(
      <Photo src="https://placehold.co/1600x1067/webp" alt="Car" className="size-full" onLoad={onLoad} />,
    );
    const photo = screen.getByRole('img', { name: 'Car' });

    expect(container.children).toHaveLength(1);
    expect(photo).toHaveAttribute('src', 'https://placehold.co/1600x1067/webp');
    expect(photo).toHaveClass('size-full');
    fireEvent.load(photo);
    expect(onLoad).toHaveBeenCalledTimes(1);
  });
});
