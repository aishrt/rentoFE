import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, CircleAlert, ImagePlus, Lightbulb } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useEffect, useSyncExternalStore } from 'react';
import type { HostVehicle, PublicPolicies } from '@/api/types';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import { motion } from '@/styles/tokens';
import { AngleIllustration } from './angle-illustrations';
import { FileButton } from './file-button';
import { removePhotoRequest, storeVehicle } from './host-api';
import { InlineConfirm } from './inline-confirm';
import { browserImageTools, preparePhoto } from './photo-checks';
import { PhotoStatusBadge, RequirementBadge } from './status-badges';
import type { StepProps } from './step-props';
import { StepFrame } from './step-frame';
import { contentTypeOf, uploadProblem } from './upload';
import { UploadProgress } from './upload-progress';
import { hostErrorMessage, useStepSave, type StepTarget } from './use-step-save';
import { useUploads } from './use-uploads';
import { uploadVehiclePhoto } from './vehicle-files';
import {
  PHOTO_ANGLES,
  PHOTO_INSTRUCTIONS,
  PHOTO_LABELS,
  QUALITY_ADVICE,
  isLive,
  type PhotoType,
  type VehiclePhoto,
} from './vehicle-labels';

const TIPS = [
  'Shoot in daylight, out of harsh midday sun',
  'Wash the car and clear out the inside first',
  'Hold your phone sideways, with the whole car in the frame',
];

/** Phones and tablets get a camera button as well as the photo library (spec §20: easy camera upload). */
const coarsePointer = '(pointer: coarse)';
function subscribePointer(onChange: () => void) {
  const query = window.matchMedia(coarsePointer);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}
function useTouchDevice() {
  return useSyncExternalStore(
    subscribePointer,
    () => window.matchMedia(coarsePointer).matches,
    () => false,
  );
}

/** The photo that stands for this angle: the newest one not rejected, or else the rejected one to retake. */
function currentPhoto(photos: VehiclePhoto[]): VehiclePhoto | undefined {
  return photos.findLast((photo) => photo.status !== 'REJECTED') ?? photos.at(-1);
}

function PhotoAdvice({ photo }: { photo: VehiclePhoto }) {
  if (photo.status === 'REJECTED') {
    return (
      <p className="flex items-start gap-2 text-sm text-danger">
        <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        Our team couldn't use this photo. Please retake it, following the tips above.
      </p>
    );
  }
  if (photo.qualityFlag === 'OK') return null;
  const advice = QUALITY_ADVICE[photo.qualityFlag];
  return (
    <div className="flex items-start gap-2 rounded-control bg-warning/10 p-3 text-sm text-ink">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
      <p>
        <span className="font-semibold">{advice.title}.</span> {advice.advice}
      </p>
    </div>
  );
}

interface TileProps {
  vehicle: HostVehicle;
  policies: PublicPolicies;
  angle: PhotoType;
  required: boolean;
  uploads: ReturnType<typeof useUploads<PhotoType>>;
  touch: boolean;
}

