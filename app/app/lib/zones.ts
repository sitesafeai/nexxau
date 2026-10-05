/**
 * Camera zones — restricted/monitored areas drawn on a camera's view.
 *
 * COORDINATE SPACE IS THE WHOLE GAME HERE. Read this before touching anything.
 *
 * A zone is drawn in a browser on a video element that might be 800px wide. The bboxes
 * it gets compared against are in ORIGINAL frame pixels (1920px, or whatever the camera
 * actually produces), and the stored snapshot is a third size again (≤640px longest
 * side — see encode_frame in railway_service.py). Three different pixel spaces for the
 * same scene.
 *
 * So zone points are stored NORMALISED: x and y are fractions of frame width/height in
 * [0,1]. They are denormalised only at the moment of comparison, against the frame_size
 * the detector ships with each ingest payload. A zone stored in canvas pixels would
 * silently match the wrong region of the frame and nothing would error — the same trap
 * CLAUDE.md flags for bboxes.
 *
 * Zones live in Camera.metadata.zones (already Json?), so this needs no migration.
 */

export interface ZonePoint {
  /** Fraction of frame width, 0..1 */
  x: number;
  /** Fraction of frame height, 0..1 */
  y: number;
}

export type ZoneKind = 'restricted' | 'monitored' | 'safe';

export interface CameraZone {
  id: string;
  name: string;
  kind: ZoneKind;
  /** Normalised polygon, 3+ points, implicitly closed. */
  points: ZonePoint[];
  color?: string;
}

/** Where in a detection box we consider the subject to "be". */
export type ZoneAnchor = 'feet' | 'center';

export const DEFAULT_ZONE_ANCHOR: ZoneAnchor = 'feet';

/**
 * Reduce a bbox to the single point tested against the polygon.
 *
 * Default is 'feet' — the bottom-centre of the box — because a person standing on the
 * ground is located where their feet are. Using the box centre makes a tall worker
 * standing just outside a restricted area register as inside it, since their torso
 * overlaps the region in 2D image space. For overhead cameras or for objects rather than
 * people, 'center' is the better anchor.
 *
 * bbox is [x1, y1, x2, y2] in original frame pixels; the result is normalised.
 */
export function anchorPoint(
  bbox: [number, number, number, number],
  frameW: number,
  frameH: number,
  anchor: ZoneAnchor = DEFAULT_ZONE_ANCHOR
): ZonePoint | null {
  if (!frameW || !frameH) return null;
  const [x1, y1, x2, y2] = bbox;
  if (![x1, y1, x2, y2].every((n) => Number.isFinite(n))) return null;
  const cx = (x1 + x2) / 2;
  const y = anchor === 'feet' ? Math.max(y1, y2) : (y1 + y2) / 2;
  return { x: cx / frameW, y: y / frameH };
}

/**
 * Ray-casting point-in-polygon. Works on any simple polygon, convex or not, which
 * matters because people draw L-shaped exclusion areas around equipment.
 *
 * Points on an edge are not guaranteed either way — acceptable, since a detection
 * landing exactly on a boundary pixel is arbitrary anyway.
 */
export function isPointInPolygon(point: ZonePoint, polygon: ZonePoint[]): boolean {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersects =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** True when the detection's anchor point falls inside the zone. */
export function isDetectionInZone(
  bbox: [number, number, number, number],
  frameW: number,
  frameH: number,
  zone: CameraZone,
  anchor: ZoneAnchor = DEFAULT_ZONE_ANCHOR
): boolean {
  const p = anchorPoint(bbox, frameW, frameH, anchor);
  if (!p) return false;
  return isPointInPolygon(p, zone.points);
}

/**
 * Validate and clean zones coming from the client or out of Camera.metadata.
 *
 * Anything malformed is dropped rather than thrown on: metadata is untyped Json that
 * older code may have written in a different shape, and one bad zone must not break
 * every rule on the camera. Coordinates are clamped to [0,1] — a drag that ended
 * outside the video element would otherwise store points off-frame that can never match.
 */
export function parseZones(raw: unknown): CameraZone[] {
  if (!Array.isArray(raw)) return [];
  const out: CameraZone[] = [];
  for (const z of raw) {
    if (!z || typeof z !== 'object') continue;
    const o = z as Record<string, unknown>;
    const pts = Array.isArray(o.points) ? o.points : [];
    const points: ZonePoint[] = [];
    for (const p of pts) {
      if (!p || typeof p !== 'object') continue;
      const q = p as Record<string, unknown>;
      const x = Number(q.x);
      const y = Number(q.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      points.push({ x: clamp01(x), y: clamp01(y) });
    }
    // A polygon needs 3 corners. Fewer is a half-finished drawing, not a zone.
    if (points.length < 3) continue;
    const id = typeof o.id === 'string' && o.id ? o.id : null;
    if (!id) continue;
    const kind = (['restricted', 'monitored', 'safe'] as const).includes(o.kind as ZoneKind)
      ? (o.kind as ZoneKind)
      : 'restricted';
    out.push({
      id,
      name: typeof o.name === 'string' && o.name.trim() ? o.name.trim() : 'Unnamed zone',
      kind,
      points,
      color: typeof o.color === 'string' ? o.color : undefined,
    });
  }
  return out;
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/** Read zones off a Camera.metadata blob. */
export function zonesFromCameraMetadata(metadata: unknown): CameraZone[] {
  if (!metadata || typeof metadata !== 'object') return [];
  return parseZones((metadata as Record<string, unknown>).zones);
}
