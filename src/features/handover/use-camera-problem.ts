import { useEffect, useState } from 'react';

/** Why the in-app camera (CameraGuide) can't be used, and the photo is taken another way. */
export type CameraProblem = 'unsupported' | 'denied' | 'missing' | 'failed';

/** A live camera needs getUserMedia, which browsers offer only on secure pages. */
const canUseCamera = () =>
  typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function';

/** What a failed getUserMedia means for the person. */
export function cameraProblemOf(error: unknown): CameraProblem {
  const name = error instanceof Error || error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'missing';
  return 'failed';
}

/**
 * What's known about the camera before opening it: no getUserMedia, or access already refused for this
 * site (where the browser can say). Otherwise null, and opening the camera finds out.
 */
export function useCameraProblem() {
  const [problem, setProblem] = useState<CameraProblem | null>(() => (canUseCamera() ? null : 'unsupported'));
  useEffect(() => {
    if (!canUseCamera() || typeof navigator.permissions?.query !== 'function') return;
    let cancelled = false;
    navigator.permissions
      .query({ name: 'camera' as PermissionName })
      .then((status) => {
        if (!cancelled && status.state === 'denied') setProblem('denied');
      })
      // Not every browser can say for the camera.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return [problem, setProblem] as const;
}