function PhotoTile({ vehicle, policies, angle, required, uploads, touch }: TileProps) {
  const queryClient = useQueryClient();
  const photos = vehicle.photos.filter((photo) => photo.type === angle);
  const damage = angle === 'DAMAGE';
  const photo = damage ? undefined : currentPhoto(photos);
  const shown = damage ? photos : photo ? [photo] : [];
  const state = uploads.slots[angle];
  const busy = state !== undefined && state.stage !== 'failed';
  const label = PHOTO_LABELS[angle];

  const remove = useMutation({
    mutationFn: (photoId: string) => removePhotoRequest(vehicle.id, photoId),
    onSuccess: (saved) => storeVehicle(queryClient, saved),
    onError: (error) =>
      toast("We couldn't remove that photo", { description: hostErrorMessage(error), tone: 'danger' }),
  });

  const onFile = (file: File) => {
    const problem = uploadProblem(file, 'VEHICLE_PHOTO');
    if (problem) {
      uploads.fail(angle, problem);
      return;
    }
    // A new photo replaces the one it retakes, except an approved photo on a live listing, which stays on
    // show until the new one is approved (plan §3, "Changes to live listings").
    const replaced = photo && !(isLive(vehicle.status) && photo.status === 'APPROVED') ? photo : undefined;
    void uploads.run(
      angle,
      () =>
        preparePhoto(
          file,
          { minWidthPx: policies.vehicles.minPhotoWidthPx, minHeightPx: policies.vehicles.minPhotoHeightPx },
          browserImageTools,
          contentTypeOf(file),
        ),
      async (prepared, onProgress) => {
        const saved = await uploadVehiclePhoto({
          vehicleId: vehicle.id,
          type: angle,
          photo: prepared,
          filename: `${angle.toLowerCase()}.jpg`,
          onProgress,
        });
        return replaced ? removePhotoRequest(vehicle.id, replaced.id).catch(() => saved) : saved;
      },
    );
  };

  const again = shown.length > 0 && !damage;
  const needsRetake = photo?.status === 'REJECTED';

  return (
    <li
      className={cn(
        'flex flex-col overflow-hidden rounded-card border bg-surface shadow-card',
        needsRetake ? 'border-danger/50' : 'border-line/80',
      )}
    >
      <div className="relative aspect-4/3 bg-canvas">
        <AnimatePresence initial={false} mode="popLayout">
          {!damage && photo ? (
            <m.img
              key={photo.id}
              src={photo.url}
              alt={`${label} photo`}
              className="absolute inset-0 size-full object-cover"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={motion.spring.snappy}
            />
          ) : damage && shown.length > 0 ? (
            <m.ul
              key="damage"
              className="absolute inset-0 grid grid-cols-2 gap-1 p-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              aria-label="Damage photos"
            >
              {shown.slice(0, 4).map((item) => (
                <m.li
                  key={item.id}
                  className="relative overflow-hidden rounded-inner"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={motion.spring.snappy}
                >
                  <img
                    src={item.url}
                    alt="Damage photo"
                    className="absolute inset-0 size-full object-cover"
                  />
                </m.li>
              ))}
            </m.ul>
          ) : (
            <m.div
              key="example"
              className="absolute inset-3 flex flex-col items-center justify-center gap-2 rounded-control border-2 border-dashed border-primary/25"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <AngleIllustration angle={angle} className="w-3/5" />
              <span className="eyebrow text-muted">Example</span>
            </m.div>
          )}
        </AnimatePresence>
        {photo && (
          <PhotoStatusBadge status={photo.status} className="absolute top-3 left-3 bg-surface shadow-card" />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h4 className="font-semibold text-ink">{label}</h4>
          <RequirementBadge required={required} />
        </div>
        <p className="text-sm text-muted">{PHOTO_INSTRUCTIONS[angle]}</p>
        {photo && <PhotoAdvice photo={photo} />}
        {damage && shown.length > 0 && (
          <ul className="grid gap-2">
            {shown.map((item, index) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2">
                  Photo {index + 1}
                  <PhotoStatusBadge status={item.status} />
                </span>
                <InlineConfirm
                  label="Remove"
                  ariaLabel={`Remove damage photo ${index + 1}`}
                  question="Remove it?"
                  pending={remove.isPending && remove.variables === item.id}
                  onConfirm={() => remove.mutate(item.id)}
                />
              </li>
            ))}
          </ul>
        )}
        {state && <UploadProgress state={state} label={`the ${label.toLowerCase()} photo`} />}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          {touch && (
            <FileButton
              accept="image/*"
              capture="environment"
              size="sm"
              variant={again && !needsRetake ? 'secondary' : 'primary'}
              disabled={busy}
              onFile={onFile}
              aria-label={`${again ? 'Retake' : 'Take'} the ${label.toLowerCase()} photo`}
            >
              <Camera aria-hidden="true" />
              {again ? 'Retake' : 'Take photo'}
            </FileButton>
          )}
          <FileButton
            accept="image/*"
            size="sm"
            variant={touch || (again && !needsRetake) ? 'secondary' : 'primary'}
            disabled={busy}
            onFile={onFile}
            aria-label={`${again ? 'Replace' : 'Choose'} the ${label.toLowerCase()} photo`}
          >
            <ImagePlus aria-hidden="true" />
            {touch
              ? 'Library'
              : again
                ? 'Replace'
                : damage && shown.length > 0
                  ? 'Add another'
                  : 'Choose photo'}
          </FileButton>
          {!damage && photo && !busy && (
            <InlineConfirm
              label="Remove"
              ariaLabel={`Remove the ${label.toLowerCase()} photo`}
              question="Remove it?"
              pending={remove.isPending}
              onConfirm={() => remove.mutate(photo.id)}
            />
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * Step 3: the photos (plan §9, Days 8–11). A tile for every angle in settings, with an example drawing and
 * a line of advice; phones can open the camera straight away. Each photo is resized and checked in the
 * browser, uploads with a progress bar, then waits for our team's approval.
 */
export function PhotosStep({ vehicle, policies, missing, registerSave }: StepProps) {
  const { save, savingTo, problem } = useStepSave(vehicle, 3);
  const uploads = useUploads<PhotoType>();
  const touch = useTouchDevice();
  const required = policies.vehicles.requiredPhotoAngles;
  const optional = PHOTO_ANGLES.filter((angle) => !required.includes(angle) && angle !== 'DAMAGE');
  const angles = [
    ...PHOTO_ANGLES.filter((angle) => required.includes(angle)),
    ...optional,
    'DAMAGE' as const,
  ];
  const done = required.filter((angle) =>
    vehicle.photos.some((photo) => photo.type === angle && photo.status !== 'REJECTED'),
  ).length;
  const uploading = Object.values(uploads.slots).some((state) => state && state.stage !== 'failed');

  // Photos save as they upload, so moving on only records the furthest step.
  const saveTo = (target: StepTarget) => {
    if (uploading) {
      toast('Photos are still uploading', {
        description: 'Stay on this step until they finish.',
        tone: 'neutral',
      });
      return;
    }
    void save({}, target, { changed: false });
  };

  useEffect(() => registerSave(saveTo));

  return (
    <StepFrame
      step={3}
      title="Photos"
      description={
        <>
          Great photos get more bookings. Take them in one go as you walk round the car.{' '}
          <span className="font-medium text-ink">
            {done} of {required.length} required photos added.
          </span>
        </>
      }
      onSubmit={(event) => {
        event.preventDefault();
        saveTo({ step: 4 });
      }}
      onBack={() => saveTo({ step: 2 })}
      onExit={() => saveTo('exit')}
      savingTo={savingTo}
      problem={problem}
      missing={missing}
    >
      <div className="flex gap-3 rounded-card border border-line bg-surface p-4 sm:p-5">
        <Lightbulb aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-semibold text-ink">Tips for great photos</p>
          <ul className="mt-1 grid gap-0.5 text-sm text-muted sm:grid-cols-3 sm:gap-4">
            {TIPS.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Photo angles">
        {angles.map((angle) => (
          <PhotoTile
            key={angle}
            vehicle={vehicle}
            policies={policies}
            angle={angle}
            required={required.includes(angle)}
            uploads={uploads}
            touch={touch}
          />
        ))}
      </ul>
    </StepFrame>
  );
}
