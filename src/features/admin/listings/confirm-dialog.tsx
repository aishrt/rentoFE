import { useMutation } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { reviewErrorMessage } from './listing-api';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  /** Makes the change. An API error it throws shows in the dialog. */
  onConfirm: () => Promise<void>;
}

/** Asks before a change that tells the Host something went wrong, such as rejecting a photo. */
export function ConfirmDialog({ open, onOpenChange, title, description, ...body }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={description}>
        <ConfirmBody {...body} />
      </DialogContent>
    </Dialog>
  );
}

function ConfirmBody({ confirmLabel, onConfirm }: Pick<ConfirmDialogProps, 'confirmLabel' | 'onConfirm'>) {
  const confirm = useMutation({ mutationFn: onConfirm });
  const error = confirm.isError ? reviewErrorMessage(confirm.error) : null;

  return (
    <div className="grid gap-5">
      {error && (
        <Alert variant="danger" role="alert">
          {error}
        </Alert>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <DialogClose asChild>
          <Button variant="ghost">Cancel</Button>
        </DialogClose>
        <Button variant="danger" loading={confirm.isPending} onClick={() => confirm.mutate()}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
