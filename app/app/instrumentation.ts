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

    // Initialize Nexxau bridge (optional HTTP forwarder for external processes)
    try {
      const { startNexxauBridge } = await import('./lib/nexxau-bridge');
      startNexxauBridge();
      if (process.env.NEXXAU_BRIDGE_ENABLED === 'true') {
        console.log('[instrumentation] Nexxau bridge initialized');
      }
    } catch (error) {
      console.error('[instrumentation] Failed to initialize Nexxau bridge:', error);
    }

    // Restore mountpoints and RTP workers for all cameras on server startup
    // This ensures cameras continue streaming after Janus/service restarts
    try {
      // Delay restoration to ensure Janus and camera-ingest-service are ready
      setTimeout(async () => {
        try {
          console.log('[instrumentation] === Starting camera restoration on server startup ===');
          
          // Step 1: Restore mountpoints (recreates missing Janus mountpoints)
          const { restoreAllMountpoints, startMountpointMonitoring } = await import('./lib/services/janusHealthCheck');
          const mountpointResult = await restoreAllMountpoints();
          
          console.log(`[instrumentation] Mountpoint restoration: ${mountpointResult.restored}/${mountpointResult.total} cameras restored`);
          if (mountpointResult.failed.length > 0) {
            console.warn(`[instrumentation] ⚠️ ${mountpointResult.failed.length} cameras failed mountpoint restoration`);
          }
          
          // Step 2: Start background monitoring (checks every 60 seconds)
          startMountpointMonitoring();
          console.log('[instrumentation] ✅ Mountpoint health monitoring started');
          
          // Step 3: Restore RTP workers (starts FFmpeg processes)
          const { restoreRtpWorkers } = await import('./lib/services/rtpWorkerRestore');
          const rtpResult = await restoreRtpWorkers();
          
          if (rtpResult.success) {
            console.log(`[instrumentation] ✅ RTP workers restored: ${rtpResult.started} cameras`);
          } else {
            console.warn(`[instrumentation] ⚠️ RTP worker restoration completed with errors: ${rtpResult.started} started, ${rtpResult.failed} failed`);
            if (rtpResult.errors.length > 0) {
              console.warn('[instrumentation] RTP restoration errors:', rtpResult.errors);
            }
          }
          
          console.log('[instrumentation] === Camera restoration complete ===');
        } catch (error) {
          console.error('[instrumentation] ❌ Failed to restore cameras:', error);
        }
      }, 10000); // Wait 10 seconds for Janus and camera-ingest-service to be ready
    } catch (error) {
      console.error('[instrumentation] Failed to initialize camera restoration:', error);
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

