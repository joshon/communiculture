// Geography for location-scoped ("NEARBY") continuums.
//
// IMPORTANT: proximity here is a *discovery filter*, never an access control
// boundary. Coordinates are self-reported by the browser, so any caller can
// claim to be anywhere. NEARBY continuums are readable by anyone who has the
// link — the radius only decides what surfaces in a listing. Don't build a
// permission check on top of this.

/** The one radius the product talks about, in miles. */
export const RADIUS_MILES = 5;

/**
 * Decimal places kept on stored coordinates. 2dp is ~0.7 miles of latitude,
 * which is small next to a 5-mile radius but coarse enough that a publicly
 * readable continuum never pinpoints where its creator was standing.
 *
 * User-facing copy says "under a mile" — this product talks in miles, so don't
 * reintroduce kilometres in the UI.
 */
const PRECISION_DP = 2;

const EARTH_RADIUS_MILES = 3958.8;

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Reduce a coordinate to PRECISION_DP. Applied in the browser before sending
 * and again on the server before writing — the server call is the one that
 * actually guarantees the limit, since the client can send anything.
 */
export function coarsen(n: number): number {
  const f = 10 ** PRECISION_DP;
  return Math.round(n * f) / f;
}

export function coarsenPoint(p: LatLng): LatLng {
  return { lat: coarsen(p.lat), lng: coarsen(p.lng) };
}

/** True for a real, in-range coordinate pair. Rejects NaN/Infinity. */
export function isValidLatLng(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" && Number.isFinite(lat) && Math.abs(lat) <= 90 &&
    typeof lng === "number" && Number.isFinite(lng) && Math.abs(lng) <= 180
  );
}

/**
 * Great-circle distance in miles.
 *
 * Haversine assumes a sphere, so it's off by up to ~0.5% versus the real
 * ellipsoid — about 40 yards over 5 miles, well inside the ~0.7 miles of fuzz
 * that coarsen() already introduces.
 */
export function haversineMiles(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

export function isWithinRadius(a: LatLng, b: LatLng, miles = RADIUS_MILES): boolean {
  return haversineMiles(a, b) <= miles;
}

/**
 * Lat/lng bounds enclosing a radius around a point — a cheap, indexable
 * prefilter for SQL.
 *
 * This is an OVER-approximation: the box's corners lie outside the circle, so
 * always follow it with haversineMiles() to make the actual decision. Unused
 * while the listing filters in memory, but kept here so moving the filter into
 * the query later doesn't mean rediscovering the maths.
 */
export function boundingBox(center: LatLng, miles = RADIUS_MILES) {
  const latDelta = (miles / EARTH_RADIUS_MILES) * (180 / Math.PI);

  // Longitude degrees shrink toward the poles. Clamp the cosine so a point near
  // a pole widens the box instead of dividing by ~0.
  const cosLat = Math.max(Math.cos((center.lat * Math.PI) / 180), 1e-6);
  const lngDelta = latDelta / cosLat;

  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
  };
}
