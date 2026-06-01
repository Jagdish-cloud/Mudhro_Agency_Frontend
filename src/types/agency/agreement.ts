import type { AgencyAgreementStatus } from "./project";

export type AgreementDurationUnit = "days" | "weeks" | "months";
export type AgreementPaymentStructure =
  | "50-50"
  | "100-upfront"
  | "100-completion"
  | "milestone-based";
export type AgreementMilestoneStatus = "pending" | "created";
export type AgreementSignerType = "service_provider" | "client";
export type AgreementClientLinkStatus =
  | "pending"
  | "client_signed"
  | "expired";

export type AgreementDeliverable = {
  id: string;
  description: string;
  order: number;
};

export type AgreementMilestone = {
  id: string;
  description: string;
  amount: number;
  date: string | null;
  order: number;
  status: AgreementMilestoneStatus;
};

export type AgreementPaymentTerms = {
  id: string;
  paymentStructure: AgreementPaymentStructure;
  paymentMethod: string | null;
  milestones: AgreementMilestone[];
};

export type AgreementSignature = {
  id: string;
  signerType: AgreementSignerType;
  clientId: string | null;
  signerName: string;
  signatureImageName: string | null;
  signatureImagePath: string | null;
  signatureImageContainer?: string | null;
  ipAddress: string | null;
  documentId: string | null;
  signedAt: string;
};

export type AgreementDto = {
  id: string;
  organizationId: string;
  projectId: string;
  serviceProviderName: string;
  agreementDate: string;
  serviceType: string;
  startDate: string | null;
  endDate: string | null;
  duration: number | null;
  durationUnit: AgreementDurationUnit | null;
  numberOfRevisions: number;
  jurisdiction: string | null;
  status: AgencyAgreementStatus;
  documentId: string | null;
  finalPdfBlobPath?: string | null;
  finalPdfBlobContainer?: string | null;
  finalPdfByteSize?: number | null;
  finalPdfContentType?: string | null;
  finalPdfUploadedAt?: string | null;
  deliverables: AgreementDeliverable[];
  paymentTerms: AgreementPaymentTerms | null;
  signatures: AgreementSignature[];
  createdAt: string;
  updatedAt: string;
  /** Short-lived SAS URL from the API (edit / hydrated views). */
  serviceProviderSignaturePreviewUrl?: string;
};

export type DeliverableInput = { description: string };

export type MilestoneInput = {
  description: string;
  amount: number;
  date: string | null;
};

export type PaymentTermsInput = {
  paymentStructure: AgreementPaymentStructure;
  paymentMethod: string | null;
  milestones: MilestoneInput[];
};

export type CreateAgreementInput = {
  serviceProviderName: string;
  agreementDate: string;
  serviceType: string;
  startDate: string | null;
  endDate: string | null;
  duration: number | null;
  durationUnit: AgreementDurationUnit | null;
  numberOfRevisions: number;
  jurisdiction: string | null;
  deliverables: DeliverableInput[];
  paymentTerms: PaymentTermsInput;
  serviceProviderSignerName: string;
  serviceProviderSignatureImage: string;
};

export type UpdateAgreementInput = Partial<
  Omit<CreateAgreementInput, "serviceProviderSignerName" | "serviceProviderSignatureImage">
>;

export type SendAgreementResultEntry = {
  clientId: string;
  delivered: boolean;
  error?: string;
};

export type SendAgreementResponse = {
  agreementId: string;
  sent: number;
  failures: SendAgreementResultEntry[];
  results: SendAgreementResultEntry[];
};

export type PortalClient = {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
};

export type PortalProject = {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  budget: number | null;
};

export type PortalOrganization = {
  id: string;
  name: string;
};

export type PortalAgreementResponse =
  | {
      valid: false;
      expired: boolean;
      reason: string;
    }
  | {
      valid: true;
      expired: false;
      alreadySigned: boolean;
      canResign: boolean;
      agreement: AgreementDto;
      project: PortalProject;
      client: PortalClient;
      organization: PortalOrganization;
      link: {
        expiresAt: string;
        status: AgreementClientLinkStatus;
      };
    };

export type SignAgreementInput = {
  signerName: string;
  signatureImage: string;
};
