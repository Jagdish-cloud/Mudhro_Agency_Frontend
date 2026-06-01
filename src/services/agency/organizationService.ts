import { apiClient } from "@/lib/apiClient";
import type { OrganizationProfile } from "@/types/organization";

export function getOrganization(orgId: string): Promise<OrganizationProfile> {
  return apiClient.get<OrganizationProfile>(
    `/api/organizations/${encodeURIComponent(orgId)}`,
  );
}
