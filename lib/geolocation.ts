import type { Coordinates } from "@/lib/weather";

export type GeolocationFailure = "unsupported" | "denied" | "unavailable";

/** Current device position, coarse and possibly cached: enough for a weather forecast. */
export function getDevicePosition(timeoutMs = 8_000): Promise<Coordinates> {
  return new Promise((resolve, reject: (reason: GeolocationFailure) => void) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      reject("unsupported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      (error) => reject(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable"),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 30 * 60 * 1000 },
    );
  });
}
