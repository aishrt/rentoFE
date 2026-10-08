import { useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { useState } from 'react';
import type { ModerationReview } from '@/api/types';
import { staggerIndex } from '@/components/motion/presets';
import { SegmentedTabs, type TabOption } from '@/components/ui/segmented-tabs';
import { tabId, tabPanelId } from '@/components/ui/tab-ids';
import { toast } from '@/components/ui/toast';
import { DecisionDialog } from '@/features/admin/listings/decision-dialog';
import { EmptyList, ListSkeleton, LoadError } from '@/features/admin/ops/query-feedback';
import { formatNumber } from '@/lib/format';
import { HeldReviewCard } from './held-review-card';
import {
  asNotesError,
  moderateReviewRequest,
  moderationReviewsQueryKey,
  useModerationReviews,
  type ReviewAction,
  type ReviewState,
} from './moderation-api';

const TAB_PREFIX = 'moderation-reviews';

const TABS = [
  { value: 'HELD', label: 'Held' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'HIDDEN', label: 'Hidden' },
] as const satisfies readonly TabOption<ReviewState>[];

const EMPTY: Record<ReviewState, { title: string; description: string }> = {
  HELD: {
    title: 'No reviews held',
    description: 'Reviews held back before publishing show here, with why they were held.',
  },
  PUBLISHED: {
    title: 'No published reviews',
    description:
      'Reviews on Rento Vroom show here, newest first, so one that breaks the rules can be hidden.',
  },
  HIDDEN: { title: 'No hidden reviews', description: 'Reviews the team has hidden are listed here.' },
};

type Decision = { review: ModerationReview; action: ReviewAction };

interface ReviewsPanelProps {
  state: ReviewState;
  onStateChange: (state: ReviewState) => void;
}

/**
 * Reviews held back before publishing, to publish or hide with a reason; published ones, newest first, to
 * hide one that breaks the rules; and the hidden ones.
 */
export function ReviewsPanel({ state, onStateChange }: ReviewsPanelProps) {
  const queryClient = useQueryClient();
  const reviews = useModerationReviews(state);
  // The decision is kept while its dialog closes, so the dialog's text doesn't change as it animates out.
  const [decision, setDecision] = useState<Decision | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const start = (review: ModerationReview, action: ReviewAction) => {
    setDecision({ review, action });
    setDialogOpen(true);
  };

  const decide = async (notes: string | undefined) => {
    if (!decision) return;
    const { review, action } = decision;
    try {
      await moderateReviewRequest({ id: review.id, action, reason: notes ?? '' });
    } catch (error) {
      throw asNotesError(error, 'reason');
    }
    setDialogOpen(false);
    toast(action === 'CLEAR' ? 'Review published' : 'Review hidden', {
      description:
        action === 'CLEAR'
          ? `${review.author.firstName}’s review is released like any other.`
          : `${review.author.firstName}’s review won’t be shown.`,
    });
    // It leaves this list straight away; both lists then refresh.
    queryClient.setQueryData<{ reviews: ModerationReview[] }>(
      moderationReviewsQueryKey(state),
      (previous) => previous && { reviews: previous.reviews.filter((item) => item.id !== review.id) },
    );
    void queryClient.invalidateQueries({ queryKey: moderationReviewsQueryKey() });
  };

  const count = reviews.data?.length;
  const author = decision?.review.author.firstName ?? '';
  const hiding = decision?.action === 'HIDE';

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedTabs
          idPrefix={TAB_PREFIX}
          label="Review state"
          options={TABS}
          value={state}
          onChange={onStateChange}
          className="w-full sm:w-auto"
        />
        {count !== undefined && (
          <p aria-live="polite" className="text-sm text-muted">
            {formatNumber(count)} {state.toLowerCase()} {count === 1 ? 'review' : 'reviews'}
          </p>
        )}
      </div>

      <div role="tabpanel" id={tabPanelId(TAB_PREFIX, state)} aria-labelledby={tabId(TAB_PREFIX, state)}>
        {reviews.isPending && <ListSkeleton label="Loading reviews" rows={3} height="h-56" />}

        {reviews.isError && (
          <LoadError
            title="We couldn’t load the reviews"
            error={reviews.error}
            onRetry={() => reviews.refetch()}
            retrying={reviews.isFetching}
          />
        )}

        {reviews.data?.length === 0 && <EmptyList {...EMPTY[state]} icon={<Star />} />}

        {reviews.data && reviews.data.length > 0 && (
          <ul aria-label={`${TABS.find((tab) => tab.value === state)?.label} reviews`} className="grid gap-4">
            {reviews.data.map((review, index) => (
              <HeldReviewCard
                key={review.id}
                review={review}
                state={state}
                className="stagger-in"
                style={staggerIndex(index)}
                // A hidden review stays hidden: clearing it wouldn't show it again.
                onPublish={state === 'HELD' ? () => start(review, 'CLEAR') : undefined}
                onHide={state !== 'HIDDEN' ? () => start(review, 'HIDE') : undefined}
              />
            ))}
          </ul>
        )}
      </div>

      <DecisionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={hiding ? `Hide ${author}’s review?` : `Publish ${author}’s review?`}
        description={
          hiding
            ? 'It won’t be shown on Rento Vroom or count towards a rating.'
            : 'It’s released like any other review.'
        }
        confirmLabel={hiding ? 'Hide review' : 'Publish review'}
        tone={hiding ? 'danger' : 'primary'}
        notes="required"
        notesLabel={hiding ? 'Why it’s hidden' : 'Why it’s fine to publish'}
        notesDescription="Kept in the audit log."
        onConfirm={decide}
      />
    </div>
  );
}
