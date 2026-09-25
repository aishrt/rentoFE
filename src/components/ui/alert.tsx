import { cva, type VariantProps } from 'class-variance-authority';
import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

const alertVariants = cva('flex animate-fade-up gap-3 rounded-control border p-4 text-sm', {
  variants: {
    variant: {
      info: 'border-primary/15 bg-primary/5 text-ink',
      success: 'border-success/25 bg-success/8 text-ink',
      danger: 'border-danger/25 bg-danger/6 text-ink',
    },
  },
  defaultVariants: { variant: 'info' },
});

const icons = {
  info: <Info aria-hidden="true" className="mt-0.5 size-4.5 shrink-0 text-primary" />,
  success: <CircleCheck aria-hidden="true" className="mt-0.5 size-4.5 shrink-0 text-success" />,
  danger: <CircleAlert aria-hidden="true" className="mt-0.5 size-4.5 shrink-0 text-danger" />,
};

type AlertProps = Omit<ComponentProps<'div'>, 'title'> &
  VariantProps<typeof alertVariants> & {
    title?: ReactNode;
    action?: ReactNode;
  };

export function Alert({ className, variant, title, action, children, ...props }: AlertProps) {
  return (
    <div className={cn(alertVariants({ variant }), className)} {...props}>
      {icons[variant ?? 'info']}
      <div className="grid flex-1 gap-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-ink/85">{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
