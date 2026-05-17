'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function EditorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <h2 className="text-xl font-bold font-sans text-white">
        Editor failed to load
      </h2>
      <p className="text-secondary-text text-sm max-w-md text-center">
        Something went wrong while loading the editor. This may be caused by a
        network issue or a browser compatibility problem.
      </p>
      <pre className="text-xs text-ultraviolet bg-surface-slate rounded-lg p-4 max-w-lg overflow-x-auto">
        {error.message}
      </pre>
      <div className="flex gap-3">
        <Button
          onClick={reset}
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
