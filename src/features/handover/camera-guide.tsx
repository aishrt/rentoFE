import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { InspectionAngle } from '@/api/types';
import { IconButton } from '@/components/ui/icon-button';
import { Spinner } from '@/components/ui/spinner';
import { AngleIllustration } from '@/features/host/angle-illustrations';
import { ANGLE_DRAWINGS, ANGLE_HINTS, ANGLE_LABELS } from './angles';
import { cameraProblemOf, type CameraProblem } from './use-camera-problem';

/*
 * The in-app camera for inspection photos (plan §12.6, Inspection): a full-screen live view from the rear
 * camera, with an outline of the shot over it and the progress count ("Front 1/8"). The shutter grabs the
 * frame as a JPEG, which then goes the way of any photo: kept in the browser, then uploaded. Where the camera
 * can't be used (no getUserMedia, access refused, a computer without one), PhotoCapture falls back to the
 * file input.
 */

/** The longest side of a shot: plenty to see a scratch, and a quick upload on mobile data. */
const MAX_SIDE = 2560;
const JPEG_QUALITY = 0.9;

/** The video's current frame as a JPEG file, or null when the browser can't draw it. */
function grabFrame(video: HTMLVideoElement, name: string): Promise<File | null> {
  const scale = Math.min(1, MAX_SIDE / Math.max(video.videoWidth, video.videoHeight, 1));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const context = canvas.getContext('2d');
  if (!context || canvas.width === 0 || canvas.height === 0) return Promise.resolve(null);
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) =>
    canvas.toBlob(
      (blob) =>
        resolve(blob ? new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() }) : null),
      'image/jpeg',
      JPEG_QUALITY,
    ),
  );
}

interface CameraGuideProps {
  angle: InspectionAngle;
  /** "Front 1/8". */
  position: { index: number; total: number };
  /** The shot, as a JPEG. */
  onCapture: (file: File) => void;
  /** The camera can't be used here: PhotoCapture asks for a file instead. */
  onUnavailable: (problem: CameraProblem) => void;
  onClose: () => void;
}

/**
 * The full-screen camera for one angle. Focus moves to the shutter and returns to the button that opened
 * it; Escape or the close button closes it. The camera is switched off whenever it closes.
 */
export function CameraGuide(props: CameraGuideProps) {
  const shutter = useRef<HTMLButtonElement>(null);
  // Radix returns focus to a Dialog.Trigger; the camera is opened by PhotoCapture's own button instead.
  const [opener] = useState(() =>
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  );
  const label = ANGLE_LABELS[props.angle];
  const { index, total } = props.position;

  return (
    <RadixDialog.Root open onOpenChange={(open) => !open && props.onClose()}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-60 bg-ink" />
        <RadixDialog.Content
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            shutter.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            opener?.focus();
          }}
          className="fixed inset-0 z-60 flex flex-col bg-ink text-canvas outline-none motion-safe:animate-fade-in"
        >
          <div className="flex items-center justify-between gap-4 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
            <RadixDialog.Title className="font-semibold tabular-nums">
              <span aria-hidden="true">
                {label} {index}/{total}
              </span>
              <span className="sr-only">
                {label}, photo {index} of {total}
              </span>
            </RadixDialog.Title>
            <IconButton label="Close the camera" tone="on-dark" tooltip="none" onClick={props.onClose}>
              <X aria-hidden="true" />
            </IconButton>
          </div>
          <Viewfinder {...props} shutter={shutter} />
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

/** Corner marks to frame a close-up, where there's no outline to follow (damage). */
function FrameCorners() {
  return (
    <svg
      viewBox="0 0 100 75"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
      className="w-3/4 max-w-md text-canvas opacity-85 drop-shadow-md"
    >
      <path d="M2 14V2h12M86 2h12v12M98 61v12H86M14 73H2V61" />
      <path d="M46 37.5h8M50 33.5v8" />
    </svg>
  );
}

function Viewfinder({
  angle,
  onCapture,
  onUnavailable,
  shutter,
}: CameraGuideProps & { shutter: RefObject<HTMLButtonElement | null> }) {
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [missed, setMissed] = useState(false);
  const label = ANGLE_LABELS[angle];
  // The latest callback, so the camera starts once per opening rather than again on every render.
  const unavailable = useRef(onUnavailable);
  useEffect(() => {
    unavailable.current = onUnavailable;
  });

  useEffect(() => {
    const element = video.current;
    let stream: MediaStream | null = null;
    let closed = false;
    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        // The rear camera on a phone; a computer's only camera otherwise. 4:3, like the photo tiles.
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1440 } },
      })
      .then((media) => {
        if (closed || !element) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = media;
        element.srcObject = media;
        // autoPlay isn't always enough on iPhones.
        void Promise.resolve(element.play()).catch(() => undefined);
      })
      .catch((error: unknown) => {
        if (!closed) unavailable.current(cameraProblemOf(error));
      });
    return () => {
      closed = true;
      stream?.getTracks().forEach((track) => track.stop());
      if (element) element.srcObject = null;
    };
  }, []);

  const capture = async () => {
    const element = video.current;
    if (!element || !ready || capturing) return;
    setCapturing(true);
    setMissed(false);
    const file = await grabFrame(element, `${angle.toLowerCase()}.jpg`).catch(() => null);
    setCapturing(false);
    if (file) onCapture(file);
    else setMissed(true);
  };

  return (
    <>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <video
          ref={video}
          autoPlay
          muted
          playsInline
          aria-hidden="true"
          onLoadedMetadata={() => setReady(true)}
          className="absolute inset-0 size-full object-cover"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center p-6"
        >
          {angle === 'DAMAGE' ? (
            <FrameCorners />
          ) : (
            <AngleIllustration
              angle={ANGLE_DRAWINGS[angle]}
              className="w-full max-w-xl text-canvas opacity-85 drop-shadow-md"
            />
          )}
        </div>
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner label="Starting the camera" className="size-8" />
          </div>
        )}
        <RadixDialog.Description className="absolute inset-x-0 bottom-0 bg-linear-to-t from-ink/80 to-transparent px-5 pt-10 pb-4 text-center text-sm text-canvas/90">
          {ANGLE_HINTS[angle]}
        </RadixDialog.Description>
      </div>
      <div className="grid justify-items-center gap-3 px-4 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {missed && (
          <p role="alert" className="text-sm text-canvas">
            That didn’t work. Please try again.
          </p>
        )}
        <button
          ref={shutter}
          type="button"
          aria-label={`Take the ${label.toLowerCase()} photo`}
          aria-disabled={!ready || capturing}
          onClick={() => void capture()}
          className="size-18 rounded-full border-4 border-canvas p-1 transition-[scale,opacity] duration-120 ease-out focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-canvas active:scale-94 aria-disabled:opacity-50"
        >
          <span className="block size-full rounded-full bg-canvas" />
        </button>
      </div>
    </>
  );
}
