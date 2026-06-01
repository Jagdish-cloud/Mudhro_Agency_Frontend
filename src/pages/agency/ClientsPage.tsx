import { Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { AgencyPermissionGate } from "@/components/agency/AgencyPermissionGate";
import { ClientFormDialog } from "@/components/agency/clients/ClientFormDialog";
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
import { useMutationFeedback } from "@/context/mutation-feedback-context";
import { getCurrentOrganizationId, isCurrentUserAdmin } from "@/lib/agencyAuth";
import { ApiError } from "@/lib/apiClient";
import {
  deleteAgencyClientApi,
  listAgencyClientsApi,
} from "@/services/agency/clientsService";
import type {
  AgencyClientDto,
  AgencyClientStatus,
} from "@/types/agencyInvoicing";

export function ClientsPage() {
  const { run } = useMutationFeedback();
  const orgId = getCurrentOrganizationId();
  const canManage = isCurrentUserAdmin();
  const [clients, setClients] = useState<AgencyClientDto[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | AgencyClientStatus>("all");
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AgencyClientDto | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const result = await listAgencyClientsApi(orgId, {
        search: query || undefined,
        status: status === "all" ? undefined : status,
        page: 1,
        limit: 100,
      });
      setClients(result.items);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Failed to load clients.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [orgId, query, status]);

  useEffect(() => {
    const handle = setTimeout(() => void load(), 250);
    return () => clearTimeout(handle);
  }, [load]);

  const onSaved = useCallback((client: AgencyClientDto) => {
    setClients((prev) => {
      const idx = prev.findIndex((c) => c.id === client.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = client;
        return copy;
      }
      return [client, ...prev];
    });
  }, []);

  const onDelete = useCallback(
    async (client: AgencyClientDto) => {
      if (!orgId) return;
      if (!window.confirm(`Archive client "${client.name}"?`)) return;
      try {
        await run(() => deleteAgencyClientApi(orgId, client.id), {
          successMessage: "Client archived.",
        });
        setClients((prev) => prev.filter((c) => c.id !== client.id));
      } catch (error) {
        const message =
          error instanceof ApiError ? error.message : "Unable to archive client.";
        toast.error(message);
      }
    },
    [orgId, run],
  );

  const summary = useMemo(
    () => ({
      total: clients.length,
      active: clients.filter((c) => c.status === "active").length,
      archived: clients.filter((c) => c.status === "archived").length,
    }),
    [clients],
  );

  if (!orgId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Clients</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Sign in to an organization to manage clients.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">
            {summary.total} total • {summary.active} active • {summary.archived} archived
          </p>
        </div>
        <AgencyPermissionGate moduleKey="clients" action="create">
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> New client
          </Button>
        </AgencyPermissionGate>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Directory</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search name, email, GST..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "all" | AgencyClientStatus)
              }
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>GST</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    No clients yet. Create your first one.
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <Link to={`/agency/clients/${client.id}`} className="font-medium hover:underline">
                        {client.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {client.email ?? "no email"}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {client.contactName ?? "-"}
                      <div className="text-xs text-muted-foreground">{client.phone ?? ""}</div>
                    </TableCell>
                    <TableCell className="text-xs">{client.gstNumber ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={client.status === "active" ? "active" : "inactive"}>
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <AgencyPermissionGate moduleKey="clients" action="edit">
                        <Button
                          variant="outline"
                          size="sm"
                          className="mr-2"
                          onClick={() => {
                            setEditing(client);
                            setDialogOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                      </AgencyPermissionGate>
                      {canManage ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void onDelete(client)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ClientFormDialog
        open={dialogOpen}
        orgId={orgId}
        editing={editing}
        onOpenChange={setDialogOpen}
        onSaved={onSaved}
      />
    </div>
  );
}
