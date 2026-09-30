import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { BottomSheet } from './bottom-sheet';
import { Gallery } from './gallery';
import { Lightbox } from './lightbox';

const PHOTOS = [
  { id: 'a', url: 'https://images.test/front.webp', alt: 'Front of the car', label: 'Front' },
  { id: 'b', url: 'https://images.test/rear.webp', alt: 'Rear of the car', label: 'Rear' },
  { id: 'c', url: 'https://images.test/boot.webp', alt: 'Boot of the car', label: 'Boot' },
];

function Photos() {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  return (
    <>
      <Gallery
        photos={PHOTOS}
        index={index}
        onIndexChange={setIndex}
        onOpen={() => setOpen(true)}
        label="Photos of the car"
        frameRef={frameRef}
        transitionName="vehicle-photo-a"
      />
      <Lightbox
        photos={PHOTOS}
        open={open}
        index={index}
        onIndexChange={setIndex}
        onClose={() => setOpen(false)}
        label="Photos of the car, full screen"
        originRef={frameRef}
      />
    </>
  );
}

describe('Gallery', () => {
  it('moves between photos with the buttons and arrow keys, and says where you are', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Photos />);
    const gallery = within(screen.getByRole('region', { name: 'Photos of the car' }));

    expect(gallery.getByRole('group', { name: '1 of 3: Front' })).not.toHaveAttribute('aria-hidden');
    expect(gallery.getByRole('img', { name: 'Front of the car' })).toHaveStyle({
      viewTransitionName: 'vehicle-photo-a',
    });
    expect(gallery.getByRole('button', { name: 'Previous photo' })).toBeDisabled();

    await user.click(gallery.getByRole('button', { name: 'Next photo' }));
    expect(gallery.getByText('Photo 2 of 3: Rear')).toBeInTheDocument();

    await user.click(gallery.getByRole('button', { name: 'Show photo 3 of 3: Boot' }));
    expect(gallery.getByText('Photo 3 of 3: Boot')).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}');
    expect(gallery.getByText('Photo 2 of 3: Rear')).toBeInTheDocument();
  });

  it('opens full screen at the same photo; arrows move, Escape closes and focus comes back', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Photos />);

    const expand = screen.getByRole('button', { name: 'View photos full screen' });
    await user.click(screen.getByRole('button', { name: 'Next photo' }));
    await user.click(expand);

    const lightbox = screen.getByRole('dialog', { name: 'Photos of the car, full screen' });
    expect(lightbox).toHaveTextContent('2 / 3');
    await user.keyboard('{ArrowRight}');
    expect(lightbox).toHaveTextContent('3 / 3');

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(expand).toHaveFocus();
    // The gallery stays on the photo the lightbox was showing.
    expect(screen.getByText('Photo 3 of 3: Boot')).toBeInTheDocument();
  });
});

function FilterSheet() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Filters
      </button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="Filters"
        footer={<button type="button">Show 3 cars</button>}
      >
        <button type="button">Instant Book</button>
      </BottomSheet>
    </>
  );
}

describe('BottomSheet', () => {
  it('opens as a modal dialog, keeps Tab inside, and closes with Escape', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FilterSheet />);
    const opener = screen.getByRole('button', { name: 'Filters' });

    await user.click(opener);
    const sheet = screen.getByRole('dialog', { name: 'Filters' });
    expect(sheet).toHaveAttribute('aria-modal', 'true');
    expect(sheet).toHaveFocus();
    expect(document.documentElement.style.overflow).toBe('hidden');

    await user.tab();
    expect(within(sheet).getByRole('button', { name: 'Close' })).toHaveFocus();
    await user.tab();
    await user.tab();
    expect(within(sheet).getByRole('button', { name: 'Show 3 cars' })).toHaveFocus();
    await user.tab();
    expect(within(sheet).getByRole('button', { name: 'Close' })).toHaveFocus();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
    expect(document.documentElement.style.overflow).toBe('');
  });
});
