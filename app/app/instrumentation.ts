/**
 * Next.js Instrumentation Hook
 * This file runs once when the server starts
 * Used to initialize Sentry, notification handlers, and other server-side services
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Initialize Sentry for server-side
    if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
      await import('../sentry.server.config');
      console.log('[instrumentation] Sentry initialized for server');
    }

    // Initialize alert notification handler
    try {
      const { initializeAlertNotifications } = await import('./lib/alert-notification-handler');
      initializeAlertNotifications();
      console.log('[instrumentation] Alert notification handler initialized');
    } catch (error) {
      console.error('[instrumentation] Failed to initialize alert notifications:', error);
    }

    // Initialize workflow automation system
    try {
      const { initializeWorkflowAutomation } = await import('./lib/workflows');
      initializeWorkflowAutomation();
      console.log('[instrumentation] Workflow automation initialized');
    } catch (error) {
      console.error('[instrumentation] Failed to initialize workflow automation:', error);
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Initialize Sentry for edge runtime
    if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
      await import('../sentry.edge.config');
      console.log('[instrumentation] Sentry initialized for edge');
    }
  }
}

