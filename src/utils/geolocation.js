// ==============================================================================
// SMART GEOLOCATION RESOLVER WITH AUTOMATIC FALLBACK
// Resolves high-precision GPS, Wi-Fi tri-angulation, or IP Network coordinates
// Ensures location is NEVER blank even if browser permission or GPS sensor is restricted
// ==============================================================================

/**
 * Resolves geolocation with multi-tier fallback:
 * Tier 1: Browser GPS (high accuracy)
 * Tier 2: Browser Location (standard accuracy / Wi-Fi)
 * Tier 3: Secure IP-based Geolocation (Indore/Bhopal/Delhi/etc.)
 */
export async function resolveSmartLocation() {
  // Tier 1 & 2: Browser Geolocation API
  if (typeof window !== "undefined" && "geolocation" in navigator) {
    try {
      const position = await getBrowserPosition({ enableHighAccuracy: true, timeout: 4000 });
      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        source: "GPS",
        city: null,
        region: null,
        address: `Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)} (GPS)`,
        permissionDenied: false,
        error: null,
      };
    } catch (err1) {
      console.warn("High-accuracy GPS failed or timed out:", err1.message);

      // If user explicitly denied permission (code 1), don't bother with Tier 2 browser prompt
      if (err1.code !== 1) {
        try {
          const position = await getBrowserPosition({ enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 });
          return {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            source: "WIFI_NETWORK",
            city: null,
            region: null,
            address: `Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)} (Network)`,
            permissionDenied: false,
            error: null,
          };
        } catch (err2) {
          console.warn("Standard browser geolocation failed:", err2.message);
        }
      }

      // Tier 3: IP Geolocation Fallback
      const isPermissionDenied = err1.code === 1;
      const ipLocation = await fetchIpFallbackLocation();
      if (ipLocation) {
        return {
          ...ipLocation,
          permissionDenied: isPermissionDenied,
          error: isPermissionDenied
            ? "Browser location permission was blocked. Using network IP location."
            : null,
        };
      }

      return {
        lat: null,
        lng: null,
        accuracy: null,
        source: "UNAVAILABLE",
        city: null,
        region: null,
        address: null,
        permissionDenied: isPermissionDenied,
        error: isPermissionDenied
          ? "Location access is blocked in Chrome settings. Please click the location icon in your address bar."
          : err1.message,
      };
    }
  }

  // Fallback if browser doesn't have navigator.geolocation
  const ipLocation = await fetchIpFallbackLocation();
  if (ipLocation) return ipLocation;

  return {
    lat: null,
    lng: null,
    accuracy: null,
    source: "UNAVAILABLE",
    city: null,
    region: null,
    address: null,
    permissionDenied: false,
    error: "Geolocation sensor not supported",
  };
}

function getBrowserPosition(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

/**
 * IP Geolocation service using free, CORS-enabled endpoints
 */
async function fetchIpFallbackLocation() {
  // Provider 1: BigDataCloud Reverse Geocode Client (Fast, precise for India & worldwide)
  try {
    const res = await fetch("https://api.bigdatacloud.net/data/reverse-geocode-client", {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.latitude === "number" && typeof data.longitude === "number") {
        const city = data.city || data.locality || "";
        const region = data.principalSubdivision || "";
        const cityRegion = [city, region].filter(Boolean).join(", ");
        return {
          lat: data.latitude,
          lng: data.longitude,
          accuracy: 3000,
          source: "IP_NETWORK",
          city,
          region,
          address: cityRegion ? `${cityRegion} (Network IP)` : "Network IP Location",
          error: null,
        };
      }
    }
  } catch (err) {
    console.warn("BigDataCloud fallback failed:", err.message);
  }

  // Provider 2: ipwho.is
  try {
    const res = await fetch("https://ipwho.is/", {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && typeof data.latitude === "number" && typeof data.longitude === "number") {
        const city = data.city || "";
        const region = data.region || "";
        const cityRegion = [city, region].filter(Boolean).join(", ");
        return {
          lat: data.latitude,
          lng: data.longitude,
          accuracy: 5000,
          source: "IP_NETWORK",
          city,
          region,
          address: cityRegion ? `${cityRegion} (Network IP)` : "Network IP Location",
          error: null,
        };
      }
    }
  } catch (err) {
    console.warn("ipwho.is fallback failed:", err.message);
  }

  return null;
}
