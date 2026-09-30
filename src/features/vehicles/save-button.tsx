import { Heart } from 'lucide-react';
import { m } from 'motion/react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useSession } from '@/features/auth/use-session';
import { cn } from '@/lib/cn';
import { motion } from '@/styles/tokens';
import { useFavourites, useToggleFavourite } from './use-favourites';

interface SaveButtonProps {
  vehicleId: string;
  /** The car's name, for the button's label: "Save Toyota RAV4". */
  name: string;
  className?: string;
}

/**
 * The heart on a car (plan §12.6): saves it to Saved cars for comparing later. It fills at once and pops
 * with a spring (plan §12.4), and goes back if saving fails. Visitors who aren't signed in go to log in,
 * and come back here afterwards.
 */
export function SaveButton({ vehicleId, name, className }: SaveButtonProps) {
  const session = useSession();
  const signedIn = Boolean(session.data);
  const favourites = useFavourites(signedIn);
  const toggle = useToggleFavourite();
  const navigate = useNavigate();
  const location = useLocation();
  // Only a press pops the heart; one that loads already saved just shows filled.
  const [pressed, setPressed] = useState(false);
  const saved = signedIn && Boolean(favourites.data?.vehicleIds.includes(vehicleId));

  const onClick = () => {
    if (!signedIn) {
      navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`, {
        viewTransition: true,
      });
      return;
    }
    setPressed(true);
    toggle.mutate({ vehicleId, save: !saved });
  };

  return (
    <button
      type="button"
      aria-pressed={signedIn ? saved : undefined}
      aria-label={saved ? `Remove ${name} from saved cars` : `Save ${name}`}
      onClick={onClick}
      className={cn(
        'flex size-11 items-center justify-center rounded-full bg-surface/90 text-ink shadow-card',
        'transition-[background-color,color,scale] duration-120 ease-out hover:bg-surface active:scale-90',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        saved && 'text-primary',
        className,
      )}
    >
      <m.span
        key={saved ? 'saved' : 'not-saved'}
        aria-hidden="true"
        className="flex"
        initial={pressed ? { scale: saved ? 0.4 : 0.8 } : false}
        animate={{ scale: 1 }}
        transition={motion.spring.snappy}
      >
        <Heart className={cn('size-5', saved && 'fill-current')} />
      </m.span>
    </button>
  );
}
