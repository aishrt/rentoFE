import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useFieldControl } from './field-context';

const inputClasses = cn(
  'h-12 w-full rounded-control border border-line bg-surface px-4 text-base text-ink shadow-input',
  'placeholder:text-muted/75 transition-[border-color,box-shadow] duration-120 ease-out',
  'hover:border-ink/25 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/12',
  'aria-invalid:border-danger aria-invalid:focus-visible:ring-danger/12',
  'disabled:cursor-not-allowed disabled:opacity-60',
);

type InputProps = ComponentProps<'input'> & {
  /** Icon shown inside the input on the left. */
  leadingIcon?: ReactNode;
};

export function Input({ className, id, leadingIcon, ...props }: InputProps) {
  const field = useFieldControl();
  const input = (
    <input
      id={id ?? field?.id}
      aria-invalid={props['aria-invalid'] ?? (field?.invalid || undefined)}
      aria-describedby={props['aria-describedby'] ?? field?.describedBy}
      className={cn(inputClasses, leadingIcon && 'pl-11', className)}
      {...props}
    />
  );

  if (!leadingIcon) return input;
  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted [&_svg]:size-4.5"
      >
        {leadingIcon}
      </span>
      {input}
    </div>
  );
}
