import {
  BarChart3,
  FileText,
  Landmark,
  Receipt,
  Users,
  Wallet,
} from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    title: "Invoicing",
    description: "Issue professional invoices, track statuses, and keep revenue visibility consistent across clients.",
    icon: FileText,
  },
  {
    title: "Expense tracking",
    description: "Capture receipts and categorize spend so your P&L stays accurate without spreadsheet chaos.",
    icon: Receipt,
  },
  {
    title: "Payments tracking",
    description: "Reconcile inflows and outflows with clear paid, pending, and overdue signals for the whole team.",
    icon: Wallet,
  },
  {
    title: "Tax / GST support",
    description: "Model GST-ready workflows and tax calculations with guardrails for registered and unregistered entities.",
    icon: Landmark,
  },
  {
    title: "Monthly reporting & PDF export",
    description: "Generate monthly financial reports with printable, downloadable PDFs for leadership and compliance.",
    icon: BarChart3,
  },
  {
    title: "Multi-user collaboration",
    description: "Designed for organization admins today—with a path to structured team member access tomorrow.",
    icon: Users,
  },
] as const;

export function FeaturesSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Everything finance ops needs in one place</h2>
        <p className="mt-3 text-muted-foreground">
          Mudhro Agency is built for managers who need control, clarity, and audit-friendly outputs—without slowing the team down.
        </p>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <Card key={f.title} className="shadow-sm">
              <CardHeader className="space-y-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-5 w-5 text-foreground" />
                </div>
                <CardTitle className="text-base">{f.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">{f.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
