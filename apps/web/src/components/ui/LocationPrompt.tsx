"use client";

import { useCallback, useEffect, useState } from "react";
import { PixelBox } from "./PixelBox";
import { PillButton } from "./PillButton";
import { coarsenPoint, type LatLng } from "@/lib/geo";

const INTER = "Inter, sans-serif";

// Session-scoped, deliberately. The user's whereabouts are never written to the
// database — they last for this visit and no longer.
const STORAGE_KEY = "cc_location";

export type LocationStatus =
  | "idle"        // not asked yet
  | "prompting"   // waiting on the browser permission dialog
  | "granted"
  | "denied"      // user said no, or the browser blocked it
  | "unavailable"; // no geolocation API, or insecure context

export interface UseLocation {
  coords: LatLng | null;
  status: LocationStatus;
  /** Error copy to show inline, or null. */
  error: string | null;
  /**
   * False until the stored location has been read back after mount. Callers
   * should hold off on "no location yet" UI while this is false, or a cached
   * location flashes a prompt on first paint.
   */
  hydrated: boolean;
  request: () => void;
  clear: () => void;
}

function readStored(): LatLng | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return typeof p?.lat === "number" && typeof p?.lng === "number" ? p : null;
  } catch {
    return null;
  }
}

/**
 * Owns location permission for the session: the browser call, the coarsening,
 * and the sessionStorage cache. Both entry points (creating a nearby continuum
 * and filtering the list) go through this so their behaviour can't drift.
 */
export function useLocation(): UseLocation {
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // sessionStorage isn't available during SSR, so seed after mount.
  useEffect(() => {
    const stored = readStored();
    if (stored) {
      setCoords(stored);
      setStatus("granted");
    }
    setHydrated(true);
  }, []);

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      setError("This browser can't share a location.");
      return;
    }

    setStatus("prompting");
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Coarsen immediately, so precise coordinates never leave this callback.
        const next = coarsenPoint({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setCoords(next);
        setStatus("granted");
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Private mode can refuse writes — we still have it in memory.
        }
      },
      (err) => {
        // POSITION_UNAVAILABLE / TIMEOUT aren't refusals, so don't report them
        // as "denied" — the user may simply need to try again.
        if (err.code === err.PERMISSION_DENIED) {
          setStatus("denied");
          setError("Location access was blocked. You can allow it in your browser settings.");
        } else {
          setStatus("unavailable");
          setError("Couldn't get a location just now. Try again?");
        }
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 }
    );
  }, []);

  const clear = useCallback(() => {
    setCoords(null);
    setStatus("idle");
    setError(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* nothing to clean up */
    }
  }, []);

  return { coords, status, error, hydrated, request, clear };
}

interface Props {
  location: UseLocation;
  /** Why the location is being asked for, in the caller's own words. */
  reason: string;
  compact?: boolean;
}

/**
 * The consent step. Shown before any call to the geolocation API so the user
 * knows what the location is for before the browser's own dialog appears.
 */
export function LocationPrompt({ location, reason, compact }: Props) {
  const { status, error, request, clear } = location;

  if (status === "granted") {
    return (
      <p style={{ fontFamily: INTER, fontSize: 13, color: "#888", margin: "8px 0 0" }}>
        Using your approximate location.{" "}
        <button
          onClick={clear}
          style={{
            fontFamily: INTER, fontSize: 13, color: "#0083FF", background: "none",
            border: "none", cursor: "pointer", textDecoration: "underline", padding: 0,
          }}
        >
          Forget it
        </button>
      </p>
    );
  }

  const body = (
    <>
      <p style={{ fontFamily: INTER, fontSize: 14, color: "#1a1a1a", margin: 0, lineHeight: 1.5 }}>
        {reason}
      </p>
      <p style={{ fontFamily: INTER, fontSize: 12, color: "#888", margin: "6px 0 12px", lineHeight: 1.5 }}>
        Your location is rounded to under a mile and kept only for this visit.
      </p>
      <PillButton
        onClick={request}
        loading={status === "prompting"}
        fontSize="14px"
        label="Share my location"
      />
      {error && (
        <p style={{ fontFamily: INTER, fontSize: 12, color: "#c00", margin: "10px 0 0", lineHeight: 1.5 }}>
          {error}
        </p>
      )}
    </>
  );

  if (compact) return <div style={{ marginTop: 10 }}>{body}</div>;

  return (
    <div style={{ marginTop: 12, maxWidth: 420 }}>
      <PixelBox shadowDir="bottom-right" style={{ padding: "14px 16px" }}>
        {body}
      </PixelBox>
    </div>
  );
}
