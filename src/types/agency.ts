export type AgencyRole = "super_admin" | "admin" | "manager" | "member";

export type EntityStatus = "active" | "inactive" | "archived";
export type ProjectStatus = "planned" | "active" | "on_hold" | "completed" | "cancelled";
export type InvoiceStatus = "draft" | "sent" | "viewed" | "paid" | "overdue";
export type ExpenseType = "client_specific" | "general";
export type ReminderType = "before_due" | "on_due" | "overdue";
export type MemberStatus = "invited" | "active" | "inactive";
export type ChatThreadType = "direct" | "group";
export type ActivityEntityType = "client" | "project" | "expense" | "invoice" | "member";

export type Organization = {
  id: string;
  name: string;
  legalName: string;
  gstNumber: string | null;
  panNumber: string;
  email: string;
  phone: string;
  address: string;
  logoUrl?: string;
  timezone: string;
  createdAt: string;
};

export type AgencyClient = {
  id: string;
  organizationId: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  status: EntityStatus;
  billingAddress: string;
  gstNumber: string | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectAgreement = {
  agreementNumber: string;
  agreementDate: string;
  agreementValue: number;
  documentName?: string;
  documentUrl?: string;
  documentMimeType?: string;
  uploadedAt?: string;
};

export type AgencyProject = {
  id: string;
  organizationId: string;
  clientId: string;
  name: string;
  startDate: string;
  endDate?: string;
  budget: number;
  status: ProjectStatus;
  agreement?: ProjectAgreement;
  billedAmount: number;
  receivedAmount: number;
  pendingAmount: number;
  expensesAmount: number;
  createdAt: string;
  updatedAt: string;
};

export type AgencyExpense = {
  id: string;
  organizationId: string;
  vendorId: string;
  projectId: string | null;
  billNumber: string | null;
  billDate: string;
  dueDate: string;
  taxPercentage: number;
  subTotalAmount: number;
  totalAmount: number;
  attachmentFileName: string | null;
  expenseFileName: string | null;
  additionalNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Expense row from project-filtered list (includes joined client name). */
export type AgencyExpenseWithVendor = AgencyExpense & { vendorName?: string };

export type AgencyExpenseService = {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  defaultRate: number;
  createdAt: string;
  updatedAt: string;
};

export type AgencyExpenseLineItem = {
  id: string;
  expenseId: string;
  serviceId: string;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  createdAt: string;
  updatedAt: string;
};

export type AgencyInvoiceItem = {
  id: string;
  itemName: string;
  qty: number;
  rate: number;
  taxPercent: number;
  hsnCode: string;
  lineTotal: number;
};

export type AgencyInvoiceReminder = {
  id: string;
  type: ReminderType;
  scheduledFor: string;
  sentAt?: string;
  channel: "email" | "in_app";
  status: "scheduled" | "sent" | "failed";
};

export type AgencyInvoice = {
  id: string;
  organizationId: string;
  clientId: string;
  projectId?: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  amountReceived: number;
  amountPending: number;
  items: AgencyInvoiceItem[];
  reminders: AgencyInvoiceReminder[];
  createdAt: string;
  updatedAt: string;
};

export type AgencyMember = {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  mobile: string;
  designation: string;
  role: AgencyRole;
  status: MemberStatus;
  joinedAt: string;
};

export type AgencyNotification = {
  id: string;
  organizationId: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  reminderType?: ReminderType;
  relatedEntityType?: ActivityEntityType;
  relatedEntityId?: string;
  isRead: boolean;
  createdAt: string;
};

export type AgencyActivity = {
  id: string;
  type: ActivityEntityType;
  action: string;
  actorName: string;
  message: string;
  createdAt: string;
};

export type AgencyChatThread = {
  id: string;
  organizationId: string;
  type: ChatThreadType;
  title: string;
  participantMemberIds: string[];
  contextClientId?: string;
  contextProjectId?: string;
  unreadCount: number;
  lastMessageAt: string;
};

export type AgencyChatMessage = {
  id: string;
  threadId: string;
  senderMemberId: string;
  content: string;
  sentAt: string;
};

export type AgencyDashboardMetrics = {
  totalReceivables: number;
  pendingInvoicesCount: number;
  monthRevenue: number;
  monthExpenses: number;
};

export type AgencyDashboardFilters = {
  dateRange: "7d" | "30d" | "90d";
  clientId: string | "all";
  projectId: string | "all";
  memberId: string | "all";
};
