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
  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

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
