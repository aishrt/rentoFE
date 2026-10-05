import { useRef, type ComponentProps } from 'react';
import { Button } from '@/components/ui/button';

type FileButtonProps = Omit<ComponentProps<typeof Button>, 'onClick' | 'asChild'> & {
  accept: string;
  /** "environment" opens the phone's rear camera straight away instead of the file chooser. */
  capture?: 'environment' | 'user';
  onFile: (file: File) => void;
  multiple?: boolean;
};

/**
 * A button that opens the file chooser (or the camera, with `capture`). The file input itself stays
 * hidden: the button is what people see, focus and press, at a proper touch size.
 */
export function FileButton({ accept, capture, onFile, multiple, children, ...props }: FileButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button {...props} onClick={() => inputRef.current?.click()}>
        {children}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        capture={capture}
        multiple={multiple}
        hidden
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          // Cleared so choosing the same file again (a retry) still counts as a change.
          event.target.value = '';
          for (const file of files) onFile(file);
        }}
      />
    </>
  );
}
