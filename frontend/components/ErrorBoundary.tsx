"use client";

import React, { ReactNode, useState, useEffect } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

export default function ErrorBoundary({
  children,
  fallback,
}: ErrorBoundaryProps) {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setError(event.error);
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  if (error) {
    return (
      fallback?.(error, () => setError(null)) || (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
          <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-8 max-w-md text-center">
            <h1 className="text-2xl font-bold text-red-400 mb-4">
              Something went wrong
            </h1>
            <p className="text-gray-400 mb-6 text-sm">{error.message}</p>
            <button
              onClick={() => setError(null)}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition"
            >
              Try Again
            </button>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
}
