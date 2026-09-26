import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './error-boundary';

let broken = true;

function Flaky() {
  if (broken) throw new Error('Wheel fell off');
  return <p>All good</p>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    broken = true;
    // React logs every caught error; keep the test output readable.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders its children while they work', () => {
    broken = false;
    render(
      <ErrorBoundary fallback={<p>Fallback</p>}>
        <Flaky />
      </ErrorBoundary>,
    );
    expect(screen.getByText('All good')).toBeInTheDocument();
    expect(screen.queryByText('Fallback')).not.toBeInTheDocument();
  });

  it('shows the fallback instead of a failing part, and reports the error', () => {
    const onError = vi.fn();
    render(
      <>
        <p>Rest of the page</p>
        <ErrorBoundary fallback={<p>Fallback</p>} onError={onError}>
          <Flaky />
        </ErrorBoundary>
      </>,
    );
    expect(screen.getByText('Fallback')).toBeInTheDocument();
    expect(screen.getByText('Rest of the page')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Wheel fell off' }),
      expect.anything(),
    );
  });

  it('can hide the failing part quietly', () => {
    const { container } = render(
      <ErrorBoundary fallback={null}>
        <Flaky />
      </ErrorBoundary>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('tries the children again on reset', async () => {
    const user = userEvent.setup();
    render(
      <ErrorBoundary
        fallback={({ error, reset }) => (
          <button type="button" onClick={reset}>
            {(error as Error).message}: try again
          </button>
        )}
      >
        <Flaky />
      </ErrorBoundary>,
    );

    broken = false;
    await user.click(screen.getByRole('button', { name: 'Wheel fell off: try again' }));
    expect(screen.getByText('All good')).toBeInTheDocument();
  });
});
