import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Info, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { AgreementModal } from "@/components/agency/projects/AgreementModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMutationFeedback } from "@/context/mutation-feedback-context";
import { getCurrentOrganizationId, getStoredAdminInfo } from "@/lib/agencyAuth";
import { encodeId } from "@/lib/idCodec";
import { ApiError } from "@/lib/apiClient";
import { listAgencyClientsApi } from "@/services/agency/clientsService";
import {
  createAgencyProjectApi,
  deleteAgencyProjectApi,
  listAgencyProjectsApi,
  listProjectClientsApi,
  removeProjectClientApi,
  replaceProjectClientsApi,
  updateAgencyProjectApi,
} from "@/services/agency/projectsService";
import { downloadAgreementPdfApi, getAgreementByProjectApi } from "@/services/agency/agreementsService";
import type { AgencyClientDto } from "@/types/agencyInvoicing";
import type { AgreementDto } from "@/types/agency/agreement";
import type { AgencyProjectStatus, ProjectListItemDto } from "@/types/agency/project";

function formatBudget(amount: number | null, currency: string): string {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function agreementBadge(project: ProjectListItemDto) {
  const summary = project.agreementSummary;
  const cc = project.clientCount;
  if (!summary) return <span className="text-muted-foreground">—</span>;
  const signed = summary.signedClientCount;
  if (cc === 0) return <Badge variant="secondary">Pending</Badge>;
  if (signed === 0) return <Badge variant="secondary">Pending</Badge>;
  if (signed === cc) return <Badge className="bg-green-600 text-white hover:bg-green-600">All Signed</Badge>;
  return (
    <Badge variant="outline">
      {signed}/{cc} Signed
    </Badge>
  );
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const { run } = useMutationFeedback();
  const orgId = getCurrentOrganizationId();
  const admin = getStoredAdminInfo();

  const [projects, setProjects] = useState<ProjectListItemDto[]>([]);
  const [clients, setClients] = useState<AgencyClientDto[]>([]);
  const [statusFilter, setStatusFilter] = useState<AgencyProjectStatus | "all">("all");
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectListItemDto | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [status, setStatus] = useState<AgencyProjectStatus>("active");
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);

  const [clientsDialogProject, setClientsDialogProject] = useState<ProjectListItemDto | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{ project: ProjectListItemDto; client: AgencyClientDto } | null>(
    null,
  );

  const [agreementModal, setAgreementModal] = useState<{
    project: ProjectListItemDto;
    agreement: AgreementDto | null;
    assignedIds: string[];
  } | null>(null);

  const load = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        listAgencyProjectsApi(orgId, { status: statusFilter === "all" ? undefined : statusFilter }),
        listAgencyClientsApi(orgId, { page: 1, limit: 500 }),
      ]);
      setProjects(p);
      setClients(c.items);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to load projects.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [orgId, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setBudget("");
    setStatus("active");
    setSelectedClientIds([]);
    setDialogOpen(true);
  };

  const openEdit = (p: ProjectListItemDto) => {
    setEditing(p);
    setName(p.name);
    setDescription(p.description ?? "");
    setStartDate(p.startDate ?? "");
    setEndDate(p.endDate ?? "");
    setBudget(p.budget != null ? String(p.budget) : "");
    setStatus(p.status);
    void listProjectClientsForEdit(p);
  };

  const listProjectClientsForEdit = async (p: ProjectListItemDto) => {
    if (!orgId) return;
    try {
      const assigned = await listProjectClientsApi(orgId, p.id);
      setSelectedClientIds(assigned.map((c) => c.id));
      setDialogOpen(true);
    } catch {
      setSelectedClientIds([]);
      setDialogOpen(true);
    }
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      toast.error("Project name is required.");
      return false;
    }
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      toast.error("End date must be on or after start date.");
      return false;
    }
    return true;
  };

  const saveProject = async () => {
    if (!orgId || !validateForm()) return;
    const budgetNum = budget.trim() === "" ? null : Number(budget);
    if (budgetNum !== null && (!Number.isFinite(budgetNum) || budgetNum < 0)) {
      toast.error("Budget must be a non-negative number.");
      return;
    }
    try {
      await run(
        async () => {
          if (editing) {
            await updateAgencyProjectApi(orgId, editing.id, {
              name: name.trim(),
              description: description.trim() || null,
              startDate: startDate || null,
              endDate: endDate || null,
              status,
              budget: budgetNum,
            });
            await replaceProjectClientsApi(orgId, editing.id, selectedClientIds);
          } else {
            const created = await createAgencyProjectApi(orgId, {
              name: name.trim(),
              description: description.trim() || null,
              startDate: startDate || null,
              endDate: endDate || null,
              status: "active",
              budget: budgetNum,
            });
            await replaceProjectClientsApi(orgId, created.id, selectedClientIds);
          }
        },
        {
          successMessage: editing ? "Project updated." : "Project created.",
        },
      );
      setDialogOpen(false);
      await load();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not save project.";
      toast.error(msg);
    }
  };

  const deleteProject = async (p: ProjectListItemDto) => {
    if (!orgId) return;
    if (!window.confirm(`Delete project "${p.name}"? This cannot be undone.`)) return;
    try {
      await run(() => deleteAgencyProjectApi(orgId, p.id), {
        successMessage: "Project deleted.",
      });
      await load();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Delete failed.";
      toast.error(msg);
    }
  };

  const confirmRemoveClient = async () => {
    if (!orgId || !removeTarget) return;
    try {
      await run(
        () =>
          removeProjectClientApi(orgId, removeTarget.project.id, removeTarget.client.id),
        { successMessage: "Client removed from project." },
      );
      setRemoveTarget(null);
      if (clientsDialogProject?.id === removeTarget.project.id) {
        setClientsDialogProject({
          ...removeTarget.project,
          clientCount: Math.max(0, removeTarget.project.clientCount - 1),
        });
      }
      await load();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Remove failed.";
      toast.error(msg);
    }
  };

  const openAgreementModal = async (p: ProjectListItemDto) => {
    if (!orgId) return;
    try {
      const assigned = await listProjectClientsApi(orgId, p.id);
      let agreement: AgreementDto | null = null;
      try {
        agreement = await getAgreementByProjectApi(orgId, p.id);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) agreement = null;
        else throw e;
      }
      setAgreementModal({
        project: p,
        agreement,
        assignedIds: assigned.map((c) => c.id),
      });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not open agreement.";
      toast.error(msg);
    }
  };

  const filtered = useMemo(() => projects, [projects]);

  const toggleClient = (id: string, checked: boolean) => {
    setSelectedClientIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  if (!orgId) {
    return <p className="text-muted-foreground text-sm">Select an organization to manage projects.</p>;
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
            <p className="text-muted-foreground text-sm">Manage engagements, clients, and agreements.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              className="w-[180px]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AgencyProjectStatus | "all")}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on-hold">On hold</option>
              <option value="cancelled">Cancelled</option>
            </Select>
            <Button type="button" onClick={openCreate}>
              Add project
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : (
          <>
            <div className="hidden rounded-md border md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Clients</TableHead>
                    <TableHead>Agreement</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/agency/projects/${encodeId(p.id)}`)}
                    >
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {(p.description ?? "").length > 50 ? `${(p.description ?? "").slice(0, 50)}…` : p.description ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{p.status}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {p.startDate ?? "—"} → {p.endDate ?? "—"}
                      </TableCell>
                      <TableCell>{formatBudget(p.budget, p.currency)}</TableCell>
                      <TableCell>{p.clientCount}</TableCell>
                      <TableCell>{agreementBadge(p)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            void (async () => {
                              if (!orgId) return;
                              try {
                                const assigned = await listProjectClientsApi(orgId, p.id);
                                setClientsDialogProject({ ...p, clientCount: assigned.length });
                              } catch {
                                setClientsDialogProject(p);
                              }
                            })();
                          }}
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(p);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            void deleteProject(p);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        {p.agreementSummary ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-1"
                            title="Download agreement PDF"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!orgId || !p.agreementSummary) return;
                              void (async () => {
                                try {
                                  await downloadAgreementPdfApi(
                                    orgId,
                                    p.agreementSummary!.id,
                                    `agreement-${p.agreementSummary!.id}.pdf`,
                                  );
                                } catch (err) {
                                  toast.error(err instanceof ApiError ? err.message : "Could not download PDF.");
                                }
                              })();
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        ) : null}
                        {(p.clientCount > 0 || p.agreementSummary) && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="ml-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              void openAgreementModal(p);
                            }}
                          >
                            {p.agreementSummary ? "Edit agreement" : "Add agreement"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-3 md:hidden">
              {filtered.map((p) => (
                <Card
                  key={p.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/agency/projects/${encodeId(p.id)}`)}
                >
                  <CardContent className="space-y-2 p-4 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{p.name}</p>
                      <Badge variant="outline">{p.status}</Badge>
                    </div>
                    <p className="text-muted-foreground line-clamp-2">
                      {(p.description ?? "").length > 50 ? `${(p.description ?? "").slice(0, 50)}…` : p.description ?? "—"}
                    </p>
                    <p className="text-muted-foreground">
                      {p.startDate ?? "—"} → {p.endDate ?? "—"}
                    </p>
                    <p>{formatBudget(p.budget, p.currency)}</p>
                    <p>Clients: {p.clientCount}</p>
                    <div className="flex items-center gap-2">Agreement: {agreementBadge(p)}</div>
                    <div className="flex flex-wrap gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          void (async () => {
                            if (!orgId) return;
                            try {
                              const assigned = await listProjectClientsApi(orgId, p.id);
                              setClientsDialogProject({ ...p, clientCount: assigned.length });
                            } catch {
                              setClientsDialogProject(p);
                            }
                          })();
                        }}
                      >
                        View clients
                      </Button>
                      {p.agreementSummary ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!orgId) return;
                            void (async () => {
                              try {
                                await downloadAgreementPdfApi(
                                  orgId,
                                  p.agreementSummary!.id,
                                  `agreement-${p.agreementSummary!.id}.pdf`,
                                );
                              } catch (err) {
                                toast.error(err instanceof ApiError ? err.message : "Could not download PDF.");
                              }
                            })();
                          }}
                        >
                          PDF
                        </Button>
                      ) : null}
                      {(p.clientCount > 0 || p.agreementSummary) && (
                        <Button type="button" size="sm" variant="outline" onClick={() => void openAgreementModal(p)}>
                          {p.agreementSummary ? "Edit agreement" : "Add agreement"}
                        </Button>
                      )}
                      <Button type="button" size="sm" variant="ghost" onClick={() => openEdit(p)}>
                        Edit
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => void deleteProject(p)}>
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit project" : "Add project"}</DialogTitle>
              <DialogDescription>
                {editing ? "Update project details and linked clients." : "Create a project and attach clients."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label htmlFor="p-name">Name *</Label>
                <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              {editing ? (
                <div>
                  <Label>Status</Label>
                  <Select value={status} onChange={(e) => setStatus(e.target.value as AgencyProjectStatus)}>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="on-hold">On hold</option>
                    <option value="cancelled">Cancelled</option>
                  </Select>
                </div>
              ) : null}
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Label htmlFor="p-budget">Budget</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground">
                        <Info className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      Optional project budget. Used for agreement payment previews and milestone guardrails.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input id="p-budget" type="number" min={0} step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Start date</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <Label>End date</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
              <div>
                <Label htmlFor="p-desc">Description</Label>
                <Textarea id="p-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>
              <div>
                <Label>Clients</Label>
                <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-md border border-border p-2">
                  {clients.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selectedClientIds.includes(c.id)}
                        onCheckedChange={(v) => toggleClient(c.id, v === true)}
                      />
                      <span>{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void saveProject()}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(clientsDialogProject)} onOpenChange={(o) => !o && setClientsDialogProject(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clients on project</DialogTitle>
              <DialogDescription>{clientsDialogProject?.name}</DialogDescription>
            </DialogHeader>
            <ProjectClientsListBody
              orgId={orgId}
              project={clientsDialogProject}
              onRemove={(client) => {
                if (clientsDialogProject) setRemoveTarget({ project: clientsDialogProject, client });
              }}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setClientsDialogProject(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(removeTarget)} onOpenChange={(o) => !o && setRemoveTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove client?</DialogTitle>
              <DialogDescription>
                Remove {removeTarget?.client.name} from {removeTarget?.project.name}?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRemoveTarget(null)}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={() => void confirmRemoveClient()}>
                Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {agreementModal ? (
          <AgreementModal
            open
            onOpenChange={(o) => !o && setAgreementModal(null)}
            orgId={orgId}
            projectId={agreementModal.project.id}
            projectName={agreementModal.project.name}
            projectData={{
              budget: agreementModal.project.budget,
              startDate: agreementModal.project.startDate,
              endDate: agreementModal.project.endDate,
              currency: agreementModal.project.currency,
            }}
            assignedClientIds={agreementModal.assignedIds}
            clients={clients}
            existingAgreement={agreementModal.agreement}
            providerDefaults={{
              serviceProviderName: admin?.name ?? "Service Provider",
              signerName: admin?.name ?? "Authorized signatory",
            }}
            onComplete={() => {
              setAgreementModal(null);
              void load();
            }}
          />
        ) : null}
      </div>
    </TooltipProvider>
  );
}

function ProjectClientsListBody({
  orgId,
  project,
  onRemove,
}: {
  orgId: string;
  project: ProjectListItemDto | null;
  onRemove: (c: AgencyClientDto) => void;
}) {
  const [rows, setRows] = useState<AgencyClientDto[]>([]);

  useEffect(() => {
    if (!project) {
      setRows([]);
      return;
    }
    void (async () => {
      try {
        const list = await listProjectClientsApi(orgId, project.id);
        setRows(list);
      } catch {
        setRows([]);
      }
    })();
  }, [orgId, project]);

  if (!project) return null;

  return (
    <ul className="max-h-64 space-y-2 overflow-y-auto">
      {rows.map((c) => (
        <li key={c.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
          <span>{c.name}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(c)}>
            ✕
          </Button>
        </li>
      ))}
      {rows.length === 0 ? <li className="text-muted-foreground text-sm">No clients linked.</li> : null}
    </ul>
  );
}
