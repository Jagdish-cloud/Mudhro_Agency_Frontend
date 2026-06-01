import type { ChatMessagePayload } from "@/types/internalChat";
import { cn } from "@/lib/utils";

import { ChatAttachmentImage, isInlinePreviewImageMime } from "./ChatAttachmentImage";

type MessageBubbleProps = {
  message: ChatMessagePayload;
  isMine: boolean;
  peerInitials?: string;
  orgId?: string | null;
  onDownloadFile?: (fileId: string, name: string) => void;
};

function initialsFromId(id: string): string {
  return id.slice(0, 2).toUpperCase();
}

export function MessageBubble({ message, isMine, peerInitials, orgId, onDownloadFile }: MessageBubbleProps) {
  if (message.deleted) {
    return (
      <div className={cn("flex gap-2", isMine ? "justify-end" : "justify-start")}>
        {!isMine ? (
          <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {peerInitials ?? initialsFromId(message.senderOrganizationUserId)}
          </div>
        ) : null}
        <div className="w-fit max-w-[min(100%,32rem)] rounded-2xl border border-border bg-secondary/40 px-3 py-2 text-xs italic text-muted-foreground">
          Message removed
        </div>
      </div>
    );
  }

  const file = message.file;
  const showImage =
    Boolean(orgId && file && onDownloadFile && isInlinePreviewImageMime(file.mimeType ?? ""));

  return (
    <div className={cn("flex gap-2", isMine ? "justify-end" : "justify-start")}>
      {!isMine ? (
        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium">
          {peerInitials ?? initialsFromId(message.senderOrganizationUserId)}
        </div>
      ) : null}
      <div
        className={cn(
          "w-fit max-w-[min(100%,32rem)] rounded-2xl px-3 py-2 text-sm text-left shadow-sm",
          isMine ? "bg-primary text-primary-foreground" : "border border-border bg-card",
        )}
      >
        {message.bodyText ? <p className="whitespace-pre-wrap break-words">{message.bodyText}</p> : null}

        {file && showImage && orgId ? (
          <ChatAttachmentImage
            orgId={orgId}
            fileId={file.id}
            filename={file.originalName}
            mimeType={file.mimeType}
            isMine={isMine}
            onDownload={onDownloadFile}
          />
        ) : null}

        {file && !showImage ? (
          <button
            type="button"
            onClick={() =>
              file.id &&
              onDownloadFile?.(
                file.id,
                file.originalName,
              )
            }
            disabled={!onDownloadFile}
            className={cn(
              "mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs underline-offset-2 hover:underline disabled:no-underline",
              isMine ? "bg-primary-foreground/10" : "bg-secondary",
            )}
          >
            <span className="font-medium truncate">{file.originalName}</span>
          </button>
        ) : null}

        <div
          className={cn(
            "mt-1 flex items-center gap-2 text-[10px]",
            isMine ? "text-primary-foreground/75" : "text-muted-foreground",
          )}
        >
          <span>{new Date(message.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}</span>
          {isMine ? (
            <>
              <span aria-hidden>/</span>
              <span>Sent</span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
