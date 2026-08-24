import axios from "axios";
import { API_BASE_URL } from "@/services/api";
import { getAccessToken, getRefreshToken, persistSession } from "@/services/session";

// Decode JWT `exp` without a library — just base64 parse
function getTokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

// Schedule a silent token refresh 60s before the access token expires.
let proactiveRefreshTimer = null;

export function scheduleProactiveRefresh() {
  const token = getAccessToken();
  if (!token) return;

  const expiry = getTokenExpiry(token);
  if (!expiry) return;

  const msUntilRefresh = expiry - Date.now() - 60_000; // refresh 60s before expiry
  if (msUntilRefresh <= 0) return; // already near/past expiry — let 401 interceptor handle it

  clearTimeout(proactiveRefreshTimer);
  proactiveRefreshTimer = setTimeout(async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return;
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
      const authData = response.data.data;
      persistSession(authData.user, authData.tokens);
      scheduleProactiveRefresh(); // reschedule for the new token
    } catch {
      // Silently fail — the 401 interceptor in api.js will handle the next request
    }
  }, msUntilRefresh);
}
