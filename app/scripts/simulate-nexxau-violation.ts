/**
 * Simulate a Nexxau PPE violation by POSTing to the Nexxau bridge.
 * Usage:
 *   NEXXAU_BRIDGE_URL=http://localhost:8787/nexxau/violations \
 *   npx tsx ./scripts/simulate-nexxau-violation.ts <worksiteId> <cameraId> "Missing helmet"
 */

const [worksiteId, cameraId, details] = process.argv.slice(2);

if (!worksiteId || !cameraId) {
  console.error('Usage: npx tsx ./scripts/simulate-nexxau-violation.ts <worksiteId> <cameraId> [details]');
  process.exit(1);
}

const payload = {
  worksiteId,
  cameraId,
  details: details || 'Missing helmet',
  timestamp: new Date().toISOString(),
  severity: 'HIGH',
  location: 'Simulated Zone',
  confidence: 0.92,
  detectedObjects: [{ class: 'person', confidence: 0.98 }],
};

const bridgeUrl = process.env.NEXXAU_BRIDGE_URL || 'http://localhost:8787/nexxau/violations';

async function run() {
  const response = await fetch(bridgeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  if (!response.ok) {
    console.error(`Bridge responded with ${response.status}: ${text}`);
    process.exit(1);
  }

  console.log('Bridge response:', text);
}

run().catch((error) => {
  console.error('Failed to send simulated violation:', error);
  process.exit(1);
});
