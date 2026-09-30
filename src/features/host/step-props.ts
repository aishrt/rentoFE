import type { HostVehicle, PublicPolicies } from '@/api/types';
import type { StepTarget } from './use-step-save';

/** What every onboarding step gets from the editor. */
export interface StepProps {
  vehicle: HostVehicle;
  policies: PublicPolicies;
  /** The checklist's missing items for this step, once the Host has been past it. */
  missing?: readonly string[];
  /**
   * Hands the editor this step's "save, then go" so the stepper can save before jumping to another step.
   * Returns a clean-up that forgets it again.
   */
  registerSave: (save: (target: StepTarget) => void) => () => void;
}
