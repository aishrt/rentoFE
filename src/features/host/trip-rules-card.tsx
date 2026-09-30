import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Timer } from 'lucide-react';
import { useState } from 'react';
import type { HostVehicle } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { bufferOptions, noticeOptions } from './availability-options';
import { hostKeys, patchVehicleRequest, storeVehicle } from './host-api';
import { hostErrorMessage } from './use-step-save';

/** Minimum notice and preparation time, next to the calendar they shape (plan §9, Days 10–11). */
export function TripRulesCard({ vehicle }: { vehicle: HostVehicle }) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState(String(vehicle.rules.minNoticeHours));
  const [buffer, setBuffer] = useState(String(vehicle.rules.bufferHours));
  const changed =
    notice !== String(vehicle.rules.minNoticeHours) || buffer !== String(vehicle.rules.bufferHours);
  const save = useMutation({
    mutationFn: () =>
      patchVehicleRequest(vehicle.id, {
        rules: { minNoticeHours: Number(notice), bufferHours: Number(buffer) },
      }),
    onSuccess: (saved) => {
      storeVehicle(queryClient, saved);
      void queryClient.invalidateQueries({ queryKey: hostKeys.calendar(vehicle.id) });
      toast('Saved', { description: 'New bookings follow these straight away.' });
    },
  });

  return (
    <Card asChild className="p-5 sm:p-6">
      <section aria-labelledby="trip-rules" className="grid gap-5">
        <div>
          <h2 id="trip-rules" className="text-base font-semibold text-ink">
            Notice and preparation
          </h2>
          <p className="mt-1 text-sm text-muted">
            How close to a trip guests can book, and the gap you keep after one.
          </p>
        </div>
        <Field label="Minimum notice">
          <Select
            value={notice}
            onChange={setNotice}
            options={noticeOptions(vehicle.rules.minNoticeHours)}
            icon={<Timer />}
            listLabel="Minimum notice"
          />
        </Field>
        <Field label="Preparation time between trips">
          <Select
            value={buffer}
            onChange={setBuffer}
            options={bufferOptions(vehicle.rules.bufferHours)}
            icon={<Clock />}
            listLabel="Preparation time"
          />
        </Field>
        {save.isError && (
          <Alert variant="danger" role="alert">
            {hostErrorMessage(save.error)}
          </Alert>
        )}
        <div>
          <Button
            variant="secondary"
            disabled={!changed}
            loading={save.isPending}
            onClick={() => save.mutate()}
          >
            Save
          </Button>
        </div>
      </section>
    </Card>
  );
}
