import type { Blocker } from 'react-router';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

/** Asks what to do with a step's unsaved edits when the Host leaves it: save them, drop them or stay. */
export function UnsavedChangesDialog({
  blocker,
  onSave,
}: {
  blocker: Blocker;
  /** Saves the step, then goes to `to`. Errors stay on the step, as for Continue. */
  onSave: (to: string) => void;
}) {
  const blocked = blocker.state === 'blocked' ? blocker : null;

  return (
    <Dialog open={blocked !== null} onOpenChange={(open) => !open && blocked?.reset()}>
      {blocked && (
        <DialogContent
          title="Save your changes?"
          description="You’ve changed this step since it was last saved."
        >
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="ghost" onClick={() => blocked.reset()}>
              Stay on this step
            </Button>
            <Button variant="secondary" onClick={() => blocked.proceed()}>
              Leave without saving
            </Button>
            <Button
              onClick={() => {
                const { pathname, search, hash } = blocked.location;
                blocked.reset();
                onSave(`${pathname}${search}${hash}`);
              }}
            >
              Save and leave
            </Button>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
