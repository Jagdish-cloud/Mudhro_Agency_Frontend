import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { ChatMessageInput } from "@/components/chat/MessageInput";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import type { ChatMessagePayload } from "@/types/internalChat";

import { MessageBubble } from "./MessageBubble";

type ChatWindowProps = {
  title: string;
  subtitle?: string;
  viewerId: string;
  orgId?: string | null;
  typing: boolean;
  messages: ChatMessagePayload[];
  onSendText: (t: string, clientId: string) => Promise<void>;
  onTyping: (typing: boolean) => void;
  fileSlot?: ReactNode;
  /** When user focuses or taps the transcript, treat conversation as viewed. */
  onThreadInteract?: () => void;
  peerInitials?: string;
  busy?: boolean;
  onAttachmentDownload?: (fileId: string, name: string) => void;
};

export function ChatWindow({
  title,
  subtitle,
  viewerId,
  orgId,
  typing,
  messages,
  onSendText,
  onTyping,
  fileSlot,
  onThreadInteract,
  peerInitials,
  busy,
  onAttachmentDownload,
}: ChatWindowProps) {
  return (
    <Card className="flex h-full min-h-[28rem] flex-col overflow-hidden border-border lg:min-h-[calc(100dvh-14rem)]">
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div
          className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3"
          role="log"
          tabIndex={0}
          onPointerDown={() => onThreadInteract?.()}
          onFocus={() => onThreadInteract?.()}
        >
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              isMine={m.senderOrganizationUserId === viewerId}
              peerInitials={peerInitials}
              orgId={orgId ?? undefined}
              onDownloadFile={onAttachmentDownload}
            />
          ))}
          {typing ? <TypingIndicator className="pl-11" /> : null}
        </div>

        <ChatMessageInput disabled={busy} fileSlot={fileSlot} onSendText={onSendText} onTyping={onTyping} />
      </div>
    </Card>
  );
}
