import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MotionProvider } from '@/components/motion/motion-provider';
import { Stepper, type StepperStep } from './stepper';

const steps: StepperStep[] = [
  { label: 'Details', state: 'complete' },
  { label: 'Documents', state: 'attention' },
  { label: 'Photos', state: 'upcoming' },
];

const renderStepper = (props: Partial<Parameters<typeof Stepper>[0]> = {}) =>
  render(
    <MotionProvider>
      <Stepper steps={steps} current={1} label="Listing progress" {...props} />
    </MotionProvider>,
  );

describe('Stepper', () => {
  it('marks the current step, and tells screen readers where each step stands', () => {
    renderStepper();

    const nav = screen.getByRole('navigation', { name: 'Listing progress' });
    const current = nav.querySelector('[aria-current="step"]');
    expect(current).toHaveTextContent('Documents, step 2 of 3, current step, something is missing');
    expect(nav).toHaveTextContent('Details, step 1 of 3, done');
    expect(nav).toHaveTextContent('Photos, step 3 of 3, not started');
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('makes each step a button when it can be chosen', async () => {
    const onSelect = vi.fn();
    renderStepper({ onSelect });

    await userEvent.click(screen.getByRole('button', { name: /^Photos/ }));

    expect(onSelect).toHaveBeenCalledWith(2);
    expect(screen.getByRole('button', { name: /^Documents/ })).toHaveAttribute('aria-current', 'step');
  });

  it('has no buttons without a way to choose, and no current step once every step is done', () => {
    renderStepper({ current: 3 });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(document.querySelector('[aria-current]')).toBeNull();
  });
});
