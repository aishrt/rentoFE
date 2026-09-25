import * as Menu from '@radix-ui/react-dropdown-menu';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;

export function DropdownMenuContent({
  className,
  sideOffset = 8,
  ...props
}: ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-56 origin-(--radix-dropdown-menu-content-transform-origin) rounded-card border border-line bg-surface p-1.5 shadow-lift',
          'data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in',
          className,
        )}
        {...props}
      />
    </Menu.Portal>
  );
}

export function DropdownMenuItem({ className, ...props }: ComponentProps<typeof Menu.Item>) {
  return (
    <Menu.Item
      className={cn(
        'flex min-h-11 cursor-pointer select-none items-center gap-2.5 rounded-control px-3 text-sm text-ink outline-none',
        'transition-colors duration-120 data-[highlighted]:bg-ink/5 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        // The icon picks up the brand green as the item is highlighted, by pointer or keyboard.
        '[&_svg]:size-4 [&_svg]:text-muted [&_svg]:transition-colors [&_svg]:duration-120 data-[highlighted]:[&_svg]:text-primary',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof Menu.Label>) {
  return <Menu.Label className={cn('px-3 py-2', className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof Menu.Separator>) {
  return <Menu.Separator className={cn('my-1 h-px bg-line', className)} {...props} />;
}
