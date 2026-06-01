export function getApiBaseUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (typeof base === "string" && base.length > 0) {
    return base.replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:4000";
  }
  return "";
}
