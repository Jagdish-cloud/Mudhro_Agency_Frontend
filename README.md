# Mudhro Agency Frontend

B2B marketing landing, organization registration, and admin sign-in flow for Mudhro Agency (team edition of Mudhro).

## Stack

- React19 + TypeScript + Vite8
- Tailwind CSS v4 (`@tailwindcss/vite`)
- Shadcn-style UI (Radix primitives + `class-variance-authority`)
- `react-hook-form` + `zod` + `@hookform/resolvers`

## Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Routes

### Public

- `/` — Landing (hero, features, trust, footer)
- `/contact` — Contact & registration entry
- `/sign-in` — Admin login page
- `/portal/invoices/:token` — **Public client-facing invoice view** (no auth). Token rotates from the org on demand.

### Authenticated shell (`/agency/*`, gated by `RequireAgencyAuth`)

- `/agency` — Dashboard
- `/agency/clients` — Clients list (search + filter + create/edit dialog + soft delete)
- `/agency/clients/:clientId` — Client profile + per-client catalog items (reusable line items) + related invoices
- `/agency/projects` — Projects
- `/agency/expenses` — Expenses
- `/agency/invoices` — Invoices list (search, status, client, overdue-only, Created-by column)
- `/agency/invoices/new` — Invoice builder (line items with HSN, installments, live CGST/SGST/IGST split, Add-from-catalog dropdown per client, and per-row Save-to-catalog button)
- `/agency/invoices/:invoiceId` — Invoice detail (items, installments, payments, reminders, attachments, send, PDF, portal link, record-payment dialog)
- `/agency/invoices/:invoiceId/edit` — Invoice builder (edit mode)
- `/agency/reports` — Monthly report (revenue, receivables, overdue, top clients)
- `/agency/members` — Members
- `/agency/chat` — Chat
- `/agency/profile` — Self profile
- `/agency/organization` — Organization profile

### Permissions

Destructive and "send" actions are wrapped in `<AgencyPermissionGate>` that
reads the `role` claim from the JWT. Only Admins see Create/Edit/Delete,
Send-invoice, Record-payment, Rotate-portal-token, and Attachment upload
buttons; Members see read-only views.

## API integration

Registration posts to:

`POST {VITE_API_BASE_URL}/api/organizations/register`

Admin login posts to:

`POST {VITE_API_BASE_URL}/api/auth/admin/login`

If `VITE_API_BASE_URL` is not set and app runs on localhost, client falls back to `http://localhost:4000`.

See `.env.example`.

## Project structure (high level)

- `src/pages/*` — route screens
- `src/pages/agency/*` — authenticated shell screens
- `src/pages/PortalInvoicePage.tsx` — public client portal
- `src/components/landing/*` — landing sections
- `src/components/registration/*` — registration form
- `src/components/agency/*` — shell chrome, sidebar, permission gate, client form dialog, client-item form dialog
- `src/components/ui/*` — reusable primitives (`Input`, `Button`, `Dialog`, `Select`, `Textarea`, …)
- `src/schemas/*` — Zod validators (`agencyClientSchema`, `agencyClientItemSchema`, `agencyInvoiceSchema`, …)
- `src/lib/apiClient.ts` — `apiRequest`, `apiDownloadBlob`, `apiUploadFile`, `triggerBlobDownload`
- `src/lib/currency.ts` — currency list + formatting helpers
- `src/lib/invoiceTax.ts` — CGST/SGST/IGST split mirror of the backend logic
- `src/services/agency/clientsService.ts` — client CRUD API (`*Api` suffixed exports)
- `src/services/agency/clientItemsService.ts` — per-client catalog items CRUD + `saveInvoiceRowToCatalogApi`
- `src/services/agency/invoicesService.ts` — invoices + installments + payments + reminders + attachments + reports
- `src/services/agency/portalService.ts` — public portal fetch (no auth)
