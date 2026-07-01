import { Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { AgencyPermissionGate } from "@/components/agency/AgencyPermissionGate";
import { VendorFormDialog } from "@/components/agency/vendors/VendorFormDialog";
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
import { deleteAgencyVendorApi, listAgencyVendorsApi } from "@/services/agency/vendorsService";
import type { AgencyClientStatus, AgencyVendorDto } from "@/types/agencyInvoicing";

export function VendorsPage() {
  const { run } = useMutationFeedback();
  const orgId = getCurrentOrganizationId();
  const canManage = isCurrentUserAdmin();
  const [vendors, setVendors] = useState<AgencyVendorDto[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | AgencyClientStatus>("all");
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AgencyVendorDto | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const result = await listAgencyVendorsApi(orgId, {
        search: query || undefined,
        status: status === "all" ? undefined : status,
        page: 1,
        limit: 100,
      });
      setVendors(result.items);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Failed to load vendors.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [orgId, query, status]);

  useEffect(() => {
    const handle = setTimeout(() => void load(), 250);
    return () => clearTimeout(handle);
  }, [load]);

  const onSaved = useCallback((vendor: AgencyVendorDto) => {
    setVendors((prev) => {
      const idx = prev.findIndex((c) => c.id === vendor.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = vendor;
        return copy;
      }
      return [vendor, ...prev];
    });
  }, []);

  const onDelete = useCallback(
    async (vendor: AgencyVendorDto) => {
      if (!orgId) return;
      if (!window.confirm(`Archive vendor "${vendor.name}"?`)) return;
      try {
        await run(() => deleteAgencyVendorApi(orgId, vendor.id), {
          successMessage: "Vendor archived.",
        });
        setVendors((prev) => prev.filter((c) => c.id !== vendor.id));
      } catch (error) {
        const message =
          error instanceof ApiError ? error.message : "Unable to archive vendor.";
        toast.error(message);
      }
    },
    [orgId, run],
  );

  const summary = useMemo(
    () => ({
      total: vendors.length,
      active: vendors.filter((c) => c.status === "active").length,
      archived: vendors.filter((c) => c.status === "archived").length,
    }),
    [vendors],
  );

  if (!orgId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vendors</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Sign in to an organization to manage vendors.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendors</h1>
          <p className="text-sm text-muted-foreground">
            {summary.total} total • {summary.active} active • {summary.archived} archived
          </p>
        </div>
        <AgencyPermissionGate moduleKey="vendors" action="create">
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> New vendor
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
              onChange={(e) => setStatus(e.target.value as "all" | AgencyClientStatus)}
            >
              <option value="all">All</option>
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
              {loading && vendors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : vendors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    No vendors yet. Create your first one.
                  </TableCell>
                </TableRow>
              ) : (
                vendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell>
                      <Link
                        to={`/agency/vendors/${vendor.id}`}
                        className="font-medium hover:underline"
                      >
                        {vendor.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {vendor.email ?? "no email"}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {vendor.contactName ?? "-"}
                      <div className="text-xs text-muted-foreground">{vendor.phone ?? ""}</div>
                    </TableCell>
                    <TableCell className="text-xs">{vendor.gstNumber ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={vendor.status === "active" ? "active" : "inactive"}>
                        {vendor.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <AgencyPermissionGate moduleKey="vendors" action="edit">
                        <Button
                          variant="outline"
                          size="sm"
                          className="mr-2"
                          onClick={() => {
                            setEditing(vendor);
                            setDialogOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                      </AgencyPermissionGate>
                      {canManage ? (
                        <Button variant="outline" size="sm" onClick={() => void onDelete(vendor)}>
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

      <VendorFormDialog
        open={dialogOpen}
        orgId={orgId}
        editing={editing}
        onOpenChange={setDialogOpen}
        onSaved={onSaved}
      />
    </div>
  );
}
