import { useRef, useState, type Ref } from 'react';
import type { VehicleDetail } from '@/api/types';
import { Gallery, type GalleryPhoto } from '@/components/ui/gallery';
import { Lightbox } from '@/components/ui/lightbox';
import { assignRef } from '@/lib/assign-ref';
import { PHOTO_LABELS, vehiclePhotoTransitionName } from './vehicle-format';

interface ListingGalleryProps {
  vehicle: VehicleDetail;
  /** The gallery's frame, which the sticky booking bar watches to know when to slide in. */
  frameRef?: Ref<HTMLDivElement>;
}

/**
 * The listing's photos (spec §6: front, rear, both sides, interior, dashboard and odometer, boot, tyres and
 * any existing damage): a swipeable gallery that opens full screen from the photo tapped. The first photo
 * carries the car's view-transition name, so the card's photo morphs into it (plan §12.4).
 */
export function ListingGallery({ vehicle, frameRef }: ListingGalleryProps) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const originRef = useRef<HTMLDivElement | null>(null);
  const title = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  const photos: GalleryPhoto[] = vehicle.photos.map((photo) => ({
    id: photo.id,
    url: photo.url,
    alt: photo.alt,
    label: PHOTO_LABELS[photo.type],
  }));

  return (
    <>
      <Gallery
        photos={photos}
        index={index}
        onIndexChange={setIndex}
        onOpen={() => setOpen(true)}
        label={`Photos of the ${title}`}
        transitionName={open ? undefined : vehiclePhotoTransitionName(vehicle.id)}
        frameRef={(node) => {
          originRef.current = node;
          assignRef(frameRef, node);
        }}
      />
      <Lightbox
        photos={photos}
        open={open}
        index={index}
        onIndexChange={setIndex}
        onClose={() => setOpen(false)}
        label={`Photos of the ${title}`}
        originRef={originRef}
      />
    </>
  );
}
