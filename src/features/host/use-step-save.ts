import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ApiError } from '@/api/client';
import type { HostVehicle, VehiclePatch } from '@/api/types';
import { toast } from '@/components/ui/toast';
import { formErrorMessage } from '@/features/account/form-errors';
import { patchVehicleRequest, storeVehicle } from './host-api';
import { STEP_COUNT } from './vehicle-labels';

/** Where a step goes once it's saved. */
export type StepTarget = { step: number } | 'review' | 'exit' | 'calendar' | 'overview';

export const vehiclePath = (id: string) => `/host/vehicles/${id}`;
export const stepPath = (id: string, step: number | 'review') => `${vehiclePath(id)}/${step}`;

/** Router state that tells the editor which way to slide the next step in. */
export interface StepNavigationState {
  direction?: 1 | -1;
  /** Set after a successful submit, for the overview's confirmation. */
  submitted?: boolean;
}

export interface SaveProblem {
  title: string;
  /** Messages that don't belong to a field on this step. */
  items: string[];
}

/** Messages the API writes for people, which the editor can show as they are. */
export function hostErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status > 0 && error.status < 500 && error.code !== 'HTTP_ERROR') {
    return error.message;
  }
  return formErrorMessage(error) ?? 'Some details need fixing.';
}

interface SaveOptions {
  /** False when nothing on the step changed: then only a new furthest step is saved. */
  changed: boolean;
  /**
   * Puts the API's field errors (keys like `pricing.dailyCents`) on the step's fields, and returns the
   * messages it couldn't place.
   */
  onFieldErrors?: (fields: Record<string, string>) => string[];
}

/**
 * Saves an onboarding step with PATCH, then moves on (plan §9, Days 8–11: auto-saved drafts, resume where
 * you left off). Every button saves: Back, Save & exit, Continue and the stepper. `onboardingStep` records
 * the furthest step reached, which My Vehicles resumes at.
 */
export function useStepSave(vehicle: HostVehicle, step: number) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [problem, setProblem] = useState<SaveProblem | null>(null);
  const [savingTo, setSavingTo] = useState<StepTarget | null>(null);
  const mutation = useMutation({
    mutationFn: (patch: VehiclePatch) => patchVehicleRequest(vehicle.id, patch),
    onSuccess: (saved) => storeVehicle(queryClient, saved),
  });

  const go = (target: StepTarget) => {
    if (target === 'exit') {
      toast('Saved', { description: 'Pick up where you left off from your Host home.' });
      navigate('/host');
    } else if (target === 'calendar') {
      navigate(`${vehiclePath(vehicle.id)}/calendar`);
    } else if (target === 'overview') {
      navigate(vehiclePath(vehicle.id));
    } else if (target === 'review') {
      navigate(stepPath(vehicle.id, 'review'), { state: { direction: 1 } satisfies StepNavigationState });
    } else {
      const direction = target.step >= step ? 1 : -1;
      navigate(stepPath(vehicle.id, target.step), { state: { direction } satisfies StepNavigationState });
    }
  };

  const save = async (patch: VehiclePatch, target: StepTarget, { changed, onFieldErrors }: SaveOptions) => {
    setProblem(null);
    const reached = typeof target === 'object' ? target.step : target === 'review' ? STEP_COUNT : step;
    const onboardingStep = Math.min(STEP_COUNT, Math.max(vehicle.onboardingStep, reached, step));
    if (!changed && onboardingStep === vehicle.onboardingStep) {
      go(target);
      return;
    }
    setSavingTo(target);
    try {
      await mutation.mutateAsync({ ...patch, onboardingStep });
      go(target);
    } catch (error) {
      if (error instanceof ApiError && error.fields) {
        const items = onFieldErrors ? onFieldErrors(error.fields) : Object.values(error.fields);
        setProblem({
          title: error.code === 'PLATE_TAKEN' ? error.message : 'Some details need fixing.',
          items,
        });
      } else {
        setProblem({ title: hostErrorMessage(error), items: [] });
      }
    } finally {
      setSavingTo(null);
    }
  };

  return { save, saving: mutation.isPending, savingTo, problem };
}

/**
 * Puts API field errors on a form's fields. `fieldFor` maps an API key (e.g. `pricing.dailyCents`) to a
 * form field, or undefined for one this step doesn't show. Returns the messages left over.
 */
export function placeFieldErrors<Field extends string>(
  fields: Record<string, string>,
  fieldFor: (key: string) => Field | undefined,
  setError: (field: Field, error: { message: string }, options?: { shouldFocus: boolean }) => void,
): string[] {
  const leftover: string[] = [];
  let focused = false;
  for (const [key, message] of Object.entries(fields)) {
    const field = fieldFor(key);
    if (field) {
      setError(field, { message }, { shouldFocus: !focused });
      focused = true;
    } else {
      leftover.push(message);
    }
  }
  return leftover;
}

/** The field for an exact API key, or the one for its first part (`powertrain.engineCc` → a map entry). */
export function fieldMap<Field extends string>(map: Record<string, Field>) {
  return (key: string): Field | undefined => map[key] ?? map[key.split('.')[0] ?? ''];
}
