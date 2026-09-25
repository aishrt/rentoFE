import { Eye, EyeOff } from 'lucide-react';
import { useState, type ComponentProps } from 'react';
import { cn } from '@/lib/cn';
import { useFieldControl } from './field-context';
import { Input } from './input';

type PasswordInputProps = Omit<ComponentProps<'input'>, 'type'>;

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const field = useFieldControl();
  const inputId = props.id ?? field?.id;

  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className={cn('pr-13', className)} />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-controls={inputId}
        disabled={props.disabled}
        className="absolute inset-y-1 right-1 flex w-11 items-center justify-center rounded-[8px] text-muted transition-colors duration-120 hover:bg-ink/5 hover:text-ink disabled:opacity-50"
      >
        {visible ? (
          <EyeOff aria-hidden="true" className="size-5" />
        ) : (
          <Eye aria-hidden="true" className="size-5" />
        )}
      </button>
    </div>
  );
}
