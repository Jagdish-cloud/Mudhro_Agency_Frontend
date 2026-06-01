import { getAgencyToken, signOutAgency } from "@/lib/agencyAuth";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Array<{ path: string; message: string }>;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  signal?: AbortSignal;
  skipAuth?: boolean;
};

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const base = getApiBaseUrl();
  if (!base) {
    throw new ApiError(
      0,
      "API base URL is not configured. Set VITE_API_BASE_URL or run on localhost.",
    );
  }
  const joined = path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
  if (!query) return joined;

  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.append(key, String(value));
  });
  const qs = params.toString();
  return qs ? `${joined}?${qs}` : joined;
}

function handleUnauthorized(): void {
  signOutAgency();
  if (typeof window !== "undefined") {
    const next = `${window.location.pathname}${window.location.search}`;
    const redirectTo = `/sign-in${next && next !== "/" ? `?from=${encodeURIComponent(next)}` : ""}`;
    if (window.location.pathname !== "/sign-in") {
      window.location.assign(redirectTo);
    }
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, signal, skipAuth = false } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (!skipAuth) {
    const token = getAgencyToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    throw new ApiError(0, message);
  }

  if (response.status === 401) {
    handleUnauthorized();
    throw new ApiError(401, "Your session has expired. Please sign in again.");
  }

  let payload: ApiEnvelope<T> | null = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text) as ApiEnvelope<T>;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    let message =
      (payload && typeof payload.message === "string" && payload.message) ||
      `Request failed (${response.status})`;
    const errs =
      payload &&
      typeof payload === "object" &&
      "errors" in payload &&
      Array.isArray((payload as ApiEnvelope<T>).errors)
        ? (payload as ApiEnvelope<T>).errors
        : undefined;
    if (errs?.length) {
      const detail = errs.map((e) => `${e.path}: ${e.message}`).join("; ");
      message = `${message} — ${detail}`;
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (payload && typeof payload === "object" && "success" in payload) {
    if (payload.success === false) {
      throw new ApiError(response.status, payload.message ?? "Request failed.");
    }
    return (payload.data as T) ?? (undefined as unknown as T);
  }

  return (payload ?? (undefined as unknown as T)) as T;
}

export async function apiDownloadBlob(
  path: string,
  options: { query?: RequestOptions["query"]; skipAuth?: boolean } = {},
): Promise<Blob> {
  const headers: Record<string, string> = {};
  if (!options.skipAuth) {
    const token = getAgencyToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(buildUrl(path, options.query), { method: "GET", headers });
  if (response.status === 401) {
    handleUnauthorized();
    throw new ApiError(401, "Your session has expired. Please sign in again.");
  }
  if (!response.ok) {
    throw new ApiError(response.status, `Download failed (${response.status})`);
  }
  return await response.blob();
}

export async function apiUploadFile<T>(
  path: string,
  file: File | Blob,
  options: {
    fieldName?: string;
    query?: RequestOptions["query"];
    extraFields?: Record<string, string>;
    /** Used when appending a Blob (e.g. generated PDF). */
    filename?: string;
  } = {},
): Promise<T> {
  const form = new FormData();
  const field = options.fieldName ?? "file";
  if (file instanceof Blob && !(file instanceof File) && options.filename) {
    form.append(field, file, options.filename);
  } else {
    form.append(field, file);
  }
  if (options.extraFields) {
    Object.entries(options.extraFields).forEach(([k, v]) => form.append(k, v));
  }
  const headers: Record<string, string> = {};
  const token = getAgencyToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), { method: "POST", headers, body: form });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    throw new ApiError(0, message);
  }
  if (response.status === 401) {
    handleUnauthorized();
    throw new ApiError(401, "Your session has expired. Please sign in again.");
  }
  const text = await response.text();
  let payload: ApiEnvelope<T> | null = null;
  if (text) {
    try {
      payload = JSON.parse(text) as ApiEnvelope<T>;
    } catch {
      payload = null;
    }
  }
  if (!response.ok) {
    let message =
      (payload && typeof payload.message === "string" && payload.message) ||
      `Upload failed (${response.status})`;
    const errs =
      payload &&
      typeof payload === "object" &&
      "errors" in payload &&
      Array.isArray((payload as ApiEnvelope<T>).errors)
        ? (payload as ApiEnvelope<T>).errors
        : undefined;
    if (errs?.length) {
      const detail = errs.map((e) => `${e.path}: ${e.message}`).join("; ");
      message = `${message} — ${detail}`;
    }
    throw new ApiError(response.status, message);
  }
  if (payload && typeof payload === "object" && "success" in payload) {
    if (payload.success === false) {
      throw new ApiError(response.status, payload.message ?? "Upload failed.");
    }
    return (payload.data as T) ?? (undefined as unknown as T);
  }
  return (payload ?? (undefined as unknown as T)) as T;
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method">) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method">) =>
    apiRequest<T>(path, { ...options, method: "PATCH", body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method">) =>
    apiRequest<T>(path, { ...options, method: "PUT", body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
  downloadBlob: apiDownloadBlob,
  uploadFile: apiUploadFile,
};
