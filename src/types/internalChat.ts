export type ChatListItem = {
  id: string;
  type: string;
  title: string;
  groupName: string | null;
  unreadCount: number;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  updatedAt: string;
  memberCount: number;
  onlinePeer: boolean | null;
  peerUserId: string | null;
};

export type ChatMessagePayload = {
  id: string;
  chatId: string;
  senderOrganizationUserId: string;
  messageType: string;
  bodyText: string | null;
  file: null | {
    id: string;
    originalName: string;
    mimeType: string;
    byteSize: number;
  };
  replyMessageId: string | null;
  edited: boolean;
  deleted: boolean;
  clientMessageId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ChatUploadTokenResponse = {
  uploadUrl: string;
  blobPath: string;
  storedName: string;
  expiresAt: string;
};

export type OrgUserBrief = {
  id: string;
  name: string;
  email: string;
  /** Present when roster includes presence fields */
  is_online?: boolean;
};