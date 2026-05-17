'use client';

import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class EditorErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <h2 className="text-xl font-bold font-sans text-white">
            Editor failed to load
          </h2>
          <p className="text-secondary-text text-sm max-w-md text-center">
            Something went wrong while loading the editor. This may be caused by a
            network issue or a browser compatibility problem.
          </p>
          {this.state.error && (
            <pre className="text-xs text-ultraviolet bg-surface-slate rounded-lg p-4 max-w-lg overflow-x-auto">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-3">
            <Button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="rounded-xl bg-jelly-mint text-black hover:bg-jelly-mint/90 font-sans"
            >
              Try Again
            </Button>
            <Button asChild variant="ghost" className="text-secondary-text hover:text-white">
              <Link href="/">Back to Library</Link>
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
