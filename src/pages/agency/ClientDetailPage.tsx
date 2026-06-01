import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { AgencyPermissionGate } from "@/components/agency/AgencyPermissionGate";
import { ClientItemFormDialog } from "@/components/agency/clients/ClientItemFormDialog";
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
import {
  deleteClientItemApi,
  listClientItemsApi,
} from "@/services/agency/clientItemsService";
import { getAgencyClientApi } from "@/services/agency/clientsService";
import { listAgencyInvoicesApi } from "@/services/agency/invoicesService";
import type {
  AgencyClientDto,
  AgencyClientItemDto,
  AgencyInvoiceDto,
} from "@/types/agencyInvoicing";

export function ClientDetailPage() {
  const { run } = useMutationFeedback();
  const { clientId } = useParams<{ clientId: string }>();
  const orgId = getCurrentOrganizationId();
  const [client, setClient] = useState<AgencyClientDto | null>(null);
  const [invoices, setInvoices] = useState<AgencyInvoiceDto[]>([]);
  const [items, setItems] = useState<AgencyClientItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AgencyClientItemDto | null>(null);

  useEffect(() => {
    if (!orgId || !clientId) return;
    setLoading(true);
    void Promise.all([
      getAgencyClientApi(orgId, clientId),
      listAgencyInvoicesApi(orgId, { clientId, limit: 100 }),
      listClientItemsApi(orgId, clientId),
    ])
      .then(([c, inv, catalog]) => {
        setClient(c);
        setInvoices(inv.items);
        setItems(catalog.items);
      })
      .catch((error: unknown) => {
        const message =
          error instanceof ApiError ? error.message : "Failed to load client.";
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }, [orgId, clientId]);

  function handleItemSaved(saved: AgencyClientItemDto) {
    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.id === saved.id);
      if (existingIdx === -1) return [saved, ...prev];
      const next = [...prev];
      next[existingIdx] = saved;
      return next;
    });
  }

  async function handleItemDelete(item: AgencyClientItemDto) {
    if (!orgId || !clientId) return;
    if (!window.confirm(`Remove "${item.itemName}" from the catalog?`)) return;
    try {
      await run(() => deleteClientItemApi(orgId, clientId, item.id), {
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

  if (loading || !client) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Client profile</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Loading...</CardContent>
      </Card>
    );
  }

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const totalReceived = invoices.reduce((sum, inv) => sum + inv.amountReceived, 0);
  const totalPending = invoices.reduce((sum, inv) => sum + inv.amountPending, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/agency/clients">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
        <Badge variant={client.status === "active" ? "active" : "inactive"}>{client.status}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div><span className="text-muted-foreground">Contact:</span> {client.contactName ?? "-"}</div>
            <div><span className="text-muted-foreground">Email:</span> {client.email ?? "-"}</div>
            <div><span className="text-muted-foreground">Phone:</span> {client.phone ?? "-"}</div>
            <div><span className="text-muted-foreground">GST:</span> {client.gstNumber ?? "-"}</div>
            <div><span className="text-muted-foreground">PAN:</span> {client.panNumber ?? "-"}</div>
            <div><span className="text-muted-foreground">State code:</span> {client.stateCode ?? "-"}</div>
            <div className="sm:col-span-2">
              <span className="text-muted-foreground">Billing:</span>{" "}
              {client.billingAddress ?? "-"}
            </div>
            {client.notes ? (
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">Notes:</span> {client.notes}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoiced</span>
              <span>{formatCurrency(totalInvoiced)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Received</span>
              <span>{formatCurrency(totalReceived)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Pending</span>
              <span>{formatCurrency(totalPending)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Catalog items</CardTitle>
            <p className="text-xs text-muted-foreground">
              Reusable line items for this client. Appear in the Invoice Builder's "Add from catalog" dropdown.
            </p>
          </div>
          <AgencyPermissionGate moduleKey="clients" action="create">
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
                <TableHead>HSN/SAC</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Tax %</TableHead>
                <TableHead className="text-right">Disc %</TableHead>
                <TableHead className="w-[1%] whitespace-nowrap text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                    No catalog items yet.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.itemName}
                      {item.description ? (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {item.description}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>{item.hsnCode}</TableCell>
                    <TableCell>{item.unit ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.defaultRate)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.defaultTaxPercent.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.defaultDiscountPercent.toFixed(2)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <div className="flex justify-end gap-1">
                        <AgencyPermissionGate moduleKey="clients" action="edit">
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
                        <AgencyPermissionGate moduleKey="clients" action="delete">
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

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Pending</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    No invoices yet.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <Link to={`/agency/invoices/${inv.id}`} className="font-medium hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{inv.issueDate}</TableCell>
                    <TableCell>{inv.dueDate}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{inv.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(inv.grandTotal, inv.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(inv.amountPending, inv.currency)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {clientId ? (
        <ClientItemFormDialog
          open={itemDialogOpen}
          orgId={orgId}
          clientId={clientId}
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
