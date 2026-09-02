import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { MapPin } from "lucide-react";
import { shouldFetchAddressSuggestions } from "@/lib/addressSearch";
import {
  GeocodeError,
  searchAuPlaces,
  type GeocodedPlace,
} from "@/lib/maptilerGeocode";

const SEARCH_DEBOUNCE_MS = 300;

export interface AddressSearchFieldProps {
  id?: string;
  label: string;
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (place: GeocodedPlace) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Signup fields use a thinner 1px border and 10px radius. */
  compact?: boolean;
}

function geocodeErrorMessage(error: unknown): string {
  if (error instanceof GeocodeError) return error.message;
  return "Could not search addresses. Try again.";
}

export function AddressSearchField({
  id,
  label,
  query,
  onQueryChange,
  onSelect,
  placeholder = "e.g. 123 George Street, Sydney NSW 2000",
  disabled = false,
  compact = false,
}: AddressSearchFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listboxId = `${inputId}-listbox`;
  const statusId = `${inputId}-status`;
  const errorId = `${inputId}-error`;

  const [suggestions, setSuggestions] = useState<GeocodedPlace[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestGen = useRef(0);
  const committedQuery = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (blurTimer.current !== null) clearTimeout(blurTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!focused || disabled) return;
    if (committedQuery.current !== null && query !== committedQuery.current) {
      committedQuery.current = null;
    }
    if (
      !shouldFetchAddressSuggestions({
        focused: true,
        disabled: false,
        query,
        committedQuery: committedQuery.current,
      })
    ) {
      requestGen.current += 1;
      setSuggestions([]);
      setLoading(false);
      setError(null);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    const gen = ++requestGen.current;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      void searchAuPlaces(query.trim())
        .then((places) => {
          if (gen !== requestGen.current) return;
          setSuggestions(places);
          setOpen(true);
          setActiveIndex(places.length > 0 ? 0 : -1);
          setLoading(false);
        })
        .catch((caught: unknown) => {
          if (gen !== requestGen.current) return;
          setSuggestions([]);
          setOpen(false);
          setActiveIndex(-1);
          setError(geocodeErrorMessage(caught));
          setLoading(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [query, focused, disabled]);

  function clearBlurTimer() {
    if (blurTimer.current === null) return;
    clearTimeout(blurTimer.current);
    blurTimer.current = null;
  }

  function choose(place: GeocodedPlace) {
    committedQuery.current = place.label;
    requestGen.current += 1;
    onQueryChange(place.label);
    onSelect(place);
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
    setError(null);
    setLoading(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!open || suggestions.length === 0) {
      if (event.key === "ArrowDown" && suggestions.length > 0) {
        event.preventDefault();
        setOpen(true);
        setActiveIndex(0);
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
      return;
    }
    if (event.key === "Enter" && activeIndex >= 0 && suggestions[activeIndex]) {
      event.preventDefault();
      choose(suggestions[activeIndex]);
    }
  }

  const showList = open && focused && !disabled && (loading || suggestions.length > 0 || (query.trim().length >= 3 && !loading && !error));
  const inputBorder = compact
    ? "border border-[#e8e8e8] rounded-[10px] py-3"
    : "border-2 border-[#e8e8e8] rounded-[12px] py-3.5";

  return (
    <div className="relative">
      <label
        htmlFor={inputId}
        className="block mb-1.5 text-[13px]"
        style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 500, color: "#2d2d2d" }}
      >
        {label}
      </label>
      <div className="relative">
        <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5cb89c] pointer-events-none" />
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 && showList ? `${listboxId}-opt-${activeIndex}` : undefined}
          aria-busy={loading}
          aria-invalid={error !== null}
          aria-describedby={`${statusId}${error ? ` ${errorId}` : ""}`}
          autoComplete="off"
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          onChange={(event) => {
            committedQuery.current = null;
            onQueryChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            clearBlurTimer();
            setFocused(true);
          }}
          onBlur={() => {
            blurTimer.current = setTimeout(() => {
              setFocused(false);
              setOpen(false);
              setActiveIndex(-1);
            }, 150);
          }}
          onKeyDown={onKeyDown}
          className={`w-full pl-11 pr-4 ${inputBorder} focus:outline-none focus:border-[#5cb89c] transition-colors text-[14px] bg-white disabled:opacity-50`}
          style={{ fontFamily: "DM Sans, sans-serif" }}
        />
      </div>
      <p id={statusId} className="sr-only" aria-live="polite">
        {loading ? "Searching Australian addresses" : null}
      </p>
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#d85a30" }}>
          {error}
        </p>
      ) : null}
      {showList ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Australian address suggestions"
          className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-[#e8e8e8] rounded-[12px] shadow-md"
        >
          {loading ? (
            <li className="px-4 py-3 text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
              Searching addresses…
            </li>
          ) : suggestions.length === 0 ? (
            <li className="px-4 py-3 text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
              No Australian addresses found
            </li>
          ) : (
            suggestions.map((place, index) => (
              <li
                key={`${place.lat},${place.lng},${place.label}`}
                id={`${listboxId}-opt-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className={`px-4 py-2.5 cursor-pointer text-[13px] ${index === activeIndex ? "bg-[#e8f5f0]" : "bg-white hover:bg-[#f9fffe]"}`}
                style={{ fontFamily: "DM Sans, sans-serif", color: "#2d2d2d" }}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(place)}
              >
                {place.label}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
