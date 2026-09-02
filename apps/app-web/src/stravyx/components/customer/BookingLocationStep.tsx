import { useEffect, useRef, useState, type PointerEvent } from "react";
import { MapPin as MapPinIcon } from "lucide-react";
import { AddressSearchField } from "../AddressSearchField";
import {
  bumpLocationResolveGeneration,
  isCurrentLocationResolve,
} from "@/lib/bookingLocation";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  GeocodeError,
  mapIframeUrl,
  pixelToLatLng,
  reverseGeocodeAu,
  type GeocodedPlace,
} from "@/lib/maptilerGeocode";

export function LocationStep({
  place,
  onChange,
}: {
  place: GeocodedPlace | null;
  onChange: (place: GeocodedPlace | null) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(place?.label ?? "");
  const [mapCenter, setMapCenter] = useState({
    lat: place?.lat ?? DEFAULT_MAP_CENTER.lat,
    lng: place?.lng ?? DEFAULT_MAP_CENTER.lng,
  });
  const [pinVisible, setPinVisible] = useState(place !== null);
  const [dragging, setDragging] = useState(false);
  const [dragPx, setDragPx] = useState<{ x: number; y: number } | null>(null);
  const [resolving, setResolving] = useState(false);
  const [reverseError, setReverseError] = useState<string | null>(null);
  const resolveGen = useRef(0);
  const ignoreMapUp = useRef(false);

  useEffect(() => {
    if (place) setQuery(place.label);
  }, [place]);

  function commitPlace(next: GeocodedPlace) {
    setQuery(next.label);
    setMapCenter({ lat: next.lat, lng: next.lng });
    setPinVisible(true);
    setReverseError(null);
    onChange(next);
  }

  function applySelectedPlace(next: GeocodedPlace) {
    resolveGen.current = bumpLocationResolveGeneration(resolveGen.current);
    setResolving(false);
    commitPlace(next);
  }

  async function resolveFromCoords(lat: number, lng: number) {
    const gen = bumpLocationResolveGeneration(resolveGen.current);
    resolveGen.current = gen;
    setResolving(true);
    setReverseError(null);
    onChange(null);
    try {
      const result = await reverseGeocodeAu(lat, lng);
      if (!isCurrentLocationResolve(gen, resolveGen.current)) return;
      if (!result) {
        setReverseError("Could not resolve an Australian address at that pin.");
        return;
      }
      commitPlace({
        label: result.label,
        suburb: result.suburb,
        lat,
        lng,
      });
    } catch (caught: unknown) {
      if (!isCurrentLocationResolve(gen, resolveGen.current)) return;
      if (caught instanceof GeocodeError) {
        setReverseError(caught.message);
      } else {
        setReverseError("Could not reverse-geocode that pin.");
      }
    } finally {
      if (isCurrentLocationResolve(gen, resolveGen.current)) setResolving(false);
    }
  }

  function dropAtPixel(x: number, y: number) {
    const el = mapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const coords = pixelToLatLng(mapCenter, DEFAULT_MAP_ZOOM, x, y, rect.width, rect.height);
    setMapCenter(coords);
    setPinVisible(true);
    setDragPx(null);
    setDragging(false);
    void resolveFromCoords(coords.lat, coords.lng);
  }

  function handleMapPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragging || ignoreMapUp.current) return;
    const target = event.target;
    if (target instanceof Element && target.closest("[data-map-pin]")) return;
    const el = mapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dropAtPixel(event.clientX - rect.left, event.clientY - rect.top);
  }

  function handlePinPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.stopPropagation();
    event.preventDefault();
    ignoreMapUp.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const el = mapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setDragging(true);
    setDragPx({ x: rect.width / 2, y: rect.height / 2 });
  }

  function handlePinPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const el = mapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setDragPx({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  }

  function handlePinPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!dragging || !dragPx) return;
    event.stopPropagation();
    dropAtPixel(dragPx.x, dragPx.y);
    queueMicrotask(() => {
      ignoreMapUp.current = false;
    });
  }

  function handlePinPointerCancel() {
    setDragging(false);
    setDragPx(null);
    ignoreMapUp.current = false;
  }

  const pinStyle =
    dragging && dragPx
      ? { left: dragPx.x, top: dragPx.y, transform: "translate(-50%, -100%)" }
      : { left: "50%", top: "50%", transform: "translate(-50%, -100%)" };

  return (
    <div>
      <h2 className="text-[24px] mb-1" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
        Where is the job?
      </h2>
      <p className="text-[15px] mb-4" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
        Search an Australian address, then tap or drag the pin to fine-tune the site. Keyboard users can search and pick a suggestion.
      </p>

      <div
        ref={mapRef}
        className="relative rounded-[16px] overflow-hidden border-2 border-[#e8e8e8] hover:border-[#5cb89c] transition-colors mb-4 cursor-crosshair"
        style={{ height: "260px", touchAction: "none" }}
        role="region"
        aria-label="Job location map. Tap to drop a pin or drag the pin to adjust."
        onPointerUp={handleMapPointerUp}
      >
        <iframe
          src={mapIframeUrl(mapCenter.lat, mapCenter.lng)}
          className="absolute inset-0 w-full h-full border-none pointer-events-none"
          title="Job location map"
        />

        {!pinVisible && (
          <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
            <div className="bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2 shadow-sm">
              <MapPinIcon size={14} className="text-[#5cb89c]" />
              <span className="text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}>
                Tap to drop a pin
              </span>
            </div>
          </div>
        )}

        {pinVisible && (
          <div
            data-map-pin=""
            className="absolute z-[2]"
            style={{
              ...pinStyle,
              pointerEvents: "auto",
              cursor: dragging ? "grabbing" : "grab",
              touchAction: "none",
            }}
            onPointerDown={handlePinPointerDown}
            onPointerMove={handlePinPointerMove}
            onPointerUp={handlePinPointerUp}
            onPointerCancel={handlePinPointerCancel}
          >
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-1.5 bg-black/20 rounded-full blur-[2px]" style={{ bottom: "-4px" }} />
            <svg width="28" height="36" viewBox="0 0 28 36" fill="none" aria-hidden="true">
              <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22S28 24.5 28 14C28 6.268 21.732 0 14 0z" fill="#5cb89c" />
              <circle cx="14" cy="14" r="6" fill="white" />
              <circle cx="14" cy="14" r="3" fill="#5cb89c" />
            </svg>
            <div
              className="absolute rounded-full border-2 border-[#5cb89c]/40 animate-ping"
              style={{ width: 28, height: 28, top: 0, left: 0 }}
            />
          </div>
        )}

        {resolving && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white rounded-full px-3 py-1.5 flex items-center gap-2 shadow-sm z-[3] pointer-events-none">
            <div className="w-3 h-3 border-2 border-[#5cb89c] border-t-transparent rounded-full animate-spin" />
            <span className="text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>Locating address…</span>
          </div>
        )}

        {pinVisible && !resolving && !reverseError && (
          <div className="absolute bottom-3 right-3 bg-white/90 rounded-full px-2.5 py-1 z-[3] pointer-events-none">
            <span className="text-[11px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>Drag or tap to move pin</span>
          </div>
        )}

        {reverseError && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white rounded-full px-3 py-1.5 shadow-sm z-[3] max-w-[90%] pointer-events-none">
            <p role="alert" className="text-[12px] text-center" style={{ fontFamily: "DM Sans, sans-serif", color: "#d85a30" }}>
              {reverseError}
            </p>
          </div>
        )}
      </div>

      <AddressSearchField
        id="booking-site-address"
        label="Site address"
        query={query}
        onQueryChange={(next) => {
          setQuery(next);
          if (!place || next !== place.label) onChange(null);
        }}
        onSelect={applySelectedPlace}
        placeholder="Search an Australian address"
      />
    </div>
  );
}
