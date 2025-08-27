import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + "/api",
  withCredentials: true,
});

// attach token
api.interceptors.request.use((config) => {
  const t = localStorage.getItem("accessToken");
  try {
    // lightweight debug: show outgoing requests in dev
    if (process.env.NODE_ENV !== 'production') {
      const shortStack = (new Error().stack || '').split('\n').slice(2,7).join('\n');
      console.debug('[api] request', config.method, config.url, new Date().toISOString(), '\n', shortStack);
    }
  } catch (e) {}
  // Attach Authorization if present.
  if (t) config.headers = { ...(config.headers || {}), Authorization: `Bearer ${t}` };

  // If no bearer token, try to get it from sessionStorage
  if (!t) {
    try {
      const userData = sessionStorage.getItem("userData");
      if (userData) {
        const user = JSON.parse(userData);
        if (user.tokens?.accessToken) {
          config.headers = { ...(config.headers || {}), Authorization: `Bearer ${user.tokens.accessToken}` };
        }
      }
    } catch (e) {
      console.error('Error getting token from session:', e);
    }
  }

  // If still no bearer token, attach stored CSRF token for stateful endpoints
  try {
    const csrf = window.__csrfToken;
    if (csrf && !(config.headers?.Authorization)) {
      config.headers = { ...(config.headers || {}), "X-CSRF-Token": csrf };
    }
  } catch (e) {}
  
  return config;
});

// MFA + auth redirects
// capture CSRF token from successful responses
api.interceptors.response.use(
  (r) => {
    try {
      const hdr = r?.headers?.["x-csrf-token"] || r?.data?.csrfToken;
      if (hdr) window.__csrfToken = hdr;
    } catch (e) {}
    return r;
  },
  (error) => {
    const status = error?.response?.status;
    const data = error?.response?.data;

    // Instead of forcing a full-page navigation here (which causes
    // race conditions with client-side router redirects and can lead
    // to redirect loops), dispatch a simple client-side event.
    // The React client will listen for this event and perform a
    // controlled router.replace(to) navigation.
    if (status === 401 && data?.data?.mfaRequired) {
      if (window.location.pathname !== "/mfa") {
        window.dispatchEvent(new CustomEvent("auth:redirect", { detail: { to: "/mfa" } }));
      }
      return Promise.reject(error);
    }

    if (status === 428) {
      if (window.location.pathname !== "/mfa-setup") {
        window.dispatchEvent(new CustomEvent("auth:redirect", { detail: { to: "/mfa-setup" } }));
      }
      return Promise.reject(error);
    }

    if (status === 429) {
      // Respect server-suggested rate limits. Set a global backoff so
      // client code can stop making repeated requests and retry later.
      const retryAfter = parseInt(error.response?.headers?.["retry-after"] || "0", 10);
      const waitMs = (isNaN(retryAfter) || retryAfter <= 0) ? 60 * 1000 : retryAfter * 1000;
      try {
        window.__apiBackoff = Date.now() + waitMs;
        window.dispatchEvent(new CustomEvent("api:throttled", { detail: { retryAfter: waitMs } }));
      } catch (e) {
        // ignore
      }
      return Promise.reject(error);
    }

    if (status === 401) {
      // Clear stored tokens so client components don't read a stale token
      // and immediately attempt to navigate back to protected pages.
      try {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      } catch (e) {
        /* ignore */
      }

      if (window.location.pathname !== "/login") {
        window.dispatchEvent(new CustomEvent("auth:redirect", { detail: { to: "/login" } }));
      }
    }
    // capture csrf from any response where server sets it (headers or body)
    try {
      const hdr = error?.response?.headers?.["x-csrf-token"] || error?.response?.data?.csrfToken;
      if (hdr) window.__csrfToken = hdr;
    } catch (e) {}

    return Promise.reject(error);
  }
);

export default api;

// Simple profile-fetch wrapper to deduplicate requests and cache result briefly.
let _profileCache = null;
let _profilePromise = null;

export async function getProfile(forceReload = false) {
  // honor global backoff
  const backoffUntil = window.__apiBackoff || 0;
  if (backoffUntil > Date.now()) {
    const err = new Error("Throttled");
    err.code = "THROTTLED";
    throw err;
  }

  if (!forceReload && _profileCache) return _profileCache;
  if (_profilePromise) return _profilePromise;

  _profilePromise = api
    .get("/profile/me", {
      // explicitly attach Authorization in case interceptor didn't run
      headers: (function () {
        try {
          const t = localStorage.getItem("accessToken");
          return t ? { Authorization: `Bearer ${t}` } : {};
        } catch (e) {
          return {};
        }
      })(),
    })
    .then((res) => {
      _profileCache = res.data?.data || null;
      _profilePromise = null;
      return _profileCache;
    })
    .catch((err) => {
      // on 401 clear cache
      try {
        if (err.response?.status === 401) _profileCache = null;
      } catch (e) {}
      _profilePromise = null;
      throw err;
    });

  return _profilePromise;
}

export function clearProfile() {
  _profileCache = null;
  _profilePromise = null;
}
