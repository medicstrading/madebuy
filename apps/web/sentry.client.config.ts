import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: 0.1, // 10% of transactions

  // Session Replay disabled - saves ~50KB gzipped
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // Only send errors in production
  enabled: process.env.NODE_ENV === "production",

  // Environment
  environment: process.env.NODE_ENV,

  // Filter out noisy errors
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error promise rejection captured",
  ],
});
