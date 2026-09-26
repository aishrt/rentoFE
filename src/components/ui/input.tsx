import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { controlClasses } from './control-styles';
import { useFieldControl } from './field-context';

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
      className={cn(controlClasses, leadingIcon && 'pl-11', trailing && 'pr-13', className)}
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
