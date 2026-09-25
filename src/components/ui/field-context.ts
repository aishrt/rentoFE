import { createContext, useContext } from 'react';

export interface FieldControlProps {
  id: string;
  invalid: boolean;
  describedBy?: string;
}

export const FieldContext = createContext<FieldControlProps | null>(null);

/** Lets inputs pick up their id and ARIA links from the surrounding <Field>. */
export function useFieldControl(): FieldControlProps | null {
  return useContext(FieldContext);
}
