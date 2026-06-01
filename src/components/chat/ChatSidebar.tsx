import { Input } from "@/components/ui/input";
import type { ChatListItem } from "@/types/internalChat";
import { cn } from "@/lib/utils";

type ChatSidebarProps = {
  items: ChatListItem[];
  activeId: string | null;
  search: string;
  onSearch: (value: string) => void;
  onSelect: (id: string) => void;
  mobile?: boolean;
};

export function ChatSidebar({ items, activeId, search, onSearch, onSelect, mobile }: ChatSidebarProps) {
  return (
    <div className={cn("flex h-full flex-col border-border bg-card", mobile ? "" : "border-r")}>
      <div className="border-b border-border p-3">
        <p className={cn("text-sm font-semibold", mobile && "hidden sm:block")}>Chats</p>
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search chats…"
          className="mt-2 h-10"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {items.map((chat) => (
            <li key={chat.id}>
              <button
                type="button"
                onClick={() => onSelect(chat.id)}
                className={cn(
                  "flex w-full flex-col rounded-xl px-3 py-2 text-left text-sm transition-colors",
                  chat.id === activeId ? "bg-secondary text-foreground shadow-sm" : "hover:bg-secondary/70",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{chat.title}</span>
                  {chat.onlinePeer !== null ? (
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        chat.onlinePeer ? "bg-emerald-500" : "bg-muted-foreground/40",
                      )}
                      title={chat.onlinePeer ? "Online" : "Offline"}
                      aria-hidden
                    />
                  ) : null}
                  {chat.unreadCount > 0 ? (
                    <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
                      {chat.unreadCount}
                    </span>
                  ) : null}
                </div>
                <span className="truncate text-[11px] text-muted-foreground">{chat.lastMessagePreview ?? "No messages"}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
