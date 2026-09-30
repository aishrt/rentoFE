import type { ComponentProps } from 'react';
import { controlClasses } from '@/components/ui/control-styles';
import { useFieldControl } from '@/components/ui/field-context';
import { cn } from '@/lib/cn';

/**
 * A multi-line field that matches Input and takes its id and ARIA links from the surrounding Field. The
 * design system has no Textarea yet (plan §12.3); the staff portal has a copy, and both can move to
 * components/ui together.
 */
export function Textarea({ className, id, rows = 4, ...props }: ComponentProps<'textarea'>) {
  const field = useFieldControl();
  return (
    <textarea
      id={id ?? field?.id}
      rows={rows}
      aria-invalid={props['aria-invalid'] ?? (field?.invalid || undefined)}
      aria-describedby={props['aria-describedby'] ?? field?.describedBy}
      className={cn(controlClasses, 'block h-auto min-h-28 resize-y py-3 leading-relaxed', className)}
      {...props}
    />
  );
}
