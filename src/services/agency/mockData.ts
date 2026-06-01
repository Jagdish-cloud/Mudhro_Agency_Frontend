import type {
  AgencyActivity,
  AgencyChatMessage,
  AgencyChatThread,
  AgencyClient,
  AgencyDashboardMetrics,
  AgencyExpense,
  AgencyInvoice,
  AgencyMember,
  AgencyNotification,
  AgencyProject,
  Organization,
} from "@/types/agency";

export const mockOrganization: Organization = {
  id: "org-1",
  name: "Mudhro Agency",
  legalName: "Mudhro Agency Pvt Ltd",
  gstNumber: "22AAAAA0000A1Z5",
  panNumber: "AAAAA0000A",
  email: "ops@mudhro.agency",
  phone: "+91 9876543210",
  address: "Bengaluru, Karnataka, India",
  timezone: "Asia/Kolkata",
  createdAt: "2025-01-01T00:00:00.000Z",
};

export const mockClients: AgencyClient[] = [
  {
    id: "client-1",
    organizationId: "org-1",
    name: "Acme Retail Pvt Ltd",
    contactName: "Arjun Rao",
    email: "arjun@acme.com",
    phone: "+91 9000000001",
    status: "active",
    billingAddress: "Mumbai, Maharashtra",
    gstNumber: "27ABCDE1234F1Z9",
    createdAt: "2025-01-10T09:00:00.000Z",
    updatedAt: "2025-02-10T09:00:00.000Z",
  },
  {
    id: "client-2",
    organizationId: "org-1",
    name: "BlueSky Labs",
    contactName: "Neha Das",
    email: "neha@bluesky.io",
    phone: "+91 9000000002",
    status: "active",
    billingAddress: "Pune, Maharashtra",
    gstNumber: null,
    createdAt: "2025-01-12T09:00:00.000Z",
    updatedAt: "2025-03-02T09:00:00.000Z",
  },
];

export const mockProjects: AgencyProject[] = [
  {
    id: "proj-1",
    organizationId: "org-1",
    clientId: "client-1",
    name: "Ecommerce Growth Sprint",
    startDate: "2025-02-01",
    endDate: "2025-06-30",
    budget: 850000,
    status: "active",
    agreement: {
      agreementNumber: "AGR-ACME-2025-01",
      agreementDate: "2025-01-29",
      agreementValue: 850000,
      documentName: "acme-agreement.pdf",
      documentUrl: "/mock/documents/acme-agreement.pdf",
      documentMimeType: "application/pdf",
      uploadedAt: "2025-01-29T10:00:00.000Z",
    },
    billedAmount: 450000,
    receivedAmount: 290000,
    pendingAmount: 160000,
    expensesAmount: 120000,
    createdAt: "2025-02-01T00:00:00.000Z",
    updatedAt: "2025-03-01T00:00:00.000Z",
  },
  {
    id: "proj-2",
    organizationId: "org-1",
    clientId: "client-1",
    name: "Retention Automation Setup",
    startDate: "2025-03-15",
    budget: 350000,
    status: "planned",
    billedAmount: 0,
    receivedAmount: 0,
    pendingAmount: 0,
    expensesAmount: 0,
    createdAt: "2025-03-15T00:00:00.000Z",
    updatedAt: "2025-03-15T00:00:00.000Z",
  },
];

export const mockExpenses: AgencyExpense[] = [
  {
    id: "exp-1",
    organizationId: "org-1",
    vendorId: "vendor-1",
    projectId: "proj-1",
    billNumber: "BILL-001",
    billDate: "2025-04-01",
    dueDate: "2025-04-15",
    taxPercentage: 18,
    subTotalAmount: 15000,
    totalAmount: 17700,
    attachmentFileName: null,
    expenseFileName: null,
    additionalNotes: "Campaign spend",
    createdAt: "2025-04-01T10:00:00.000Z",
    updatedAt: "2025-04-01T10:00:00.000Z",
  },
  {
    id: "exp-2",
    organizationId: "org-1",
    vendorId: "vendor-1",
    projectId: null,
    billNumber: "BILL-002",
    billDate: "2025-04-04",
    dueDate: "2025-04-18",
    taxPercentage: 18,
    subTotalAmount: 22000,
    totalAmount: 25960,
    attachmentFileName: null,
    expenseFileName: null,
    additionalNotes: "April rent",
    createdAt: "2025-04-04T10:00:00.000Z",
    updatedAt: "2025-04-04T10:00:00.000Z",
  },
];

