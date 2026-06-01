import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { notifyChatNotification } from "@/components/chat/NotificationToast";

import { getAgencyToken } from "@/lib/agencyAuth";
import { getChatSocketOrigin } from "@/services/internalChatApi";

type SocketCtxValue = {
  socket: Socket | null;
  joinChatRoom: (chatId: string) => void;
  leaveChatRoom: (chatId: string) => void;
  emitTyping: (chatId: string, isTyping: boolean) => void;
  emitHeartbeat: () => void;
};

const SocketCtx = createContext<SocketCtxValue>({
  socket: null,
  joinChatRoom: () => undefined,
  leaveChatRoom: () => undefined,
  emitTyping: () => undefined,
  emitHeartbeat: () => undefined,
});

export function InternalChatSocketProvider({ orgId, children }: { orgId: string | null; children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const qc = useQueryClient();
  const joined = useRef(new Set<string>());

  useEffect(() => {
    joined.current.clear();
    if (!orgId) {
      setSocket((prev) => {
        prev?.disconnect();
        return null;
      });
      return;
    }

    const token = getAgencyToken();
    const origin = getChatSocketOrigin();
    if (!token || !origin) {
      setSocket(null);
      return;
    }

    const s = io(`${origin}/internal-chat`, {
      path: "/socket.io/",
      transports: ["websocket", "polling"],
      auth: { token },
    });

    s.on("receive_message", (payload: { chatId?: string }) => {
      if (payload?.chatId && orgId) {
        void qc.invalidateQueries({ queryKey: ["internal-chat", "messages", orgId, payload.chatId] });
        void qc.invalidateQueries({ queryKey: ["internal-chat", "list", orgId] });
        void qc.invalidateQueries({ queryKey: ["internal-chat", "unread", orgId] });
      }
    });

    s.on("notification", (payload: { type?: string }) => {
      notifyChatNotification(
        payload?.type === "mention" ||
          payload?.type === "file_shared" ||
          payload?.type === "group_added"
          ? payload.type
          : "message",
      );
      if (orgId) {
        void qc.invalidateQueries({ queryKey: ["internal-chat", "unread", orgId] });
      }
    });

    s.on("error_event", (err: { message?: string }) => {
      toast.error(err?.message ?? "Chat connection error.");
    });

    const hb = window.setInterval(() => {
      s.emit("heartbeat");
    }, 60_000);

    setSocket(s);
    return () => {
      window.clearInterval(hb);
      s.disconnect();
      setSocket(null);
    };
  }, [orgId, qc]);

  const joinChatRoom = useCallback((chatId: string) => {
    if (!socket?.connected || !chatId) return;
    if (joined.current.has(chatId)) return;
    socket.emit("join_chat", { chatId }, (ack: unknown) => {
      if (ack && typeof ack === "object" && ack !== null && "error" in ack) joined.current.delete(chatId);
      else joined.current.add(chatId);
    });
  }, [socket]);

  const leaveChatRoom = useCallback((chatId: string) => {
    if (!socket) return;
    socket.emit("leave_chat", { chatId });
    joined.current.delete(chatId);
  }, [socket]);

  const emitTyping = useCallback(
    (chatId: string, isTyping: boolean) => {
      if (!socket?.connected) return;
      socket.emit(isTyping ? "typing" : "stop_typing", { chatId });
    },
    [socket],
  );

  const emitHeartbeat = useCallback(() => {
    socket?.emit("heartbeat");
  }, [socket]);

  const value = useMemo(
    () => ({ socket, joinChatRoom, leaveChatRoom, emitTyping, emitHeartbeat }),
    [socket, joinChatRoom, leaveChatRoom, emitTyping, emitHeartbeat],
  );

  return <SocketCtx.Provider value={value}>{children}</SocketCtx.Provider>;
}

export function useInternalChatSocket(): SocketCtxValue {
  return useContext(SocketCtx);
}
