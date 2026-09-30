import { Phone } from 'lucide-react';
import { cn } from '@/lib/cn';

/** A large, tappable 111: on a phone it starts the call. NZ's number for police, fire and ambulance. */
export function EmergencyCall({ className }: { className?: string }) {
  return (
    <a
      href="tel:111"
      className={cn(
        'group flex items-center gap-5 rounded-card border border-danger/25 bg-danger/6 p-5 transition-[border-color,scale] duration-120 ease-out hover:border-danger/50 active:scale-98 sm:p-6',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-14 shrink-0 items-center justify-center rounded-full bg-danger text-white inset-shadow-highlight"
      >
        <Phone className="size-6" />
      </span>
      <span>
        <span className="block text-sm font-medium text-ink">In an emergency</span>
        <span className="headline block text-4xl leading-tight font-medium text-danger">Call 111</span>
      </span>
    </a>
  );
}
