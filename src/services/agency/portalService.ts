import { apiDownloadBlob, apiRequest } from "@/lib/apiClient";
import type { PortalInvoice } from "@/types/agencyInvoicing";

export function getPortalInvoiceApi(token: string): Promise<PortalInvoice> {
  return apiRequest<PortalInvoice>(`/api/public/invoices/${encodeURIComponent(token)}`, {
    skipAuth: true,
  });
}

export function markPortalInvoiceViewedApi(token: string): Promise<{ ok: boolean }> {
  return apiRequest(`/api/public/invoices/${encodeURIComponent(token)}/viewed`, {
    method: "POST",
    skipAuth: true,
  });
}

export function downloadPortalInvoicePdfApi(token: string): Promise<Blob> {
  return apiDownloadBlob(`/api/public/invoices/${encodeURIComponent(token)}/pdf`, {
    skipAuth: true,
  });
}
