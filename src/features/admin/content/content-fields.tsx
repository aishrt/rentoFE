import { CircleAlert, ExternalLink } from 'lucide-react';
import { useId, useState, type ComponentProps, type ReactNode } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DialogClose } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Markdown } from '@/features/content/markdown-view';
import { AUDIENCE_LABELS, AUDIENCE_OPTIONS, type Audience } from './content-api';

/* Pieces the Content page's tabs share: Markdown with a preview, who it's for, categories and website links. */

type MarkdownFieldProps = Omit<ComponentProps<'textarea'>, 'value'> & {
  label: string;
  description?: ReactNode;
  error?: string;
  /** The text as typed, for the preview. */
  value: string;
};

/** A large text box for Markdown, with a preview of how the website shows it. */
export function MarkdownField({ label, description, error, value, rows = 14, ...props }: MarkdownFieldProps) {
  const [preview, setPreview] = useState(false);
  return (
    <div className="grid gap-3">
      <Field
        label={label}
        description={description}
        error={error}
        labelAside={
          <button
            type="button"
            aria-expanded={preview}
            onClick={() => setPreview((shown) => !shown)}
            className="rounded-inner text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {preview ? 'Hide preview' : 'Preview'}
          </button>
        }
      >
        <Textarea rows={rows} spellCheck className="font-mono text-sm" {...props} />
      </Field>
      {preview && (
        <section
          aria-label={`Preview of ${label.toLowerCase()}`}
          className="max-h-96 overflow-y-auto rounded-inner border border-line bg-canvas p-4 sm:p-5"
        >
          {value.trim() ? (
            <Markdown source={value} headingOffset={2} />
          ) : (
            <p className="text-sm text-muted">Nothing to preview yet.</p>
          )}
        </section>
      )}
    </div>
  );
}

/*
 * The dialogs here use plain controls rather than the themed pickers: those open in the page body, and the
 * dialog doesn't let presses reach anything outside it.
 */

const fieldError = (id: string, error?: string) =>
  error ? (
    <p id={id} className="flex animate-fade-in items-start gap-1.5 text-sm text-danger">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{error}</span>
    </p>
  ) : null;

/** Who a FAQ or help article is for: Everyone, Guests or Hosts (react-hook-form's `register('audience')`). */
export function AudienceField({
  registration,
  error,
}: {
  registration: UseFormRegisterReturn;
  error?: string;
}) {
  const errorId = useId();
  return (
    <fieldset aria-describedby={error ? errorId : undefined} className="grid min-w-0 gap-1.5">
      <legend className="mb-1.5 text-sm font-medium text-ink">For</legend>
      <div className="flex min-h-11 flex-wrap items-center gap-x-5 gap-y-2">
        {AUDIENCE_OPTIONS.map((option) => (
          <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm text-ink">
            <input type="radio" value={option.value} className="size-5 accent-primary" {...registration} />
            {option.label}
          </label>
        ))}
      </div>
      {fieldError(errorId, error)}
    </fieldset>
  );
}

/** A category, typed or picked from those in use, so the same one isn't spelled two ways. */
export function CategoryField({
  registration,
  error,
  description,
  categories,
  current,
  onPick,
}: {
  registration: UseFormRegisterReturn;
  error?: string;
  description: string;
  categories: readonly string[];
  /** The category as typed, so the one in use is marked. */
  current: string;
  onPick: (category: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Field label="Category" description={description} error={error}>
        <Input autoComplete="off" maxLength={60} {...registration} />
      </Field>
      {categories.length > 0 && (
        <div
          role="group"
          aria-label="Categories in use"
          className="flex flex-wrap items-center gap-x-1.5 gap-y-2"
        >
          <span className="text-xs text-muted">In use:</span>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              aria-pressed={category === current.trim()}
              onClick={() => onPick(category)}
              className="relative min-h-9 rounded-full border border-line px-3 text-xs font-medium before:absolute before:inset-x-0 before:-inset-y-1 text-ink transition-colors duration-120 hover:border-ink/25 hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-primary"
            >
              {category}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AudienceBadge({ audience }: { audience: Audience }) {
  return <Badge variant="outline">For {AUDIENCE_LABELS[audience].toLowerCase()}</Badge>;
}

/** Opens a public page in a new tab, so the portal stays where it was. */
export function WebsiteLink({ to, label, children }: { to: string; label: string; children: ReactNode }) {
  return (
    <Button variant="ghost" size="sm" asChild>
      <a href={to} target="_blank" rel="noopener noreferrer" aria-label={`${label} (opens in a new tab)`}>
        <ExternalLink aria-hidden="true" />
        {children}
      </a>
    </Button>
  );
}

/** Cancel and the submit button at the foot of a content dialog's form. */
export function DialogActions({ submitLabel, pending }: { submitLabel: string; pending: boolean }) {
  return (
    <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-5">
      <DialogClose asChild>
        <Button variant="ghost">Cancel</Button>
      </DialogClose>
      <Button type="submit" loading={pending}>
        {submitLabel}
      </Button>
    </div>
  );
}
