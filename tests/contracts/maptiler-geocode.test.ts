import { describe, expect, it } from "vitest";
import {
  GeocodeError,
  DEFAULT_MAP_ZOOM,
  parseMaptilerGeocodingResponse,
  pixelToLatLng,
  searchAuPlaces,
} from "../../apps/app-web/src/lib/maptilerGeocode.ts";

const sydneyFeature = {
  place_name: "1 Martin Place, Sydney NSW 2000, Australia",
  text: "1 Martin Place",
  center: [151.2093, -33.8688],
  context: [
    { id: "place.sydney", text: "Sydney" },
    { id: "region.nsw", short_code: "AU-NSW", text: "New South Wales" },
    { id: "country.au", short_code: "au", text: "Australia" },
  ],
};

describe("parseMaptilerGeocodingResponse", () => {
  it("maps AU features to label, suburb and lat/lng", () => {
    const places = parseMaptilerGeocodingResponse({ features: [sydneyFeature] });
    expect(places).toEqual([
      {
        label: "1 Martin Place, Sydney NSW 2000, Australia",
        suburb: "Sydney",
        lat: -33.8688,
        lng: 151.2093,
      },
    ]);
  });

  it("drops features whose country is not Australia", () => {
    const places = parseMaptilerGeocodingResponse({
      features: [
        {
          ...sydneyFeature,
          place_name: "Queen Street, Auckland, New Zealand",
          context: [
            { id: "place.auckland", text: "Auckland" },
            { id: "country.nz", short_code: "nz", text: "New Zealand" },
          ],
        },
      ],
    });
    expect(places).toEqual([]);
  });

  it("throws invalid_response when features is missing", () => {
    expect(() => parseMaptilerGeocodingResponse({})).toThrow(GeocodeError);
  });
});

describe("pixelToLatLng", () => {
  it("returns the map centre at the midpoint pixel", () => {
    const center = { lat: -33.87257, lng: 151.20755 };
    const result = pixelToLatLng(center, DEFAULT_MAP_ZOOM, 200, 130, 400, 260);
    expect(result.lat).toBeCloseTo(center.lat, 8);
    expect(result.lng).toBeCloseTo(center.lng, 8);
  });

  it("moves east and south when the pixel is to the bottom-right of centre", () => {
    const center = { lat: -33.87257, lng: 151.20755 };
    const result = pixelToLatLng(center, DEFAULT_MAP_ZOOM, 300, 180, 400, 260);
    expect(result.lng).toBeGreaterThan(center.lng);
    expect(result.lat).toBeLessThan(center.lat);
  });
});

describe("searchAuPlaces", () => {
  it("throws missing_key when the MapTiler key is empty", async () => {
    const previous = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    process.env.NEXT_PUBLIC_MAPTILER_KEY = "";
    await expect(searchAuPlaces("Martin Place")).rejects.toMatchObject({ code: "missing_key" });
    process.env.NEXT_PUBLIC_MAPTILER_KEY = previous;
  });
});
