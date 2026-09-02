import { describe, expect, it } from "vitest";
import {
  bookingEstimatedDuration,
  bookingLocationFromPlace,
  bumpLocationResolveGeneration,
  isCurrentLocationResolve,
} from "../../apps/app-web/src/lib/bookingLocation.ts";
import { PLATFORM_DURATION_MINUTES } from "../../apps/app-web/src/lib/platformDuration.ts";

describe("bookingLocationFromPlace", () => {
  it("uses the geocoded pin rather than randomized Sydney coords", () => {
    const location = bookingLocationFromPlace({
      label: "88 Market Street, Sydney NSW 2000, Australia",
      suburb: "Sydney",
      lat: -33.8701,
      lng: 151.2089,
    });
    expect(location).toEqual({
      address: "88 Market Street, Sydney NSW 2000, Australia",
      suburb: "Sydney",
      lat: -33.8701,
      lng: 151.2089,
    });
    expect(location.lat).not.toBeCloseTo(-33.87257, 3);
  });
});

describe("bookingEstimatedDuration", () => {
  it("is the platform 60 minute estimate", () => {
    expect(bookingEstimatedDuration()).toBe(60);
    expect(bookingEstimatedDuration()).toBe(PLATFORM_DURATION_MINUTES);
  });
});

describe("location resolve generation", () => {
  it("discards a pin reverse-geocode after a newer typeahead pick", () => {
    let gen = 0;
    const pinStart = bumpLocationResolveGeneration(gen);
    gen = pinStart;
    gen = bumpLocationResolveGeneration(gen);
    expect(isCurrentLocationResolve(pinStart, gen)).toBe(false);
  });

  it("still commits a pin reverse-geocode when nothing newer selected", () => {
    let gen = 0;
    const pinStart = bumpLocationResolveGeneration(gen);
    gen = pinStart;
    expect(isCurrentLocationResolve(pinStart, gen)).toBe(true);
  });
});
