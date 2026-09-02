export class GeocodeError extends Error {
  readonly code: "missing_key" | "invalid_response" | "request_failed";

  constructor(code: GeocodeError["code"], message: string) {
    super(message);
    this.name = "GeocodeError";
    this.code = code;
  }
}

export interface GeocodedPlace {
  label: string;
  suburb: string;
  lat: number;
  lng: number;
}

export const DEFAULT_MAP_CENTER = { lat: -33.87257, lng: 151.20755 };
export const DEFAULT_MAP_ZOOM = 15.9;

const TILE_SIZE = 256;

export function maptilerKey(): string {
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "";
  return key.trim();
}

export function mapIframeUrl(lat: number, lng: number, zoom = DEFAULT_MAP_ZOOM): string {
  const key = maptilerKey();
  return `https://api.maptiler.com/maps/base-v4/?key=${encodeURIComponent(key)}#${zoom}/${lat}/${lng}`;
}

export function lngDegreesPerPixel(zoom: number): number {
  return 360 / (TILE_SIZE * 2 ** zoom);
}

export function latDegreesPerPixel(lat: number, zoom: number): number {
  return lngDegreesPerPixel(zoom) * Math.cos((lat * Math.PI) / 180);
}

export function pixelToLatLng(
  center: { lat: number; lng: number },
  zoom: number,
  x: number,
  y: number,
  width: number,
  height: number,
): { lat: number; lng: number } {
  const lng = center.lng + (x - width / 2) * lngDegreesPerPixel(zoom);
  const lat = center.lat - (y - height / 2) * latDegreesPerPixel(center.lat, zoom);
  return { lat, lng };
}

interface MaptilerContext {
  id?: unknown;
  text?: unknown;
  short_code?: unknown;
}

interface MaptilerFeature {
  place_name?: unknown;
  text?: unknown;
  center?: unknown;
  context?: unknown;
}

interface MaptilerGeocodingBody {
  features?: unknown;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) return null;
  return value as Record<string, unknown>;
}

function isAustralianContext(context: MaptilerContext[]): boolean {
  const country = context.find((item) => {
    const id = typeof item.id === "string" ? item.id : "";
    return id.startsWith("country.");
  });
  if (!country) return true;
  const short = typeof country.short_code === "string" ? country.short_code.toLowerCase() : "";
  if (short === "au" || short.startsWith("au-")) return true;
  const text = typeof country.text === "string" ? country.text.trim().toLowerCase() : "";
  return text === "australia";
}

function suburbFromContext(context: MaptilerContext[], fallbackText: string): string {
  const place = context.find((item) => {
    const id = typeof item.id === "string" ? item.id : "";
    return id.startsWith("place.") || id.startsWith("locality.");
  });
  if (place && typeof place.text === "string" && place.text.trim().length > 0) {
    return place.text.trim();
  }
  return fallbackText;
}

function parseFeature(raw: unknown): GeocodedPlace | null {
  const feature = asRecord(raw) as MaptilerFeature | null;
  if (!feature) return null;
  const center = feature.center;
  if (!Array.isArray(center) || center.length < 2) return null;
  const lng = typeof center[0] === "number" ? center[0] : Number(center[0]);
  const lat = typeof center[1] === "number" ? center[1] : Number(center[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const contextRaw = Array.isArray(feature.context) ? feature.context : [];
  const context: MaptilerContext[] = contextRaw.flatMap((item) => {
    const record = asRecord(item);
    return record ? [record as MaptilerContext] : [];
  });
  if (!isAustralianContext(context)) return null;

  const label =
    typeof feature.place_name === "string" && feature.place_name.trim().length > 0
      ? feature.place_name.trim()
      : typeof feature.text === "string"
        ? feature.text.trim()
        : "";
  if (label.length === 0) return null;
  const text = typeof feature.text === "string" ? feature.text.trim() : label;
  return {
    label,
    suburb: suburbFromContext(context, text),
    lat,
    lng,
  };
}

export function parseMaptilerGeocodingResponse(body: unknown): GeocodedPlace[] {
  const record = asRecord(body) as MaptilerGeocodingBody | null;
  if (!record || !Array.isArray(record.features)) {
    throw new GeocodeError("invalid_response", "MapTiler geocoding returned an unexpected payload.");
  }
  return record.features.flatMap((feature) => {
    const parsed = parseFeature(feature);
    return parsed ? [parsed] : [];
  });
}

async function geocodeRequest(path: string, fetchImpl: typeof fetch): Promise<GeocodedPlace[]> {
  const key = maptilerKey();
  if (key.length === 0) {
    throw new GeocodeError(
      "missing_key",
      "MapTiler key is missing. Address search needs NEXT_PUBLIC_MAPTILER_KEY.",
    );
  }
  const url = `https://api.maptiler.com/geocoding/${path}?key=${encodeURIComponent(key)}&language=en&country=au`;
  let response: Response;
  try {
    response = await fetchImpl(url);
  } catch {
    throw new GeocodeError("request_failed", "Could not reach MapTiler geocoding.");
  }
  if (!response.ok) {
    throw new GeocodeError("request_failed", `MapTiler geocoding failed (${response.status}).`);
  }
  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new GeocodeError("invalid_response", "MapTiler geocoding returned non-JSON.");
  }
  return parseMaptilerGeocodingResponse(json);
}

export async function searchAuPlaces(
  query: string,
  fetchImpl: typeof fetch = fetch,
): Promise<GeocodedPlace[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];
  return geocodeRequest(`${encodeURIComponent(trimmed)}.json`, fetchImpl);
}

export async function reverseGeocodeAu(
  lat: number,
  lng: number,
  fetchImpl: typeof fetch = fetch,
): Promise<GeocodedPlace | null> {
  const results = await geocodeRequest(`${lng},${lat}.json`, fetchImpl);
  return results[0] ?? null;
}
