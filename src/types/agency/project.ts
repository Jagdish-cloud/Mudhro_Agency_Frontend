export type AgencyProjectStatus =
  | "active"
  | "completed"
  | "on-hold"
  | "cancelled";

export type AgencyAgreementStatus = "draft" | "pending" | "completed";

export type AgreementSummary = {
  id: string;
  status: AgencyAgreementStatus;
  signedClientCount: number;
  totalLinks: number;
};

export type ProjectDto = {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  status: AgencyProjectStatus;
  budget: number | null;
  currency: string;
  createdByOrgUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectListItemDto = ProjectDto & {
  clientCount: number;
  agreementSummary: AgreementSummary | null;
};

export type CreateProjectInput = {
  name: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: AgencyProjectStatus;
  budget?: number | null;
  currency?: string;
  clientIds?: string[];
};

export type UpdateProjectInput = Partial<
  Pick<
    CreateProjectInput,
    "name" | "description" | "startDate" | "endDate" | "status" | "budget" | "currency"
  >
>;
