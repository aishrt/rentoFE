import type { HostVehicle, PublicPolicies } from '@/api/types';
import type { StepTarget } from './use-step-save';

/** What every onboarding step gets from the editor. */
export interface StepProps {
  vehicle: HostVehicle;
  policies: PublicPolicies;
  /** The checklist's missing items for this step, once the Host has been past it. */
  missing?: readonly string[];
  /**
   * Hands the editor this step's "save, then go" so the stepper can save before jumping to another step,
   * and whether the step has edits not saved yet, so leaving asks first. Returns a clean-up that forgets
   * both again.
   */
  registerSave: (save: (target: StepTarget) => void, unsaved?: boolean) => () => void;
}
