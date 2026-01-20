'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white">Error</h1>
            <p className="mt-4 text-lg text-slate-400">
              Something went wrong
            </p>
            <button
              onClick={() => reset()}
              className="mt-6 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
