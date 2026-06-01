import { apiClient, triggerBlobDownload } from "@/lib/apiClient";
import type {
  AgreementDto,
  CreateAgreementInput,
  PortalAgreementResponse,
  SendAgreementResponse,
  SignAgreementInput,
  UpdateAgreementInput,
} from "@/types/agency/agreement";

function orgBase(orgId: string): string {
  return `/api/organizations/${encodeURIComponent(orgId)}`;
}

const publicAgreementsPath = "/api/public/agreements";

export function createAgreementApi(
  orgId: string,
  projectId: string,
  body: CreateAgreementInput,
): Promise<AgreementDto> {
  return apiClient.post<AgreementDto>(
    `${orgBase(orgId)}/projects/${encodeURIComponent(projectId)}/agreements`,
    body,
  );
}

export function getAgreementByProjectApi(
  orgId: string,
  projectId: string,
): Promise<AgreementDto> {
  return apiClient.get<AgreementDto>(
    `${orgBase(orgId)}/projects/${encodeURIComponent(projectId)}/agreement`,
  );
}

export function getAgreementApi(orgId: string, agreementId: string): Promise<AgreementDto> {
  return apiClient.get<AgreementDto>(
    `${orgBase(orgId)}/agreements/${encodeURIComponent(agreementId)}`,
  );
}

export function updateAgreementApi(
  orgId: string,
  agreementId: string,
  body: UpdateAgreementInput,
): Promise<AgreementDto> {
  return apiClient.patch<AgreementDto>(
    `${orgBase(orgId)}/agreements/${encodeURIComponent(agreementId)}`,
    body,
  );
}

export function deleteAgreementApi(orgId: string, agreementId: string): Promise<{ id: string }> {
  return apiClient.delete<{ id: string }>(
    `${orgBase(orgId)}/agreements/${encodeURIComponent(agreementId)}`,
  );
}

export async function downloadAgreementPdfApi(
  orgId: string,
  agreementId: string,
  filename = "agreement.pdf",
): Promise<void> {
  const blob = await apiClient.downloadBlob(
    `${orgBase(orgId)}/agreements/${encodeURIComponent(agreementId)}/pdf`,
  );
  triggerBlobDownload(blob, filename);
}

export async function downloadAgreementPdfByTokenApi(
  token: string,
  filename = "agreement.pdf",
): Promise<void> {
  const blob = await apiClient.downloadBlob(
    `${publicAgreementsPath}/${encodeURIComponent(token)}/pdf`,
    { skipAuth: true },
  );
  triggerBlobDownload(blob, filename);
}

export function sendAgreementToClientsApi(
  orgId: string,
  agreementId: string,
  clientIds: string[],
): Promise<SendAgreementResponse> {
  return apiClient.post<SendAgreementResponse>(
    `${orgBase(orgId)}/agreements/${encodeURIComponent(agreementId)}/send`,
    { clientIds },
  );
}

export function getAgreementByTokenApi(token: string): Promise<PortalAgreementResponse> {
  return apiClient.get<PortalAgreementResponse>(
    `${publicAgreementsPath}/${encodeURIComponent(token)}`,
    { skipAuth: true },
  );
}

export function submitClientSignatureApi(
  token: string,
  body: SignAgreementInput,
): Promise<{ pdfUrl: string | null; completed: boolean }> {
  return apiClient.post<{ pdfUrl: string | null; completed: boolean }>(
    `${publicAgreementsPath}/${encodeURIComponent(token)}`,
    body,
    { skipAuth: true },
  );
}

export function resignClientSignatureApi(
  token: string,
  body: SignAgreementInput,
): Promise<{ pdfUrl: string | null; completed: boolean }> {
  return apiClient.patch<{ pdfUrl: string | null; completed: boolean }>(
    `${publicAgreementsPath}/${encodeURIComponent(token)}`,
    body,
    { skipAuth: true },
  );
}
