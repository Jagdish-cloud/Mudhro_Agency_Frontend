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
npm run preview   # local preview of dist/
npm start         # production server (serves dist/ on PORT)
```

Requires **Node 20.19+** (see `.nvmrc`).

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

**Production:** Set `VITE_API_BASE_URL` in Azure App Settings to your backend URL. The production server serves `/config.js` at **runtime** (no frontend rebuild required when only the API URL changes). Rebuild is still required for other code changes.

Format: backend root only, **no trailing slash** — e.g. `https://mudhro-agency-api.azurewebsites.net` (paths already use `/api/...`).

See `.env.example`.

## Deploy to Azure App Service (Linux, Node 20)

Repository: `https://github.com/Jagdish-cloud/Mudhro_Agency_Frontend.git` (branch `main`).

Oryx runs `npm install` → `npm run build` → `npm start` (`server.js` serves `dist/` with SPA fallback for client routes).

### Create the Web App

| Setting | Value |
|---------|--------|
| Publish | Code |
| Runtime | Node 20 LTS |
| OS | Linux |
| Plan | B1+ recommended (Always On, WebSockets) |

### Deployment Center

| Setting | Value |
|---------|--------|
| Source | GitHub → `Jagdish-cloud` / `Mudhro_Agency_Frontend` |
| Branch | `main` |
| Build provider | App Service Build Service (Oryx) |

### Application settings (frontend)

Set **before** first production deploy (or redeploy after changes):

| Name | Value |
|------|--------|
| `VITE_API_BASE_URL` | `https://<BACKEND_APP_NAME>.azurewebsites.net` (no trailing slash; placeholder until API is deployed) |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` |
| `WEBSITE_NODE_DEFAULT_VERSION` | `~20` |
| `NODE_ENV` | `production` |

### General settings

| Setting | Value |
|---------|--------|
| Startup Command | *(empty — uses `npm start`)* |
| Always On | On |
| HTTPS Only | On |
| Web sockets | On |

### After the backend is deployed

On the **backend** App Service, set:

| Name | Value |
|------|--------|
| `APP_PUBLIC_URL` | Frontend URL (e.g. `https://<FRONTEND_APP_NAME>.azurewebsites.net`) |
| `SOCKET_CORS_ORIGIN` | Same frontend origin |
| `JWT_SECRET`, `DATABASE_URL`, etc. | See backend `.env.example` |

Then set frontend `VITE_API_BASE_URL` to the backend URL and **redeploy** the frontend.

### Verify

1. `https://<frontend>.azurewebsites.net/` — landing loads.
2. Refresh `https://<frontend>.azurewebsites.net/agency/invoices` — no 404 (SPA fallback).
3. After API is live — sign-in and Network tab show requests to `VITE_API_BASE_URL`.

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
