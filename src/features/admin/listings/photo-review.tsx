import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ImageOff, TriangleAlert, X } from 'lucide-react';
import { useState } from 'react';
import type { HostVehicle } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { formatNumber } from '@/lib/format';
import { ConfirmDialog } from './confirm-dialog';
import {
  adminVehicleQueryKey,
  decidePhotoRequest,
  reviewErrorMessage,
  reviewQueueQueryKey,
  withVehicle,
} from './listing-api';
import { PHOTO_ANGLES, PHOTO_LABELS, QUALITY_FLAG_LABELS, type Photo } from './listing-labels';
import { PhotoStatusBadge } from './review-badge';
import { ReviewSection } from './review-section';

interface NamedPhoto {
  photo: Photo;
  /** "Front", or "Interior 2" when an angle has more than one photo. */
  name: string;
}

/** The photos in the order the Host takes them, each named by its angle. */
function namePhotos(photos: readonly Photo[]): NamedPhoto[] {
  const sorted = [...photos].sort((a, b) => PHOTO_ANGLES.indexOf(a.type) - PHOTO_ANGLES.indexOf(b.type));
  const seen = new Map<Photo['type'], number>();
  return sorted.map((photo) => {
    const count = (seen.get(photo.type) ?? 0) + 1;
    seen.set(photo.type, count);
    const repeated = photos.filter((other) => other.type === photo.type).length > 1;
    return { photo, name: repeated ? `${PHOTO_LABELS[photo.type]} ${count}` : PHOTO_LABELS[photo.type] };
  });
}

/**
 * The listing's photos by angle, with the browser's quality flags (plan §9, Days 8–11). Staff approve or
 * reject each one; a rejected photo counts as missing and the Host is asked to retake it. On a live
 * listing, new photos wait here while the approved ones stay on show (plan §3, changes to live listings).
 */
export function PhotoReview({ vehicleId, photos }: { vehicleId: string; photos: HostVehicle['photos'] }) {
  const queryClient = useQueryClient();
  // Kept while the dialog closes, so its text doesn't change as it animates out.
  const [rejecting, setRejecting] = useState<NamedPhoto | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const showResult = (vehicle: HostVehicle, title: string, description?: string) => {
    queryClient.setQueryData(adminVehicleQueryKey(vehicleId), withVehicle(vehicle));
    void queryClient.invalidateQueries({ queryKey: reviewQueueQueryKey });
    toast(title, { description });
  };

  const approve = useMutation({
    mutationFn: ({ photo }: NamedPhoto) =>
      decidePhotoRequest({ id: vehicleId, photoId: photo.id, decision: 'APPROVE' }),
    onSuccess: (vehicle, { name }) => showResult(vehicle, `${name} photo approved`),
  });

  const reject = async () => {
    if (!rejecting) return;
    const vehicle = await decidePhotoRequest({
      id: vehicleId,
      photoId: rejecting.photo.id,
      decision: 'REJECT',
    });
    setConfirmOpen(false);
    showResult(vehicle, `${rejecting.name} photo rejected`, "We've asked the Host to take it again.");
  };

  const named = namePhotos(photos);
  const waiting = photos.filter((photo) => photo.status === 'PENDING').length;
  const busyId = approve.isPending ? approve.variables.photo.id : null;

  return (
    <ReviewSection
      id="photos"
      title="Photos"
      description="Approved photos show on the listing. Open one to see it full size."
      aside={<p className="text-sm text-muted">{formatNumber(waiting)} waiting</p>}
    >
      {approve.isError && (
        <Alert variant="danger" role="alert" className="mb-4">
          {reviewErrorMessage(approve.error)}
        </Alert>
      )}

      {named.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <ImageOff aria-hidden="true" className="size-4.5" />
          No photos yet.
        </p>
      ) : (
        <ul aria-label="Photos" className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {named.map(({ photo, name }) => {
            const angle = name.toLowerCase();
            return (
              <li
                key={photo.id}
                aria-label={`${name} photo`}
                className="flex flex-col overflow-hidden rounded-control border border-line bg-surface"
              >
                <a
                  href={photo.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${name} photo, full size (new tab)`}
                  className="block bg-ink/5 outline-offset-2 transition-opacity duration-120 hover:opacity-90"
                >
                  <img
                    src={photo.url}
                    alt={`${name} photo`}
                    loading="lazy"
                    className="aspect-4/3 w-full object-cover"
                  />
                </a>
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-ink">{name}</p>
                    <PhotoStatusBadge status={photo.status} />
                  </div>
                  {photo.qualityFlag !== 'OK' && (
                    <p className="flex items-center gap-1.5 text-xs text-ink">
                      <TriangleAlert aria-hidden="true" className="size-3.5 shrink-0 text-warning" />
                      {QUALITY_FLAG_LABELS[photo.qualityFlag]}
                    </p>
                  )}
                  <div className="mt-auto flex gap-2 pt-1">
                    {photo.status !== 'APPROVED' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        aria-label={`Approve the ${angle} photo`}
                        loading={busyId === photo.id}
                        disabled={busyId !== null}
                        onClick={() => approve.mutate({ photo, name })}
                      >
                        <Check aria-hidden="true" />
                        Approve
                      </Button>
                    )}
                    {photo.status !== 'REJECTED' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        aria-label={`Reject the ${angle} photo`}
                        disabled={busyId !== null}
                        onClick={() => {
                          setRejecting({ photo, name });
                          setConfirmOpen(true);
                        }}
                      >
                        <X aria-hidden="true" />
                        Reject
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Reject the ${rejecting?.name.toLowerCase() ?? ''} photo?`}
        description="Guests won't see it, and it counts as missing until the Host adds a new one. We'll ask them to take it again."
        confirmLabel="Reject photo"
        onConfirm={reject}
      />
    </ReviewSection>
  );
}
