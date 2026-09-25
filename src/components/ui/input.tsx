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
  /**
   * A control inside the input on the right, such as an IconButton with `size="inset"`. Pass it on every
   * render (hide it inside if needed) so the input is not remounted when it appears.
   */
  trailing?: ReactNode;
};

export function Input({ className, id, leadingIcon, trailing, ...props }: InputProps) {
  const field = useFieldControl();
  const input = (
    <input
      id={id ?? field?.id}
      aria-invalid={props['aria-invalid'] ?? (field?.invalid || undefined)}
      aria-describedby={props['aria-describedby'] ?? field?.describedBy}
      className={cn(inputClasses, leadingIcon && 'pl-11', trailing && 'pr-13', className)}
      {...props}
    />
  );

  if (!leadingIcon && !trailing) return input;
  return (
    <div className="group/input relative">
      {leadingIcon && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted transition-colors duration-120 group-has-[input:focus-visible]/input:text-primary [&_svg]:size-4.5"
        >
          {leadingIcon}
        </span>
      )}
      {input}
      {/* Clicks on empty space (or a hidden control) fall through to the input. */}
      {trailing && (
        <div className="pointer-events-none absolute inset-y-1 right-1 flex *:pointer-events-auto">
          {trailing}
        </div>
      )}
    </div>
  );
}
