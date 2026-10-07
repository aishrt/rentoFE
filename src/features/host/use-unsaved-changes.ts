import { useEffect, type RefObject } from 'react';
import { useBlocker, type Blocker } from 'react-router';
import type { StepNavigationState } from './use-step-save';

/**
 * Keeps a Host from losing a step's unsaved edits (plan §9, Days 8–11: auto-saved drafts). Closing or
 * reloading the tab brings up the browser's own "Leave site?"; any other way out of the step (the header,
 * the Host menu, the browser's Back) asks with the UnsavedChangesDialog (unsaved-changes-dialog.tsx).
 * Moves that follow a save carry `saved` and go straight through.
 */
export function useUnsavedChangesGuard(unsaved: RefObject<boolean>): Blocker {
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!unsaved.current) return;
      event.preventDefault();
      // Some browsers show the prompt only when returnValue is set.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);

  return useBlocker(
    ({ currentLocation, nextLocation }) =>
      unsaved.current &&
      !(nextLocation.state as StepNavigationState | null)?.saved &&
      nextLocation.pathname !== currentLocation.pathname,
  );
}
