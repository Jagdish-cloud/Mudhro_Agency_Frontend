import { apiClient, apiDownloadBlob, triggerBlobDownload } from "@/lib/apiClient";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import type { ChatListItem, ChatMessagePayload, ChatUploadTokenResponse, OrgUserBrief } from "@/types/internalChat";

function base(orgId: string): string {
  return `/api/organizations/${encodeURIComponent(orgId)}/internal-chat`;
}

export async function fetchChatList(orgId: string, params?: { search?: string; cursor?: string; limit?: number }) {
  return apiClient.get<{ items: ChatListItem[]; nextCursor: string | null }>(`${base(orgId)}/chats`, { query: params });
}

export async function fetchUnreadSummary(orgId: string) {
  return apiClient.get<{ totalUnreadMessages: number }>(`${base(orgId)}/summary/unread`);
}

export async function createDirectChat(orgId: string, peerOrganizationUserId: string) {
  return apiClient.post<{ chatId: string }>(`${base(orgId)}/chats/direct`, { peerOrganizationUserId });
}

export async function createGroupChat(
  orgId: string,
  body: { name?: string; memberOrganizationUserIds: string[]; imageFileId?: string },
) {
  return apiClient.post<{ chatId: string }>(`${base(orgId)}/chats/group`, body);
}

export async function updateGroupChat(
  orgId: string,
  chatId: string,
  body: {
    name?: string;
    imageFileId?: string | null;
    addMemberOrganizationUserIds?: string[];
    removeMemberOrganizationUserIds?: string[];
    promoteOrganizationUserIds?: string[];
  },
) {
  return apiClient.put<{ ok: boolean }>(`${base(orgId)}/chats/group/${encodeURIComponent(chatId)}`, body);
}

export async function fetchChatMessages(orgId: string, chatId: string, params?: { before?: string; limit?: number }) {
  return apiClient.get<{ messages: ChatMessagePayload[] }>(`${base(orgId)}/chats/${encodeURIComponent(chatId)}/messages`, {
    query: params,
  });
}

export async function sendChatMessage(orgId: string, body: Record<string, unknown>) {
  return apiClient.post<ChatMessagePayload>(`${base(orgId)}/messages`, body);
}

export async function markChatRead(orgId: string, chatId: string, readUpToMessageId: string) {
  return apiClient.put<{ ok: boolean }>(`${base(orgId)}/messages/read`, { chatId, readUpToMessageId });
}

/** Same-origin multipart upload (avoids CORS PUT to Azure SAS from the browser). */
export async function uploadChatAttachmentMultipart(orgId: string, file: File): Promise<{ fileId: string }> {
  return apiClient.uploadFile<{ fileId: string }>(`${base(orgId)}/files/upload`, file, {
    fieldName: "file",
  });
}

export async function requestUploadToken(orgId: string, body: { originalName: string; mimeType: string; byteSize: number }) {
  return apiClient.post<ChatUploadTokenResponse>(`${base(orgId)}/files/upload-token`, body);
}

export async function completeUpload(orgId: string, body: {
  storedName: string;
  blobPath: string;
  originalName: string;
  mimeType: string;
  byteSize: number;
}) {
  return apiClient.post<{ fileId: string }>(`${base(orgId)}/files/complete-upload`, body);
}

export async function searchChatUsers(orgId: string, q: string): Promise<{ users: OrgUserBrief[] }> {
  return apiClient.get(`${base(orgId)}/users/search`, { query: q ? { q } : {} });
}

export async function downloadChatAttachment(orgId: string, fileId: string, fallbackName: string): Promise<void> {
  const path = `${base(orgId)}/files/${encodeURIComponent(fileId)}/content`;
  const blob = await apiDownloadBlob(path);
  triggerBlobDownload(blob, fallbackName);
}

export async function fetchChatAttachmentBlob(orgId: string, fileId: string): Promise<Blob> {
  const path = `${base(orgId)}/files/${encodeURIComponent(fileId)}/content`;
  return apiDownloadBlob(path);
}

export function getChatSocketOrigin(): string {
  const raw = getApiBaseUrl();
  if (!raw) return "";
  try {
    const u = new URL(raw.includes("://") ? raw : `http://${raw}`);
    const path = u.pathname.replace(/\/$/, "");
    if (path.endsWith("/api")) u.pathname = path.slice(0, -4) || "/";
    return u.origin;
  } catch {
    return "";
  }
}
