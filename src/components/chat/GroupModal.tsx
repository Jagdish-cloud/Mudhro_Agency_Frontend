import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { searchChatUsers } from "@/services/internalChatApi";
import type { OrgUserBrief } from "@/types/internalChat";

type GroupModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orgId: string;
  viewerId: string;
  busy?: boolean;
  onSubmit: (name: string | undefined, memberIds: string[]) => Promise<void>;
};

export function GroupModal({ open, onOpenChange, orgId, viewerId, busy, onSubmit }: GroupModalProps) {
  const [name, setName] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 280);
    return () => window.clearTimeout(t);
  }, [open, q]);

  useEffect(() => {
    if (open) return;
    setName("");
    setQ("");
    setDebouncedQ("");
    setSelected(new Set());
  }, [open]);

  const rosterQuery = useQuery({
    queryKey: ["internal-chat", "group-roster-suggest", orgId, debouncedQ],
    enabled: open && Boolean(orgId && debouncedQ.length >= 1),
    queryFn: () => searchChatUsers(orgId, debouncedQ),
  });

  const results: OrgUserBrief[] = rosterQuery.data?.users ?? [];

  const toggleUser = (id: string) => {
    if (id === viewerId) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const submit = async () => {
    const members = [...selected];
    await onSubmit(name.trim() ? name.trim() : undefined, members);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New group chat</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Group name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Finance / Ops …" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Add members</label>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Start typing name or email…"
              className="mt-1"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {rosterQuery.isFetching ? <Spinner className="h-4 w-4 shrink-0" /> : null}
            {debouncedQ.length === 0 ? <span>Type to suggest teammates.</span> : null}
          </div>
          <div className="max-h-48 overflow-y-auto rounded-xl border border-border">
            <ul className="divide-y divide-border">
              {debouncedQ.length >= 1
                ? results.map((u) => (
                    <li key={u.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <Checkbox
                        checked={selected.has(u.id)}
                        disabled={u.id === viewerId}
                        onCheckedChange={() => toggleUser(u.id)}
                        aria-label={`Select ${u.name}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{u.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          u.is_online ? "bg-emerald-500" : "bg-muted-foreground/40",
                        )}
                        title={u.is_online ? "Online" : "Offline"}
                        aria-hidden
                      />
                    </li>
                  ))
                : null}
              {debouncedQ.length >= 1 && rosterQuery.isFetched && results.length === 0 ? (
                <li className="px-3 py-6 text-center text-xs text-muted-foreground">No matches.</li>
              ) : null}
              {debouncedQ.length === 0 ? (
                <li className="px-3 py-6 text-xs text-muted-foreground">Suggestions appear while you type.</li>
              ) : null}
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="success" disabled={busy || selected.size === 0} onClick={() => void submit()}>
            {busy ? <Spinner size="sm" className="text-primary-foreground" /> : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
