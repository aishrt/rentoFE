import { Camera, CloudOff, LoaderCircle, RotateCcw, TriangleAlert } from 'lucide-react';
import { useRef, useState } from 'react';
import type { ConditionReport, InspectionAngle } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AngleIllustration } from '@/features/host/angle-illustrations';
import { ANGLE_DRAWINGS, ANGLE_HINTS, ANGLE_LABELS, takenLabel } from './angles';
import type { InspectionPhoto } from './use-inspection-photos';

/** A photo's upload state, in words. */
export function PhotoStatusBadge({ photo }: { photo: InspectionPhoto }) {
  switch (photo.status) {
    case 'uploaded':
      return <Badge variant="primary">Saved</Badge>;
    case 'uploading':
      return (
        <Badge variant="neutral">
          <LoaderCircle aria-hidden="true" className="animate-spin" />
          Uploading {Math.round(photo.progress * 100)}%
        </Badge>
      );
    case 'waiting':
      return (
        <Badge variant="outline">
          <CloudOff aria-hidden="true" />
          Uploading when back online
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="neutral" className="bg-danger/10 text-danger">
          <TriangleAlert aria-hidden="true" />
          Didn’t upload
        </Badge>
      );
  }
}

interface PhotoCaptureProps {
  angle: InspectionAngle;
  /** "Front 1/8". */
  position: { index: number; total: number };
  photo?: InspectionPhoto;
  /** At check-out: the same angle at check-in, to compare. */
  earlier?: ConditionReport['photos'][number];
  onTake: (file: File) => Promise<string | null>;
}

/**
 * One angle of the inspection (plan §12.6): what to photograph, with an example drawing, then the photo
 * with the time it was taken. Opens the phone's camera; on a computer it asks for a file.
 */
export function PhotoCapture({ angle, position, photo, earlier, onTake }: PhotoCaptureProps) {
  const input = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const label = ANGLE_LABELS[angle];

  const take = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setProblem(await onTake(file));
    setBusy(false);
    if (input.current) input.current.value = '';
  };

  return (
    <div className="grid gap-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="headline text-2xl font-medium">{label}</h2>
        <p
          className="text-sm font-medium text-muted"
          aria-label={`Photo ${position.index} of ${position.total}`}
        >
          {label} {position.index}/{position.total}
        </p>
      </div>
      <p className="text-ink/80">{ANGLE_HINTS[angle]}</p>

      <div className={earlier ? 'grid gap-4 sm:grid-cols-2' : 'grid'}>
        {earlier && (
          <figure className="grid gap-2">
            <img
              src={earlier.url}
              alt={`${label} at check-in`}
              className="aspect-4/3 w-full rounded-card bg-canvas object-cover"
            />
            <figcaption className="text-xs text-muted">
              At check-in · {takenLabel(earlier.takenAt)}
            </figcaption>
          </figure>
        )}
        <figure className="grid gap-2">
          {photo ? (
            <img
              src={photo.previewUrl}
              alt={`${label}, now`}
              className="aspect-4/3 w-full rounded-card bg-canvas object-cover"
            />
          ) : (
            <div className="flex aspect-4/3 w-full items-center justify-center rounded-card border-2 border-dashed border-line bg-canvas p-8">
              <AngleIllustration angle={ANGLE_DRAWINGS[angle]} className="w-3/4 max-w-60 opacity-80" />
            </div>
          )}
          <figcaption className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            {photo ? (
              <>
                <span>{takenLabel(photo.takenAt)}</span>
                <PhotoStatusBadge photo={photo} />
              </>
            ) : (
              <span>{earlier ? 'Now: take the same shot' : 'Example of the shot'}</span>
            )}
          </figcaption>
        </figure>
      </div>

      {problem && (
        <Alert variant="danger" role="alert">
          {problem}
        </Alert>
      )}
      {photo?.status === 'failed' && photo.error && (
        <Alert variant="danger" role="alert">
          {photo.error} Please take it again.
        </Alert>
      )}

      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => void take(event.target.files?.[0])}
      />
      <Button
        variant={photo ? 'secondary' : 'primary'}
        size="lg"
        loading={busy}
        onClick={() => input.current?.click()}
        className="justify-self-start"
      >
        {photo ? <RotateCcw aria-hidden="true" /> : <Camera aria-hidden="true" />}
        {photo ? 'Retake' : `Take the ${label.toLowerCase()} photo`}
      </Button>
    </div>
  );
}
