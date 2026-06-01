import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import type {
  OrganizationRegistrationPayload,
  OrganizationRegistrationResponse,
} from "@/types/organization";

/**
 * Registers a new organization with contact persons and admins.
 * When no `VITE_API_BASE_URL` is set, simulates success for local UI development.
 */
export async function registerOrganization(
  payload: OrganizationRegistrationPayload,
): Promise<OrganizationRegistrationResponse> {
  const base = getApiBaseUrl();
  if (!base) {
    await new Promise((r) => setTimeout(r, 900));
    return {
      id: crypto.randomUUID(),
      organizationName: payload.organization.name,
      message: "Registration simulated (set VITE_API_BASE_URL to call your API).",
    };
  }

  const res = await fetch(`${base}/api/organizations/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Registration failed (${res.status})`);
  }

  return (await res.json()) as OrganizationRegistrationResponse;
}
