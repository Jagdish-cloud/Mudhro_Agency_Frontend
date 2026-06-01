import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Menu, MessagesSquare } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ChatFileUploader } from "@/components/chat/FileUploader";
import { GroupModal } from "@/components/chat/GroupModal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useInternalChatSocket } from "@/context/internal-chat-socket-context";
import { getCurrentOrganizationId, getStoredAdminInfo } from "@/lib/agencyAuth";
import type { ChatListItem } from "@/types/internalChat";
import {
  createDirectChat,
  createGroupChat,
  downloadChatAttachment,
  fetchChatList,
  fetchChatMessages,
  markChatRead,
  searchChatUsers,
  sendChatMessage,
} from "@/services/internalChatApi";

export function ChatPage() {
  const orgId = getCurrentOrganizationId();
  const qc = useQueryClient();
  const viewerId = getStoredAdminInfo()?.id ?? "";
  const socketApi = useInternalChatSocket();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [groupOpen, setGroupOpen] = useState(false);
  const [dmOpen, setDmOpen] = useState(false);
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [dmQuery, setDmQuery] = useState("");
  const [typingRemote, setTypingRemote] = useState(false);

  /** Dedupe PUT /messages/read for the same (chat, newest message id). */
  const lastMarkedKeyRef = useRef<string>("");

  const typingTimerRef = useRef<number | null>(null);

  const chatsQuery = useQuery({
    queryKey: ["internal-chat", "list", orgId, search],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const data = await fetchChatList(orgId!, { search: search.trim() || undefined, limit: 50 });
      return data;
    },
  });

  useEffect(() => {
    const first = chatsQuery.data?.items?.[0];
    if (!activeId && first) setActiveId(first.id);
  }, [activeId, chatsQuery.data?.items]);

  useEffect(() => {
    lastMarkedKeyRef.current = "";
  }, [activeId]);

  const activeChat = useMemo(
    () => chatsQuery.data?.items?.find((c) => c.id === activeId) ?? null,
    [chatsQuery.data?.items, activeId],
  );

  useEffect(() => {
    if (!activeId || !viewerId || !socketApi.socket) return;
    const s = socketApi.socket;

    socketApi.joinChatRoom(activeId);
    const onConnect = () => socketApi.joinChatRoom(activeId);
    s.on("connect", onConnect);

    const onTyping = (p: { chatId?: string }) => {
      if (p?.chatId !== activeId) return;
      setTypingRemote(true);
    };
    const onStopTyping = (p: { chatId?: string }) => {
      if (p?.chatId !== activeId) return;
      setTypingRemote(false);
    };
    const onReceive = (p: { chatId?: string }) => {
      if (p?.chatId !== activeId) return;
      setTypingRemote(false);
    };

    s.on("typing", onTyping);
    s.on("stop_typing", onStopTyping);
    s.on("receive_message", onReceive);

    return () => {
      s.off("connect", onConnect);
      s.off("typing", onTyping);
      s.off("stop_typing", onStopTyping);
      s.off("receive_message", onReceive);
      socketApi.leaveChatRoom(activeId);
    };
  }, [activeId, socketApi, viewerId]);

  const msgsQuery = useQuery({
    queryKey: ["internal-chat", "messages", orgId, activeId],
    enabled: Boolean(orgId && activeId),
    queryFn: async () => {
      const r = await fetchChatMessages(orgId!, activeId!, { limit: 100 });
      return r.messages ?? [];
    },
  });

  const flushMarkRead = useCallback(async () => {
    if (!orgId || !activeId || !msgsQuery.data?.length) return;
    const latest = msgsQuery.data.at(-1);
    if (!latest) return;
    const key = `${activeId}:${latest.id}`;
    if (lastMarkedKeyRef.current === key) return;
    lastMarkedKeyRef.current = key;
    try {
      await markChatRead(orgId, activeId, latest.id);
      void qc.invalidateQueries({ queryKey: ["internal-chat", "list", orgId] });
      void qc.invalidateQueries({ queryKey: ["internal-chat", "unread", orgId] });
    } catch {
      lastMarkedKeyRef.current = "";
    }
  }, [orgId, activeId, msgsQuery.data, qc]);

  const tailMessageId = msgsQuery.data?.at(-1)?.id ?? null;
  useEffect(() => {
    if (!msgsQuery.isSuccess || !tailMessageId || !msgsQuery.data?.length) return;
    void flushMarkRead();
  }, [msgsQuery.isSuccess, tailMessageId, msgsQuery.data?.length, flushMarkRead]);

  const sendMutation = useMutation({
    mutationFn: async (vars: Record<string, unknown>) => sendChatMessage(orgId!, vars),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: ["internal-chat", "messages", orgId, vars.chatId] });
      void qc.invalidateQueries({ queryKey: ["internal-chat", "list", orgId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createGroupMutation = useMutation({
    mutationFn: async (vars: { name?: string; memberOrganizationUserIds: string[] }) => createGroupChat(orgId!, vars),
    onSuccess: async ({ chatId }) => {
      await qc.invalidateQueries({ queryKey: ["internal-chat", "list", orgId] });
      setActiveId(chatId);
      toast.success("Group created.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [debouncedDm, setDebouncedDm] = useState("");
  useEffect(() => {
    const tid = window.setTimeout(() => setDebouncedDm(dmQuery.trim()), 300);
    return () => window.clearTimeout(tid);
  }, [dmQuery]);

  const dmSuggestQuery = useQuery({
    queryKey: ["internal-chat", "dm-roster-suggest", orgId, debouncedDm],
    enabled: Boolean(dmOpen && orgId && debouncedDm.length >= 1),
    queryFn: () => searchChatUsers(orgId!, debouncedDm),
  });

  const handleSendText = useCallback(
    async (body: string, clientMessageId: string) => {
      if (!orgId || !activeId || !viewerId) return;
      await sendMutation.mutateAsync({
        chatId: activeId,
        messageType: "text",
        bodyText: body,
        clientMessageId,
      });
    },
    [orgId, activeId, viewerId, sendMutation],
  );

  const handleTypingUpstream = useCallback(
    (on: boolean) => {
      if (!activeId) return;
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
      if (on) {
        socketApi.emitTyping(activeId, true);
        typingTimerRef.current = window.setTimeout(() => socketApi.emitTyping(activeId, false), 1200);
      } else socketApi.emitTyping(activeId, false);
    },
    [activeId, socketApi],
  );

  const peerInitials = useMemo(() => {
    if (!activeChat?.title) return undefined;
    return activeChat.title
      .split(/\s+/g)
      .map((x) => x[0])
      .join("")
      .slice(0, 3)
      .toUpperCase();
  }, [activeChat?.title]);

  const subtitle = activeChat
    ? activeChat.type === "group"
      ? `${activeChat.memberCount} members • messages retained ~60 days`
      : `${activeChat.onlinePeer === true ? "Online" : "Offline"} • direct`
    : "Select a conversation";

  const genClientMessageId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `cm_${Date.now()}_${Math.random()}`;

  const fileSlot =
    orgId && activeId ? (
      <ChatFileUploader
        orgId={orgId}
        label="📎 File"
        onUploaded={async (fileId: string) => {
          await sendMutation.mutateAsync({
            chatId: activeId,
            messageType: "file",
            fileId,
            clientMessageId: genClientMessageId(),
          });
        }}
      />
    ) : null;

  if (!orgId) return <Spinner className="mx-auto mt-8" />;

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessagesSquare className="h-5 w-5" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Team chat</h1>
            <p className="text-xs text-muted-foreground">Real-time messaging for admins and members (~60-day retention).</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" className="lg:hidden" onClick={() => setMobileListOpen(true)}>
            <Menu className="mr-1 h-4 w-4" />
            Chats
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setDmOpen(true)}>
            New DM
          </Button>
          <Button type="button" variant="success" size="sm" onClick={() => setGroupOpen(true)}>
            New group
          </Button>
        </div>
      </div>

      <div className="grid min-h-[28rem] flex-1 gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="hidden h-[calc(100dvh-13rem)] min-h-[24rem] lg:block">
          <ChatSidebar
            items={(chatsQuery.data?.items as ChatListItem[]) ?? []}
            activeId={activeId}
            search={search}
            onSearch={setSearch}
            onSelect={(id) => setActiveId(id)}
          />
        </div>

        <div className="min-h-0 lg:h-[calc(100dvh-13rem)]">
          {activeChat && viewerId ? (
            <ChatWindow
              title={activeChat.title}
              subtitle={subtitle}
              viewerId={viewerId}
              orgId={orgId}
              typing={typingRemote}
              messages={msgsQuery.data ?? []}
              onTyping={handleTypingUpstream}
              onSendText={handleSendText}
              peerInitials={peerInitials}
              fileSlot={fileSlot}
              onThreadInteract={() => void flushMarkRead()}
              busy={sendMutation.isPending || msgsQuery.isLoading}
              onAttachmentDownload={(fileId, name) => void downloadChatAttachment(orgId, fileId, name)}
            />
          ) : chatsQuery.isLoading ? (
            <Spinner className="mx-auto mt-12" />
          ) : (
            <p className="text-center text-sm text-muted-foreground">Pick a chat from the sidebar.</p>
          )}
        </div>
      </div>

      <Dialog open={mobileListOpen} onOpenChange={setMobileListOpen}>
        <DialogContent className="left-0 top-0 h-dvh max-w-full translate-x-0 translate-y-0 rounded-none sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[92vh] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl">
          <DialogTitle className="sr-only">Conversation list</DialogTitle>
          <div className="h-[calc(100dvh-5rem)] min-h-[20rem]">
            <ChatSidebar
              mobile
              items={(chatsQuery.data?.items as ChatListItem[]) ?? []}
              activeId={activeId}
              search={search}
              onSearch={setSearch}
              onSelect={(id) => {
                setActiveId(id);
                setMobileListOpen(false);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <GroupModal
        open={groupOpen}
        onOpenChange={setGroupOpen}
        orgId={orgId}
        viewerId={viewerId}
        busy={createGroupMutation.isPending}
        onSubmit={async (name, members) => {
          await createGroupMutation.mutateAsync({ name, memberOrganizationUserIds: [...members] });
        }}
      />

      <Dialog open={dmOpen} onOpenChange={setDmOpen}>
        <DialogContent>
          <DialogTitle>New direct chat</DialogTitle>
          <Input value={dmQuery} onChange={(e) => setDmQuery(e.target.value)} placeholder="Type name or email…" />
          <p className="text-[11px] text-muted-foreground">Suggestions refresh as you type.</p>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {dmSuggestQuery.isFetching ? <Spinner className="h-4 w-4 shrink-0" /> : null}
              {debouncedDm.length === 0 ? <span>Type to search teammates.</span> : null}
            </div>

            <ul className="max-h-60 divide-y divide-border overflow-y-auto rounded-xl border border-border">
              {(debouncedDm.length >= 1 ? (dmSuggestQuery.data?.users ?? []) : []).map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col px-3 py-2 text-left hover:bg-secondary"
                    onClick={async () => {
                      if (u.id === viewerId) return;
                      try {
                        const { chatId } = await createDirectChat(orgId, u.id);
                        await qc.invalidateQueries({ queryKey: ["internal-chat", "list", orgId] });
                        setActiveId(chatId);
                        setDmOpen(false);
                      } catch (e2) {
                        toast.error(e2 instanceof Error ? e2.message : "Unable to create DM.");
                      }
                    }}
                  >
                    <span className="font-medium">{u.name}</span>
                    <span className="text-xs text-muted-foreground">{u.email}</span>
                  </button>
                </li>
              ))}
              {debouncedDm.length >= 1 && dmSuggestQuery.isFetched && !(dmSuggestQuery.data?.users?.length) ? (
                <li className="px-3 py-6 text-center text-xs text-muted-foreground">No matches.</li>
              ) : null}
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
