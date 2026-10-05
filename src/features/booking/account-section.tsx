import { BookmarkCheck } from 'lucide-react';
import { useState } from 'react';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { tabId, tabPanelId } from '@/components/ui/tab-ids';
import { LoginForm } from '@/features/auth/login-form';
import { SignupForm } from '@/features/auth/signup-form';

type Mode = 'login' | 'signup';

const MODES = [
  { value: 'login', label: 'Log in' },
  { value: 'signup', label: 'Create account' },
] as const;

/**
 * Step 4 (spec §7, step 6; plan §6.1): log in or create an account without leaving checkout. Nothing is lost:
 * the car, dates and options stay in the page (and its URL), and the delivery address in session storage.
 */
export function AccountSection({ onSignedIn }: { onSignedIn: () => void }) {
  const [mode, setMode] = useState<Mode>('login');

  return (
    <div className="grid gap-5">
      <p className="flex items-start gap-2.5 text-sm text-ink/85">
        <BookmarkCheck aria-hidden="true" className="mt-0.5 size-4.5 shrink-0 text-primary" />
        Your car, dates and choices stay just as they are while you log in or sign up.
      </p>
      <SegmentedTabs
        idPrefix="checkout-account"
        label="Log in or create an account"
        options={MODES}
        value={mode}
        onChange={setMode}
        className="max-w-sm"
      />
      <div
        role="tabpanel"
        id={tabPanelId('checkout-account', mode)}
        aria-labelledby={tabId('checkout-account', mode)}
        className="max-w-md"
      >
        {mode === 'login' ? (
          <LoginForm onSuccess={onSignedIn} submitLabel="Log in and continue" />
        ) : (
          <SignupForm onSuccess={onSignedIn} />
        )}
      </div>
    </div>
  );
}
