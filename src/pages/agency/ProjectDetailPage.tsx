import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { AgreementModal } from "@/components/agency/projects/AgreementModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentOrganizationId, getStoredAdminInfo } from "@/lib/agencyAuth";
import { decodeId } from "@/lib/idCodec";
import { ApiError } from "@/lib/apiClient";
import { downloadAgreementPdfApi, getAgreementByProjectApi } from "@/services/agency/agreementsService";
import { listAgencyClientsApi } from "@/services/agency/clientsService";
import { getAgencyProjectApi, listProjectClientsApi } from "@/services/agency/projectsService";
import type { AgencyClientDto } from "@/types/agencyInvoicing";
import type { AgreementDto } from "@/types/agency/agreement";
import type { ProjectDto } from "@/types/agency/project";

function agreementSummaryText(assignedCount: number, agreement: AgreementDto | null) {
  if (!agreement) return "No agreement yet.";
  const signed = agreement.signatures.filter((s) => s.signerType === "client").length;
  return `Status: ${agreement.status}. Client signatures: ${signed} of ${assignedCount || "—"} assigned clients.`;
}

export function ProjectDetailPage() {
  const { projectId: projectIdParam } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const orgId = getCurrentOrganizationId();
  const admin = getStoredAdminInfo();

  const projectId = projectIdParam ? decodeId(projectIdParam) : "";

  const [project, setProject] = useState<ProjectDto | null>(null);
  const [clients, setClients] = useState<AgencyClientDto[]>([]);
  const [assigned, setAssigned] = useState<AgencyClientDto[]>([]);
  const [agreement, setAgreement] = useState<AgreementDto | null>(null);
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!orgId || !projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [p, allClients, linked] = await Promise.all([
        getAgencyProjectApi(orgId, projectId),
        listAgencyClientsApi(orgId, { page: 1, limit: 500 }),
        listProjectClientsApi(orgId, projectId),
      ]);
      setProject(p);
      setClients(allClients.items);
      setAssigned(linked);
      try {
        const a = await getAgreementByProjectApi(orgId, projectId);
        setAgreement(a);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) setAgreement(null);
        else throw e;
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to load project.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [orgId, projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!orgId) {
    return <p className="text-muted-foreground p-4 text-sm">Sign in to view this project.</p>;
  }

  if (!projectId) {
    return <p className="text-muted-foreground p-4 text-sm">Invalid project link.</p>;
  }

  if (loading && !project) {
    return <p className="text-muted-foreground p-4 text-sm">Loading…</p>;
  }

  if (!project) {
    return (
      <div className="p-4">
        <p className="text-muted-foreground text-sm">Project not found.</p>
        <Button type="button" variant="link" className="mt-2 px-0" onClick={() => navigate("/agency/projects")}>
          Back to projects
        </Button>
      </div>
    );
  }

  const assignedIds = assigned.map((c) => c.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button type="button" variant="ghost" size="sm" className="mb-2 -ml-2" onClick={() => navigate("/agency/projects")}>
            ← Projects
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline">{project.status}</Badge>
            {project.startDate ?? "—"} → {project.endDate ?? "—"}
          </p>
        </div>
        {(assignedIds.length > 0 || agreement) && (
          <Button type="button" onClick={() => setAgreementOpen(true)}>
            {agreement ? "Edit agreement" : "Add agreement"}
          </Button>
        )}
      </div>

      {project.description ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Description</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{project.description}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clients on this project</CardTitle>
        </CardHeader>
        <CardContent>
          {assigned.length === 0 ? (
            <p className="text-muted-foreground text-sm">No clients assigned yet.</p>
          ) : (
            <ul className="list-inside list-disc text-sm">
              {assigned.map((c) => (
                <li key={c.id}>{c.name}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Agreement</CardTitle>
          {agreement ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void (async () => {
                  try {
                    await downloadAgreementPdfApi(orgId, agreement.id, `agreement-${agreement.id}.pdf`);
                  } catch (e) {
                    toast.error(e instanceof ApiError ? e.message : "Could not download PDF.");
                  }
                })();
              }}
            >
              Download PDF
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {agreementSummaryText(assigned.length, agreement)}
        </CardContent>
      </Card>

      {agreementOpen ? (
        <AgreementModal
          open={agreementOpen}
          onOpenChange={setAgreementOpen}
          orgId={orgId}
          projectId={project.id}
          projectName={project.name}
          projectData={{
            budget: project.budget,
            startDate: project.startDate,
            endDate: project.endDate,
            currency: project.currency,
          }}
          assignedClientIds={assignedIds}
          clients={clients}
          existingAgreement={agreement}
          providerDefaults={{
            serviceProviderName: admin?.name ?? "Service Provider",
            signerName: admin?.name ?? "Authorized signatory",
          }}
          onComplete={() => {
            setAgreementOpen(false);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}
