"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-paper-bg text-paper-text p-4">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-paper-muted mb-6">
              We&apos;ve been notified about this issue and are working to fix it.
            </p>
            <button
              onClick={reset}
              className="px-4 py-2 bg-paper-accent text-paper-bg rounded hover:opacity-90 transition-opacity"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
