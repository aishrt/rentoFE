import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type ReactNode } from 'react';
import type { BlockInput } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { TimePicker } from '@/components/ui/time-picker';
import { toast } from '@/components/ui/toast';
import { addDays, formatDayRange } from './calendar-time';
import { addBlockRequest, hostKeys } from './host-api';
import { hostErrorMessage } from './use-step-save';

/** Whole days (from the month view) or a time range (from the week view), in NZ time. */
export type BlockRequest =
  | { kind: 'days'; first: string; last: string }
  | { kind: 'times'; startDay: string; startTime: string; endDay: string; endTime: string };

function Times({
  initial,
  pending,
  onSubmit,
  note,
}: {
  initial: Extract<BlockRequest, { kind: 'times' }>;
  pending: boolean;
  onSubmit: (input: BlockInput) => void;
  note: ReactNode;
}) {
  const [startDay, setStartDay] = useState(initial.startDay);
  const [startTime, setStartTime] = useState(initial.startTime);
  const [endDay, setEndDay] = useState(initial.endDay);
  const [endTime, setEndTime] = useState(initial.endTime);
  const [noteText, setNoteText] = useState('');
  const start = `${startDay}T${startTime}`;
  const end = `${endDay}T${endTime}`;
  const backwards = end <= start;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!backwards) onSubmit({ start, end, ...(noteText.trim() && { note: noteText.trim() }) });
      }}
      className="grid gap-5"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_9rem] gap-3">
        <Field label="From">
          <DatePicker value={startDay} onChange={setStartDay} calendarLabel="Choose the first day" />
        </Field>
        <Field label="Time" hideLabel>
          <TimePicker value={startTime} onChange={setStartTime} listLabel="Start times" align="end" />
        </Field>
        <Field label="Until" error={backwards ? 'Choose an end after the start' : undefined}>
          <DatePicker
            value={endDay}
            onChange={setEndDay}
            min={startDay}
            calendarLabel="Choose the last day"
          />
        </Field>
        <Field label="Time" hideLabel>
          <TimePicker value={endTime} onChange={setEndTime} listLabel="End times" align="end" />
        </Field>
      </div>
      <NoteField value={noteText} onChange={setNoteText} />
      {note}
      <Actions pending={pending} disabled={backwards} />
    </form>
  );
}

function NoteField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Field label="Note" description="Optional, just for you, e.g. “Service at the garage”.">
      <Input
        value={value}
        maxLength={200}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

function Actions({ pending, disabled }: { pending: boolean; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap justify-end gap-3">
      <DialogClose asChild>
        <Button variant="secondary">Cancel</Button>
      </DialogClose>
      <Button type="submit" loading={pending} disabled={disabled}>
        Block
      </Button>
    </div>
  );
}

/**
 * Blocks dates or times on the car's calendar (plan §9, Days 10–11). The API refuses a range with a trip
 * or a request in it (409 BOOKED_DATES), and its message says so here.
 */
export function BlockDialog({
  vehicleId,
  request,
  onClose,
  onBlocked,
}: {
  vehicleId: string;
  request: BlockRequest | null;
  onClose: () => void;
  onBlocked: () => void;
}) {
  const queryClient = useQueryClient();
  const noteId = useId();
  const [note, setNote] = useState('');
  const block = useMutation({
    mutationFn: (input: BlockInput) => addBlockRequest(vehicleId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hostKeys.calendar(vehicleId) });
      toast('Blocked', { description: 'Guests can’t book those times.' });
      onBlocked();
    },
  });

  const error = block.isError ? (
    <Alert variant="danger" role="alert">
      {hostErrorMessage(block.error)}
    </Alert>
  ) : null;

  const close = (open: boolean) => {
    if (open) return;
    block.reset();
    setNote('');
    onClose();
  };

  return (
    <Dialog open={request !== null} onOpenChange={close}>
      {request && (
        <DialogContent
          title={
            request.kind === 'days' ? `Block ${formatDayRange(request.first, request.last)}` : 'Block a time'
          }
          description={
            request.kind === 'days'
              ? 'Whole days, from midnight to midnight NZ time. Guests can’t book the car then.'
              : 'Times are NZ time. Guests can’t book the car then.'
          }
        >
          {request.kind === 'days' ? (
            <form
              noValidate
              aria-describedby={noteId}
              onSubmit={(event) => {
                event.preventDefault();
                block.mutate({
                  start: request.first,
                  end: addDays(request.last, 1),
                  ...(note.trim() && { note: note.trim() }),
                });
              }}
              className="grid gap-5"
            >
              <NoteField value={note} onChange={setNote} />
              <span id={noteId} className="sr-only">
                Blocks {formatDayRange(request.first, request.last)}
              </span>
              {error}
              <Actions pending={block.isPending} />
            </form>
          ) : (
            <Times
              key={`${request.startDay}${request.startTime}`}
              initial={request}
              pending={block.isPending}
              onSubmit={block.mutate}
              note={error}
            />
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}
