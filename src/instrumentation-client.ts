import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://3e5d7bc671ead72de708bb39ca8d7540@o4511069383557120.ingest.us.sentry.io/4511069387030528',
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
