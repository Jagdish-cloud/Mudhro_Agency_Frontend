/** Mirrors backend GET /reports/* JSON payloads */

export type AgencyReportPeriod = {
  label: string;
  fromInclusive: string;
  toInclusive: string;
};

export type InvoiceReportSlice = {
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
  statusBreakdown: Array<{ status: string; count: number; amount: number }>;
};

export type ExpenseVendorRow = {
  vendorId: string;
  vendorName: string;
  totalAmount: number;
  expenseCount: number;
};

export type ExpenseReportSlice = {
  expenseCount: number;
  expenseTotalAmount: number;
  topVendors: ExpenseVendorRow[];
};

export type OverallReportDto = {
  period: AgencyReportPeriod;
  invoices: InvoiceReportSlice;
  expenses: ExpenseReportSlice;
  netInvoicedMinusExpenses: number;
};

export type ClientReportDto = OverallReportDto & {
  clientId: string;
  clientName: string;
};

export type PaymentPendingInvoiceRow = {
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  grandTotal: number;
  amountPending: number;
  status: string;
};

export type PaymentPendingReportDto = {
  period: AgencyReportPeriod | null;
  items: PaymentPendingInvoiceRow[];
  totalPendingAmount: number;
  invoiceCount: number;
};

export type ReportPeriodQuery = {
  month?: string;
  year?: number;
  from?: string;
  to?: string;
};
