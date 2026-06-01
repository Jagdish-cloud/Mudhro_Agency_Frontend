import { toast } from "sonner";

export type ChatNotificationKind = "mention" | "file_shared" | "group_added" | "message";

/**
 * Dispatches a non-blocking toast for inbound chat notifications (parity with Socket.IO server payloads).
 */
export function notifyChatNotification(kind: ChatNotificationKind | undefined): void {
  const description =
    kind === "mention"
      ? "You were mentioned."
      : kind === "file_shared"
        ? "A file was shared."
        : kind === "group_added"
          ? "Added to a group."
          : "New message.";
  toast.message("Chat", { description, duration: 5000 });
}
