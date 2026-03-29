/**
 * WebSocket stub — WebSocket server was removed (broken on Vercel/serverless).
 * Real-time updates now use SSE (/api/alerts/stream) and polling (/api/violations).
 * These exports are no-ops for backward compatibility with existing callers.
 */

export async function broadcastNotification(_topic: string, _payload: unknown): Promise<void> {
  // No-op: WebSocket server removed
}

export async function broadcastSystemStatus(_payload: unknown): Promise<void> {
  // No-op: WebSocket server removed
}

const stubManager = { getConnectionCount: () => 0 };

export function getWebSocketManager(): { getConnectionCount: () => number } {
  return stubManager;
}
