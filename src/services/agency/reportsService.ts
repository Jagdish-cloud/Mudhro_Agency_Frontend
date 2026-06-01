import { apiClient, apiDownloadBlob } from "@/lib/apiClient";
import type {
  ClientReportDto,
  OverallReportDto,
  PaymentPendingReportDto,
  ReportPeriodQuery,
} from "@/types/agencyReports";

function orgBase(orgId: string): string {
  return `/api/organizations/${encodeURIComponent(orgId)}`;
}

function periodToQuery(q: ReportPeriodQuery): Record<string, string | number | undefined> {
  return {
    month: q.month,
    year: q.year,
    from: q.from,
    to: q.to,
  };
}

export function getOverallReportApi(
  orgId: string,
  query: ReportPeriodQuery,
): Promise<OverallReportDto> {
  return apiClient.get<OverallReportDto>(`${orgBase(orgId)}/reports/overall`, {
    query: periodToQuery(query),
  });
}

export function downloadOverallReportPdfApi(
  orgId: string,
  query: ReportPeriodQuery,
): Promise<Blob> {
  return apiDownloadBlob(`${orgBase(orgId)}/reports/overall/pdf`, {
    query: periodToQuery(query),
  });
}

export function getClientReportApi(
  orgId: string,
  clientId: string,
  query: ReportPeriodQuery,
): Promise<ClientReportDto> {
  return apiClient.get<ClientReportDto>(
    `${orgBase(orgId)}/reports/clients/${encodeURIComponent(clientId)}`,
    { query: periodToQuery(query) },
  );
}

export function downloadClientReportPdfApi(
  orgId: string,
  clientId: string,
  query: ReportPeriodQuery,
): Promise<Blob> {
  return apiDownloadBlob(
    `${orgBase(orgId)}/reports/clients/${encodeURIComponent(clientId)}/pdf`,
    { query: periodToQuery(query) },
  );
}

export function getPaymentPendingReportApi(
  orgId: string,
  query: ReportPeriodQuery,
): Promise<PaymentPendingReportDto> {
  return apiClient.get<PaymentPendingReportDto>(`${orgBase(orgId)}/reports/payment-pending`, {
    query: periodToQuery(query),
  });
}

export function downloadPaymentPendingReportPdfApi(
  orgId: string,
  query: ReportPeriodQuery,
): Promise<Blob> {
  return apiDownloadBlob(`${orgBase(orgId)}/reports/payment-pending/pdf`, {
    query: periodToQuery(query),
  });
}
