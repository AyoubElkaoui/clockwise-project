// Patches window.fetch once so that same-app "/api/" requests automatically carry the
// Bearer token from localStorage. This covers the raw fetch() calls throughout the app
// that go straight to the backend (API_URL) and therefore bypass both the axios
// interceptors and the Next proxy's cookie injection.
//
// Safe by design:
//  - Only touches requests whose URL contains "/api/".
//  - Never overrides an Authorization header that is already present.
//  - Only rewrites string/URL inputs (leaves Request objects untouched).
//  - Any failure falls through to the original fetch.
import { handleUnauthorized } from "./api";

if (typeof window !== "undefined") {
  const w = window as unknown as { __authFetchPatched?: boolean };
  if (!w.__authFetchPatched) {
    w.__authFetchPatched = true;
    const originalFetch = window.fetch.bind(window);

    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      try {
        if (typeof input === "string" || input instanceof URL) {
          const url = typeof input === "string" ? input : input.href;
          const token =
            typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;
          if (token && url.includes("/api/")) {
            const headers = new Headers(init?.headers);
            if (!headers.has("Authorization")) {
              headers.set("Authorization", `Bearer ${token}`);
              init = { ...init, headers };
            }
          }
        }
      } catch {
        // Never let auth injection break a request.
      }
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.href : "";
      return originalFetch(input as RequestInfo | URL, init).then((res) => {
        if (res.status === 401 && url.includes("/api/") && !url.includes("/api/auth/login")) {
          handleUnauthorized();
        }
        return res;
      });
    }) as typeof fetch;
  }
}

