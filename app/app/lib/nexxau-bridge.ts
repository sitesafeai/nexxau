import http from 'http';
import { publishNexxauPpeAlert, type NexxauPpeViolation } from './nexxau-alerts';

const MAX_BODY_BYTES = 1_000_000; // 1MB safety limit
const DEFAULT_PORT = 8787;
const DEFAULT_PATH = '/nexxau/violations';

type BridgeState = {
  server?: http.Server;
  started?: boolean;
  port?: number;
};

const getBridgeState = (): BridgeState => {
  const globalKey = '__nexxauBridgeState__';
  const globalAny = globalThis as unknown as Record<string, BridgeState>;
  if (!globalAny[globalKey]) {
    globalAny[globalKey] = {};
  }
  return globalAny[globalKey];
};

const sendJson = (res: http.ServerResponse, status: number, payload: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
};

const handleViolations = (violations: NexxauPpeViolation[]) => {
  let emitted = 0;
  const results = violations.map((violation) => publishNexxauPpeAlert(violation));
  for (const result of results) {
    if (result) emitted += 1;
  }
  return emitted;
};

export function startNexxauBridge() {
  const state = getBridgeState();
  const enabled = process.env.NEXXAU_BRIDGE_ENABLED === 'true';

  if (!enabled) {
    return;
  }

  if (state.started) {
    return;
  }

  const port = Number(process.env.NEXXAU_BRIDGE_PORT || DEFAULT_PORT);
  const path = process.env.NEXXAU_BRIDGE_PATH || DEFAULT_PATH;

  const server = http.createServer((req, res) => {
    // Step 1: Route only POSTs to the bridge endpoint.
    if (req.method !== 'POST' || req.url?.split('?')[0] !== path) {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    let size = 0;
    const chunks: Buffer[] = [];

    // Step 2: Collect and validate payload size.
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        res.statusCode = 413;
        res.end('Payload Too Large');
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    // Step 3: Parse JSON and publish into the alert stream.
    req.on('end', () => {
      try {
        const rawBody = Buffer.concat(chunks).toString('utf8');
        const parsed = rawBody ? JSON.parse(rawBody) : null;

        if (!parsed) {
          sendJson(res, 400, { error: 'Empty payload' });
          return;
        }

        const violations = Array.isArray(parsed) ? parsed : [parsed];
        const emitted = handleViolations(violations as NexxauPpeViolation[]);

        sendJson(res, 200, {
          received: violations.length,
          emitted,
        });
      } catch (error) {
        console.error('[Nexxau Bridge] Failed to parse payload:', error);
        sendJson(res, 400, { error: 'Invalid JSON payload' });
      }
    });
  });

  server.listen(port, () => {
    console.log(`[Nexxau Bridge] Listening on http://localhost:${port}${path}`);
  });

  state.server = server;
  state.started = true;
  state.port = port;
}
