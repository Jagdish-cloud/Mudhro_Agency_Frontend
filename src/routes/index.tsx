import { Navigate, Route, Routes } from "react-router-dom";

import { AgencyShell } from "@/components/agency/AgencyShell";
import { RequireAgencyAuth } from "@/components/agency/RequireAgencyAuth";
import { AgencyDashboard } from "@/pages/agency/AgencyDashboard";
import { ChatPage } from "@/pages/agency/ChatPage";
import { ClientDetailPage } from "@/pages/agency/ClientDetailPage";
import { ClientsPage } from "@/pages/agency/ClientsPage";
import { ExpensesPage } from "@/pages/agency/ExpensesPage";
import { InvoiceBuilderPage } from "@/pages/agency/InvoiceBuilderPage";
import { InvoiceDetailPage } from "@/pages/agency/InvoiceDetailPage";
import { InvoicesPage } from "@/pages/agency/InvoicesPage";
import { MembersPage } from "@/pages/agency/MembersPage";
import { ReportsPage } from "@/pages/agency/ReportsPage";
import { OrganizationProfilePage } from "@/pages/agency/OrganizationProfilePage";
import { ProfilePage } from "@/pages/agency/ProfilePage";
import { ProjectDetailPage } from "@/pages/agency/ProjectDetailPage";
import { ProjectsPage } from "@/pages/agency/ProjectsPage";
import { VendorDetailPage } from "@/pages/agency/VendorDetailPage";
import { VendorsPage } from "@/pages/agency/VendorsPage";
import { AgreementSignPage } from "@/pages/AgreementSignPage";
import { ContactPage } from "@/pages/ContactPage";
import { LandingPage } from "@/pages/LandingPage";
import { PortalInvoicePage } from "@/pages/PortalInvoicePage";
import { SignInPage } from "@/pages/SignInPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/portal/invoices/:token" element={<PortalInvoicePage />} />
      <Route path="/agreement/sign/:token" element={<AgreementSignPage />} />
      <Route element={<RequireAgencyAuth />}>
        <Route path="/agency" element={<AgencyShell />}>
          <Route index element={<AgencyDashboard />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="clients/:clientId" element={<ClientDetailPage />} />
          <Route path="vendors" element={<VendorsPage />} />
          <Route path="vendors/:vendorId" element={<VendorDetailPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="invoices/new" element={<InvoiceBuilderPage />} />
          <Route path="invoices/:invoiceId" element={<InvoiceDetailPage />} />
          <Route path="invoices/:invoiceId/edit" element={<InvoiceBuilderPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="organization" element={<OrganizationProfilePage />} />
          <Route path="*" element={<Navigate to="/agency" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
