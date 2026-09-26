import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface ErrorFallbackProps {
  error: unknown;
  /** Clears the error and renders the children again. */
  reset: () => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Shown in place of the children once they throw. `null` quietly hides the part that failed. */
  fallback: ReactNode | ((props: ErrorFallbackProps) => ReactNode);
  /** Called once for each error caught, e.g. to report it. React already logs it to the console. */
  onError?: (error: unknown, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  failed: boolean;
  error: unknown;
}

/**
 * Catches an error thrown while its children render and shows `fallback` instead, so one broken part doesn't
 * blank the whole page. Routes have their own boundaries (`errorElement` in router.tsx); use this for the app
 * as a whole and for independent sections of a page. Like every React error boundary, it doesn't catch errors
 * in event handlers or async code: forms and queries show those themselves.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false, error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { failed: true, error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  reset = () => this.setState({ failed: false, error: null });

  render() {
    const { fallback, children } = this.props;
    if (!this.state.failed) return children;
    return typeof fallback === 'function'
      ? fallback({ error: this.state.error, reset: this.reset })
      : fallback;
  }
}
