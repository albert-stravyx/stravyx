import type { GeocodedPlace } from "./maptilerGeocode";
import { PLATFORM_DURATION_MINUTES } from "./platformDuration";

export interface BookingSubmitLocation {
  address: string;
  suburb: string;
  lat: number;
  lng: number;
}

export function bookingLocationFromPlace(place: GeocodedPlace): BookingSubmitLocation {
  return {
    address: place.label,
    suburb: place.suburb,
    lat: place.lat,
    lng: place.lng,
  };
}

export function bookingEstimatedDuration(): number {
  return PLATFORM_DURATION_MINUTES;
}

/** Bump when a pin reverse-geocode starts or a typeahead pick commits. */
export function bumpLocationResolveGeneration(current: number): number {
  return current + 1;
}

export function isCurrentLocationResolve(started: number, current: number): boolean {
  return started === current;
}
