declare global {
  interface Window {
    __RUNTIME_CONFIG__?: { apiBaseUrl?: string };
  }
}

function resolveRuntimeApiBaseUrl(): string {
  const runtime = typeof window !== "undefined" ? window.__RUNTIME_CONFIG__?.apiBaseUrl : undefined;
  if (typeof runtime === "string" && runtime.trim().length > 0) {
    return runtime.trim().replace(/\/$/, "");
  }
  return "";
}

export function getApiBaseUrl(): string {
  const runtimeBase = resolveRuntimeApiBaseUrl();
  const viteBase = import.meta.env.VITE_API_BASE_URL;
  const hostname = typeof window !== "undefined" ? window.location.hostname : "(ssr)";
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

  // #region agent log
  fetch("http://127.0.0.1:7827/ingest/9ec34269-f716-49e0-8a79-6f17b10dc77c", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "b4e0e6" },
    body: JSON.stringify({
      sessionId: "b4e0e6",
      hypothesisId: "A,B,C,D",
      location: "apiBaseUrl.ts:getApiBaseUrl",
      message: "resolve api base",
      data: {
        hostname,
        isLocalhost,
        hasRuntimeBase: runtimeBase.length > 0,
        viteBaseType: typeof viteBase,
        viteBaseLength: typeof viteBase === "string" ? viteBase.length : 0,
        viteBaseEmpty: viteBase === "" || viteBase === undefined,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  if (runtimeBase.length > 0) {
    return runtimeBase;
  }

  if (typeof viteBase === "string" && viteBase.length > 0) {
    return viteBase.replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && isLocalhost) {
    return "http://localhost:4000";
  }
  return "";
}
