import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: 'https://3e5d7bc671ead72de708bb39ca8d7540@o4511069383557120.ingest.us.sentry.io/4511069387030528',
      tracesSampleRate: 1.0,
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: 'https://3e5d7bc671ead72de708bb39ca8d7540@o4511069383557120.ingest.us.sentry.io/4511069387030528',
      tracesSampleRate: 1.0,
    });
  }
}
