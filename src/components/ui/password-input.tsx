import { Eye, EyeOff } from 'lucide-react';
import { useState, type ComponentProps } from 'react';
import { useFieldControl } from './field-context';
import { IconButton } from './icon-button';
import { Input } from './input';

type PasswordInputProps = Omit<ComponentProps<'input'>, 'type'>;

export function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const field = useFieldControl();
  const inputId = props.id ?? field?.id;

  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <IconButton
          size="inset"
          label={visible ? 'Hide password' : 'Show password'}
          aria-controls={inputId}
          disabled={props.disabled}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </IconButton>
      }
    />
  );
}
