import { CircleAlert } from 'lucide-react';
import { m } from 'motion/react';
import { motion } from '@/styles/tokens';
import type { UploadState } from './use-uploads';

/** A thin bar that fills as the file goes up, with a status line for screen readers. */
export function UploadProgress({ state, label }: { state: UploadState; label: string }) {
  if (state.stage === 'failed') {
    return (
      <p role="alert" className="flex animate-fade-in items-start gap-1.5 text-sm text-danger">
        <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>{state.error}</span>
      </p>
    );
  }
  const percent = state.stage === 'uploading' ? Math.round(state.progress * 100) : 0;
  return (
    <div className="grid gap-1.5">
      <div
        role="progressbar"
        aria-label={`Uploading ${label}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={state.stage === 'uploading' ? percent : undefined}
        aria-valuetext={state.stage === 'preparing' ? 'Getting it ready' : `${percent}%`}
        className="h-1.5 overflow-hidden rounded-full bg-ink/8"
      >
        <m.div
          className="h-full origin-left rounded-full bg-primary"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: state.stage === 'preparing' ? 0.04 : Math.max(0.04, state.progress) }}
          transition={{ duration: motion.duration.short, ease: motion.ease.out }}
        />
      </div>
      <p className="text-xs text-muted tabular-nums" aria-hidden="true">
        {state.stage === 'preparing' ? 'Getting it ready…' : `Uploading… ${percent}%`}
      </p>
    </div>
  );
}
