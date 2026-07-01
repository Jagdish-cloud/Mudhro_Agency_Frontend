import { Loader2, Pencil, Search, Trash2, UserPlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CreateUserDialog } from "@/components/agency/members/CreateUserDialog";
import { DeleteMemberDialog } from "@/components/agency/members/DeleteMemberDialog";
import { EditMemberDialog } from "@/components/agency/members/EditMemberDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCurrentOrganizationId, isCurrentUserAdmin } from "@/lib/agencyAuth";
import { ApiError } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { getMembers } from "@/services/agency/membersService";
import type { UserRoleCode } from "@/types/auth";
import type { MembersFilter, OrgMember, OrgMemberStatus } from "@/types/member";

type RoleTab = "all" | "admins" | "members";

const TAB_TO_ROLE: Record<RoleTab, UserRoleCode | undefined> = {
  all: undefined,
  admins: 1,
  members: 2,
};

const PAGE_SIZE = 20;

function roleBadge(role: UserRoleCode) {
  return role === 1 ? (
    <Badge variant="admin">Admin</Badge>
  ) : (
    <Badge variant="member">Member</Badge>
  );
}

function statusBadge(status: OrgMemberStatus) {
  return status === "active" ? (
    <Badge variant="active">Active</Badge>
  ) : (
    <Badge variant="inactive">Inactive</Badge>
  );
}

export function MembersPage() {
  const orgId = getCurrentOrganizationId();
  const isAdmin = isCurrentUserAdmin();

  const [tab, setTab] = useState<RoleTab>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | OrgMemberStatus>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<OrgMember[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"admin" | "member">("member");
  const [editTarget, setEditTarget] = useState<OrgMember | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrgMember | null>(null);

  const requestIdRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [tab, statusFilter]);

  const filters: MembersFilter = useMemo(
    () => ({
      role: TAB_TO_ROLE[tab],
      status: statusFilter === "all" ? undefined : statusFilter,
      search: search.length > 0 ? search : undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [tab, statusFilter, search, page],
  );

  const loadMembers = useCallback(async () => {
    if (!orgId) {
      setError("You are not signed in to an organization.");
      setLoading(false);
      return;
    }
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await getMembers(orgId, filters);
      if (requestId !== requestIdRef.current) return;
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      const message = err instanceof ApiError ? err.message : "Unable to load members.";
      setError(message);
      setItems([]);
      setTotal(0);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [orgId, filters]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  function handleOpenCreate(mode: "admin" | "member") {
    setCreateMode(mode);
    setCreateOpen(true);
  }

  function handleCreated(created: OrgMember) {
    if (
      (tab === "admins" && created.role !== 1) ||
      (tab === "members" && created.role !== 2)
    ) {
      setTab(created.role === 1 ? "admins" : "members");
    }
    void loadMembers();
  }

  function handleUpdated(updated: OrgMember) {
    setItems((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  }

  function handleDeleted(id: string) {
    setItems((prev) => prev.filter((m) => m.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (!orgId) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          We couldn&apos;t determine your organization. Please sign in again.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Organization members</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage admins and members in your organization.
            </p>
          </div>
          {isAdmin ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => handleOpenCreate("admin")}>
                <UserPlus className="h-4 w-4" />
                Invite Admin
              </Button>
              <Button onClick={() => handleOpenCreate("member")}>
                <UserPlus className="h-4 w-4" />
                Invite Member
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex rounded-md border border-border bg-muted/40 p-1 text-sm">
              {(["all", "admins", "members"] as RoleTab[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={cn(
                    "rounded px-3 py-1.5 capitalize transition-colors",
                    tab === key
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {key}
                </button>
              ))}
            </div>
            <div className="flex flex-1 flex-col gap-2 md:flex-row md:justify-end">
              <div className="relative md:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search name, email, number..."
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
              </div>
              <Select
                className="md:w-44"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as typeof statusFilter)
                }
              >
                <option value="all">All </option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading members...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-destructive">
                      {error}
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                      No members found. {isAdmin ? "Invite your first teammate above." : ""}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell className="text-muted-foreground">{member.email}</TableCell>
                      <TableCell>{member.number}</TableCell>
                      <TableCell className="text-muted-foreground">{member.designation}</TableCell>
                      <TableCell>{roleBadge(member.role)}</TableCell>
                      <TableCell>{statusBadge(member.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          {isAdmin ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditTarget(member)}
                                aria-label={`Edit ${member.name}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteTarget(member)}
                                aria-label={`Remove ${member.name}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">Read only</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {total > PAGE_SIZE ? (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {page} of {totalPages} • {total} total
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <CreateUserDialog
        open={createOpen}
        mode={createMode}
        orgId={orgId}
        onOpenChange={(next) => {
          setCreateOpen(next);
          if (!next) {
            // no-op; local form resets on next open
          }
        }}
        onCreated={(member) => {
          handleCreated(member);
        }}
      />

      <EditMemberDialog
        open={Boolean(editTarget)}
        orgId={orgId}
        member={editTarget}
        canChangeRole={isAdmin}
        onOpenChange={(next) => {
          if (!next) setEditTarget(null);
        }}
        onUpdated={(updated) => {
          handleUpdated(updated);
        }}
      />

      <DeleteMemberDialog
        open={Boolean(deleteTarget)}
        orgId={orgId}
        member={deleteTarget}
        onOpenChange={(next) => {
          if (!next) setDeleteTarget(null);
        }}
        onDeleted={(id) => {
          handleDeleted(id);
          if (items.length === 1 && page > 1) {
            setPage((p) => Math.max(1, p - 1));
          } else {
            void (async () => {
              // Toast already shown, no reload needed unless total shifts pagination
            })();
          }
        }}
      />

      {!isAdmin ? (
        <p className="text-xs text-muted-foreground">
          You have read-only access. Ask an admin to make changes.
        </p>
      ) : null}
    </div>
  );
}
