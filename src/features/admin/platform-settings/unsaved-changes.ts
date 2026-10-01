import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { DecisionKey } from '@/api/types';

type ReportUnsaved = (decision: DecisionKey, unsaved: boolean) => void;

/** How each card on the Platform settings tab tells the settings menu it has changes not saved yet. */
export const UnsavedChangesContext = createContext<ReportUnsaved | null>(null);

/** The groups with changes not saved yet, and the function their cards report them with. */
export function useUnsavedGroups(): [ReadonlySet<DecisionKey>, ReportUnsaved] {
  const [unsaved, setUnsaved] = useState<ReadonlySet<DecisionKey>>(() => new Set());
  const report = useCallback<ReportUnsaved>((decision, isUnsaved) => {
    setUnsaved((current) => {
      if (current.has(decision) === isUnsaved) return current;
      const next = new Set(current);
      if (isUnsaved) next.add(decision);
      else next.delete(decision);
      return next;
    });
  }, []);
  return [unsaved, report];
}

/** Keeps the settings menu told whether this card has changes not saved yet. */
export function useReportUnsaved(decision: DecisionKey, unsaved: boolean) {
  const report = useContext(UnsavedChangesContext);
  useEffect(() => {
    report?.(decision, unsaved);
  }, [report, decision, unsaved]);
  // A card that goes away takes its changes with it.
  useEffect(() => () => report?.(decision, false), [report, decision]);
}
