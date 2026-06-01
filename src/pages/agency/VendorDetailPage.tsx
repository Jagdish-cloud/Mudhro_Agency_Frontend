import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { AgencyPermissionGate } from "@/components/agency/AgencyPermissionGate";
import { VendorItemFormDialog } from "@/components/agency/vendors/VendorItemFormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMutationFeedback } from "@/context/mutation-feedback-context";
import { getCurrentOrganizationId } from "@/lib/agencyAuth";
import { ApiError } from "@/lib/apiClient";
import { formatCurrency } from "@/lib/currency";
import { deleteVendorItemApi, listVendorItemsApi } from "@/services/agency/vendorItemsService";
import { getAgencyVendorApi } from "@/services/agency/vendorsService";
import type { AgencyVendorDto, AgencyVendorItemDto } from "@/types/agencyInvoicing";

const CURRENCY = "INR";

export function VendorDetailPage() {
  const { run } = useMutationFeedback();
  const { vendorId } = useParams<{ vendorId: string }>();
  const orgId = getCurrentOrganizationId();
  const [vendor, setVendor] = useState<AgencyVendorDto | null>(null);
  const [items, setItems] = useState<AgencyVendorItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AgencyVendorItemDto | null>(null);

  useEffect(() => {
    if (!orgId || !vendorId) return;
    setLoading(true);
    void Promise.all([getAgencyVendorApi(orgId, vendorId), listVendorItemsApi(orgId, vendorId)])
      .then(([v, catalog]) => {
        setVendor(v);
        setItems(catalog.items);
      })
      .catch((error: unknown) => {
        const message =
          error instanceof ApiError ? error.message : "Failed to load vendor.";
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }, [orgId, vendorId]);

  function handleItemSaved(saved: AgencyVendorItemDto) {
    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.id === saved.id);
      if (existingIdx === -1) return [saved, ...prev];
      const next = [...prev];
      next[existingIdx] = saved;
      return next;
    });
  }

  async function handleItemDelete(item: AgencyVendorItemDto) {
    if (!orgId || !vendorId) return;
    if (!window.confirm(`Remove "${item.itemName}" from the catalog?`)) return;
    try {
      await run(() => deleteVendorItemApi(orgId, vendorId, item.id), {
        successMessage: "Catalog item removed.",
      });
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Could not remove item.";
      toast.error(message);
    }
  }

  if (!orgId) {
    return <div>Sign in required.</div>;
  }

  if (loading || !vendor) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vendor profile</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Loading...</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/agency/vendors">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{vendor.name}</h1>
        <Badge variant={vendor.status === "active" ? "active" : "inactive"}>{vendor.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">Contact:</span> {vendor.contactName ?? "-"}
          </div>
          <div>
            <span className="text-muted-foreground">Email:</span> {vendor.email ?? "-"}
          </div>
          <div>
            <span className="text-muted-foreground">Phone:</span> {vendor.phone ?? "-"}
          </div>
          <div>
            <span className="text-muted-foreground">GST:</span> {vendor.gstNumber ?? "-"}
          </div>
          <div>
            <span className="text-muted-foreground">PAN:</span> {vendor.panNumber ?? "-"}
          </div>
          <div>
            <span className="text-muted-foreground">State code:</span> {vendor.stateCode ?? "-"}
          </div>
          <div className="sm:col-span-2">
            <span className="text-muted-foreground">Billing:</span>{" "}
            {vendor.billingAddress ?? "-"}
          </div>
          {vendor.notes ? (
            <div className="sm:col-span-2">
              <span className="text-muted-foreground">Notes:</span> {vendor.notes}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Expense line catalog</CardTitle>
            <p className="text-xs text-muted-foreground">
              Reusable lines for this vendor. Available when recording expenses with this vendor
              selected.
            </p>
          </div>
          <AgencyPermissionGate moduleKey="vendors" action="create">
            <Button
              size="sm"
              onClick={() => {
                setEditingItem(null);
                setItemDialogOpen(true);
              }}
            >
              <Plus className="mr-1 h-4 w-4" /> Add item
            </Button>
          </AgencyPermissionGate>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="w-[1%] whitespace-nowrap text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    No catalog items yet.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.itemName}
                      {item.description ? (
                        <div className="line-clamp-1 text-xs text-muted-foreground">
                          {item.description}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{item.defaultQuantity}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(item.defaultRate, CURRENCY)}
                    </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <div className="flex justify-end gap-1">
                          <AgencyPermissionGate moduleKey="vendors" action="edit">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                setEditingItem(item);
                                setItemDialogOpen(true);
                              }}
                              aria-label="Edit item"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </AgencyPermissionGate>
                          <AgencyPermissionGate moduleKey="vendors" action="delete">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => void handleItemDelete(item)}
                              aria-label="Remove item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AgencyPermissionGate>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
        </CardContent>
      </Card>

      {vendorId ? (
        <VendorItemFormDialog
          open={itemDialogOpen}
          orgId={orgId}
          vendorId={vendorId}
          editing={editingItem}
          onOpenChange={(open) => {
            setItemDialogOpen(open);
            if (!open) setEditingItem(null);
          }}
          onSaved={handleItemSaved}
        />
      ) : null}
    </div>
  );
}