export const mockInvoices: AgencyInvoice[] = [
  {
    id: "inv-1",
    organizationId: "org-1",
    clientId: "client-1",
    projectId: "proj-1",
    invoiceNumber: "INV-2025-041",
    issueDate: "2025-04-02",
    dueDate: "2025-04-12",
    status: "overdue",
    subtotal: 150000,
    taxTotal: 27000,
    grandTotal: 177000,
    amountReceived: 40000,
    amountPending: 137000,
    items: [
      { id: "i-1", itemName: "Campaign Management", qty: 1, rate: 100000, taxPercent: 18, hsnCode: "998365", lineTotal: 118000 },
      { id: "i-2", itemName: "Performance Reporting", qty: 2, rate: 25000, taxPercent: 18, hsnCode: "998366", lineTotal: 59000 },
    ],
    reminders: [
      { id: "r-1", type: "before_due", scheduledFor: "2025-04-10", sentAt: "2025-04-10", channel: "email", status: "sent" },
      { id: "r-2", type: "on_due", scheduledFor: "2025-04-12", sentAt: "2025-04-12", channel: "in_app", status: "sent" },
      { id: "r-3", type: "overdue", scheduledFor: "2025-04-14", channel: "email", status: "scheduled" },
    ],
    createdAt: "2025-04-02T10:00:00.000Z",
    updatedAt: "2025-04-12T10:00:00.000Z",
  },
];

export const mockMembers: AgencyMember[] = [
  {
    id: "member-1",
    organizationId: "org-1",
    name: "Riya Sharma",
    email: "riya@mudhro.agency",
    mobile: "+91 9898989898",
    designation: "Operations Lead",
    role: "admin",
    status: "active",
    joinedAt: "2024-12-01",
  },
  {
    id: "member-2",
    organizationId: "org-1",
    name: "Vikram Patel",
    email: "vikram@mudhro.agency",
    mobile: "+91 9797979797",
    designation: "Account Manager",
    role: "manager",
    status: "active",
    joinedAt: "2025-01-11",
  },
];

export const mockNotifications: AgencyNotification[] = [
  {
    id: "not-1",
    organizationId: "org-1",
    title: "Invoice overdue",
    message: "INV-2025-041 is overdue by 3 days.",
    severity: "critical",
    reminderType: "overdue",
    relatedEntityType: "invoice",
    relatedEntityId: "inv-1",
    isRead: false,
    createdAt: "2025-04-15T08:00:00.000Z",
  },
];

export const mockActivities: AgencyActivity[] = [
  { id: "act-1", type: "client", action: "created", actorName: "Riya Sharma", message: "Added BlueSky Labs.", createdAt: "2025-04-14T10:00:00.000Z" },
  { id: "act-2", type: "invoice", action: "sent", actorName: "Vikram Patel", message: "Sent INV-2025-041.", createdAt: "2025-04-13T10:00:00.000Z" },
  { id: "act-3", type: "expense", action: "created", actorName: "Riya Sharma", message: "Logged Office Rent expense.", createdAt: "2025-04-12T10:00:00.000Z" },
];

export const mockDashboardMetrics: AgencyDashboardMetrics = {
  totalReceivables: 137000,
  pendingInvoicesCount: 2,
  monthRevenue: 290000,
  monthExpenses: 37000,
};

export const mockThreads: AgencyChatThread[] = [
  {
    id: "thread-1",
    organizationId: "org-1",
    type: "group",
    title: "General",
    participantMemberIds: ["member-1", "member-2"],
    unreadCount: 2,
    lastMessageAt: new Date().toISOString(),
  },
];

export const mockMessages: AgencyChatMessage[] = [
  {
    id: "chat-1",
    threadId: "thread-1",
    senderMemberId: "member-1",
    content: "Let us close pending invoice follow-ups by EOD.",
    sentAt: new Date().toISOString(),
  },
];
