# Azure Portal checklist (frontend)

Use this when creating the Web App and connecting GitHub. Code is on `main` at `Jagdish-cloud/Mudhro_Agency_Frontend`.

## 1. Create Web App

- **Resource group:** e.g. `rg-mudhro-agency-prod`
- **Name:** e.g. `mudhro-agency-web` → `https://mudhro-agency-web.azurewebsites.net`
- **Publish:** Code
- **Runtime:** Node 20 LTS
- **OS:** Linux
- **Plan:** B1 or higher (Always On + WebSockets)

## 2. Application settings

Configuration → Application settings → New application setting:

| Name | Value |
|------|--------|
| `VITE_API_BASE_URL` | `https://<YOUR-BACKEND-APP>.azurewebsites.net` (no trailing slash). **Runtime:** read by `server.js` via `/config.js` — restart/sync is enough after changing; rebuild only needed for other code changes. |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` |
| `WEBSITE_NODE_DEFAULT_VERSION` | `~20` |
| `NODE_ENV` | `production` |

Save, then redeploy if the app was already deployed without `VITE_API_BASE_URL`.

## 3. General settings

Configuration → General settings:

- **Startup Command:** leave empty, or set explicitly to `npm start` (required — `/config.js` is served by Node `server.js`, not a file in GitHub)
- **Always On:** On
- **HTTPS Only:** On
- **Web sockets:** On

## 4. Deployment Center

- Source: GitHub
- Repo: `Mudhro_Agency_Frontend`, branch `main`
- Build provider: App Service Build Service

## 5. Verify `config.js` (API URL)

`/config.js` is **not** in the GitHub repo. After deploy, open in a browser:

`https://<YOUR-FRONTEND-APP>.azurewebsites.net/config.js`

You should see one line like:

`window.__RUNTIME_CONFIG__={"apiBaseUrl":"https://your-backend.azurewebsites.net"};`

| Result | Meaning |
|--------|---------|
| **404 or HTML page** | App is not running `npm start` / `server.js`, or deploy is outdated — set Startup Command to `npm start`, sync latest `main`, restart |
| **`apiBaseUrl":""`** | `VITE_API_BASE_URL` missing during build or at runtime — add App Setting, **Sync** deployment, restart |
| **Correct backend URL** | Frontend can reach the API — try sign-in |

Also check the home page loads, then test `/sign-in`.

## 6. When backend exists

**Backend** App Service:

| Name | Value |
|------|--------|
| `APP_PUBLIC_URL` | `https://<FRONTEND-APP>.azurewebsites.net` |
| `SOCKET_CORS_ORIGIN` | Same URL as `APP_PUBLIC_URL` |

**Frontend:** set `VITE_API_BASE_URL` to backend URL → Save → Redeploy (Sync or push empty commit).
