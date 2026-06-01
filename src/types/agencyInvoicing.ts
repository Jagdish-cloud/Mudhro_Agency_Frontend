export type AgencyInvoiceStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "paid"
  | "partial"
  | "overdue"
  | "cancelled";

export type AgencyInstallmentStatus = "pending" | "paid" | "overdue" | "cancelled";

export type AgencyPaymentMethod =
  | "cash"
  | "upi"
  | "bank_transfer"
  | "card"
  | "cheque"
  | "other";

export type AgencyReminderType = "before_due" | "on_due" | "overdue" | "custom";
export type AgencyReminderChannel = "email" | "in_app";
export type AgencyReminderStatus = "scheduled" | "sent" | "failed" | "cancelled";

export type AgencyClientStatus = "active" | "inactive" | "archived";

export type AgencyClientDto = {
  id: string;
  organizationId: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  billingAddress: string | null;
  gstNumber: string | null;
  panNumber: string | null;
  stateCode: string | null;
  status: AgencyClientStatus;
  notes: string | null;
  tags: string[];
  createdByOrgUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListClientsResult = {
  items: AgencyClientDto[];
  total: number;
  page: number;
  limit: number;
};

export type AgencyVendorDto = {
  id: string;
  organizationId: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  billingAddress: string | null;
  gstNumber: string | null;
  panNumber: string | null;
  stateCode: string | null;
  status: AgencyClientStatus;
  notes: string | null;
  tags: string[];
  createdByOrgUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListVendorsResult = {
  items: AgencyVendorDto[];
  total: number;
  page: number;
  limit: number;
};

export type CreateVendorInput = {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  billingAddress?: string;
  gstNumber?: string;
  panNumber?: string;
  stateCode?: string;
  status?: AgencyClientStatus;
  notes?: string;
  tags?: string[];
};

export type AgencyVendorItemDto = {
  id: string;
  organizationId: string;
  vendorId: string;
  serviceId: string;
  serviceName: string;
  itemName: string;
  description: string | null;
  defaultQuantity: number;
  defaultRate: number;
  createdByOrgUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateVendorItemInput = {
  itemName: string;
  description?: string;
  defaultQuantity?: number;
  defaultRate?: number;
};

export type UpdateVendorItemInput = Partial<CreateVendorItemInput>;

export type AgencyClientItemDto = {
  id: string;
  organizationId: string;
  clientId: string;
  itemName: string;
  description: string | null;
  hsnCode: string;
  defaultRate: number;
  defaultTaxPercent: number;
  defaultDiscountPercent: number;
  unit: string | null;
  createdByOrgUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateClientItemInput = {
  itemName: string;
  description?: string;
  hsnCode: string;
  defaultRate?: number;
  defaultTaxPercent?: number;
  defaultDiscountPercent?: number;
  unit?: string;
};

export type UpdateClientItemInput = Partial<CreateClientItemInput>;

export type SaveInvoiceRowToCatalogInput = {
  itemName: string;
  description?: string;
  hsnCode: string;
  rate: number;
  taxPercent: number;
  discountPercent: number;
  unit?: string;
};

export type AgencyInvoiceItemDto = {
  id: string;
  position: number;
  itemName: string;
  description: string | null;
  hsnCode: string;
  qty: number;
  rate: number;
  discountPercent: number;
  taxPercent: number;
  lineSubtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  taxAmount: number;
  lineTotal: number;
};

export type AgencyInstallmentDto = {
  id: string;
  sequence: number;
  dueDate: string;
  amount: number;
  status: AgencyInstallmentStatus;
  paidAt: string | null;
};

export type AgencyPaymentDto = {
  id: string;
  invoiceId: string;
  installmentId: string | null;
  amount: number;
  paymentGatewayFee: number;
  tdsDeducted: number;
  otherDeduction: number;
  settlementReferenceAmount: number | null;
  method: AgencyPaymentMethod;
  reference: string | null;
  receivedAt: string;
  notes: string | null;
  recordedByOrgUserId: string;
  createdAt: string;
};

export type AgencyReminderDto = {
  id: string;
  invoiceId: string;
  type: AgencyReminderType;
  offsetDays: number;
  scheduledFor: string;
  channel: AgencyReminderChannel;
  status: AgencyReminderStatus;
  sentAt: string | null;
  error: string | null;
};

export type AgencyAttachmentDto = {
  id: string;
  invoiceId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByOrgUserId: string;
  createdAt: string;
};

export type AgencyInvoiceDto = {
  id: string;
  organizationId: string;
  clientId: string;
  projectId: string | null;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  status: AgencyInvoiceStatus;
  paymentTerms: string | null;
  notes: string | null;
  placeOfSupply: string | null;
  subtotal: number;
  discountTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  taxTotal: number;
  grandTotal: number;
  amountReceived: number;
  amountPending: number;
  amountsInclusiveOfTax: boolean;
  remindersEnabled: boolean;
  reminderOffsets: number[] | null;
  portalToken: string;
  sentAt: string | null;
  viewedAt: string | null;
  createdByOrgUserId: string;
  createdByName: string;
  createdByEmail: string;
  createdAt: string;
  updatedAt: string;
  items: AgencyInvoiceItemDto[];
  installments: AgencyInstallmentDto[];
  reminders: AgencyReminderDto[];
};

export type ListInvoicesResult = {
  items: AgencyInvoiceDto[];
  total: number;
  page: number;
  limit: number;
};

export type MonthlyReport = {
  month: string;
  currency: string;
  invoicedAmount: number;
  receivedAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  overdueCount: number;
  invoiceCount: number;
  paidCount: number;
  topClients: Array<{
    clientId: string;
    clientName: string;
    invoicedAmount: number;
    receivedAmount: number;
    invoiceCount: number;
  }>;
  statusBreakdown: Array<{ status: AgencyInvoiceStatus; count: number; amount: number }>;
};

export type CreateClientInput = {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  billingAddress?: string;
  gstNumber?: string;
  panNumber?: string;
  stateCode?: string;
  status?: AgencyClientStatus;
  notes?: string;
  tags?: string[];
};

export type CreateInvoiceItemInput = {
  itemName: string;
  description?: string;
  hsnCode: string;
  qty: number;
  rate: number;
  discountPercent?: number;
  taxPercent?: number;
};

export type CreateInstallmentInput = {
  sequence: number;
  dueDate: string;
  amount: number;
};

export type CreateInvoiceInput = {
  clientId: string;
  projectId?: string;
  invoiceNumber?: string;
  issueDate: string;
  dueDate: string;
  currency?: string;
  status?: AgencyInvoiceStatus;
  paymentTerms?: string;
  notes?: string;
  placeOfSupply?: string;
  items: CreateInvoiceItemInput[];
  installments?: CreateInstallmentInput[];
  discountTotal?: number;
  amountsInclusiveOfTax?: boolean;
  remindersEnabled?: boolean;
  reminderOffsets?: number[];
};

/** PATCH body; `projectId: null` clears the invoice project. */
export type PatchAgencyInvoiceInput = Omit<Partial<CreateInvoiceInput>, "projectId"> & {
  projectId?: string | null;
};

export type RecordPaymentInput = {
  amount: number;
  method?: AgencyPaymentMethod;
  reference?: string;
  receivedAt?: string;
  installmentId?: string;
  notes?: string;
  paymentGatewayFee?: number;
  tdsDeducted?: number;
  otherDeduction?: number;
};

export type SendInvoiceInput = {
  emailOverride?: string;
  cc?: string[];
  message?: string;
};

export type PortalInvoice = {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  status: AgencyInvoiceStatus | string;
  subtotal: number;
  discountTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  taxTotal: number;
  grandTotal: number;
  amountReceived: number;
  amountPending: number;
  paymentTerms: string | null;
  notes: string | null;
  organization: {
    name: string;
    address: string;
    email: string;
    phone: string;
    gstNumber: string | null;
  };
  client: {
    name: string;
    contactName: string | null;
    email: string | null;
    billingAddress: string | null;
    gstNumber: string | null;
  };
  items: AgencyInvoiceItemDto[];
  installments: AgencyInstallmentDto[];
  sentAt: string | null;
  viewedAt: string | null;
};
