import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import type { AdminLoginPayload, AdminLoginResponse } from "@/types/auth";

export async function adminLogin(payload: AdminLoginPayload): Promise<AdminLoginResponse> {
  const base = getApiBaseUrl();
  const url = `${base}/api/auth/admin/login`;

  if (!base) {
    throw new Error("API base URL is not configured. Set VITE_API_BASE_URL or run on localhost.");
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw error;
  }

  if (!res.ok) {
    let message = `Sign-in failed (${res.status})`;
    try {
      const data = (await res.json()) as { message?: string };
      if (typeof data.message === "string" && data.message.length > 0) {
        message = data.message;
      }
    } catch {
      const text = await res.text().catch(() => "");
      if (text) message = text;
    }
    throw new Error(message);
  }

  return (await res.json()) as AdminLoginResponse;
}
