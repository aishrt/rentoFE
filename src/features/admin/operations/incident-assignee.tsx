import { UserRound } from 'lucide-react';
import type { Incident } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { useAssignIncident, useIncidentAssignees } from './operations-api';

const NOBODY = '';

/**
 * Who handles the case: anyone on the support team, the admin, or nobody. A change applies straight away,
 * as an internal event on the case and in the audit log, and whoever gets the case is told.
 */
export function IncidentAssignee({ incident }: { incident: Incident }) {
  const assignees = useIncidentAssignees();
  const assign = useAssignIncident(incident.caseRef);
  const current = incident.assignedToId ?? NOBODY;
  const team = assignees.data ?? [];
  const options = [
    { value: NOBODY, label: 'Nobody yet' },
    ...team.map((person) => ({ value: person.id, label: person.you ? `${person.name} (you)` : person.name })),
    // Shown while the team loads, or when whoever has it has left the team, until it's handed on.
    ...(current && !team.some((person) => person.id === current)
      ? [{ value: current, label: incident.assignedTo ?? 'A former staff member' }]
      : []),
  ];

  const change = (value: string) => {
    if (value === current) return;
    const person = team.find((candidate) => candidate.id === value);
    assign.mutate(value || null, {
      onSuccess: () => {
        if (!person) toast('Nobody has the case now');
        else if (person.you) toast('Assigned to you');
        else toast(`Assigned to ${person.name}`, { description: 'We’ve let them know.' });
      },
    });
  };

  return (
    <div className="grid gap-3">
      <Field
        label="Handled by"
        description={
          assignees.isError ? 'We couldn’t load the support team. Refresh the page to try again.' : undefined
        }
      >
        <Select
          value={current}
          onChange={change}
          options={options}
          icon={<UserRound />}
          listLabel="Support team"
          disabled={assign.isPending || assignees.isPending}
        />
      </Field>
      {assign.isError && (
        <Alert variant="danger" role="alert">
          {assign.error.message}
        </Alert>
      )}
    </div>
  );
}
