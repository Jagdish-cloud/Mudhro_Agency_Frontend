import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, "dist");
const port = Number(process.env.PORT) || 3000;

function resolveServerApiBaseUrl() {
  const raw = process.env.VITE_API_BASE_URL ?? process.env.API_BASE_URL ?? "";
  return typeof raw === "string" ? raw.trim().replace(/\/$/, "") : "";
}

let cachedIndexHtml = null;
function getIndexHtml() {
  if (!cachedIndexHtml) {
    let html = readFileSync(path.join(distPath, "index.html"), "utf8");
    if (!html.includes("/config.js")) {
      html = html.replace("<head>", '<head>\n    <script src="/config.js"></script>');
    }
    cachedIndexHtml = html;
  }
  return cachedIndexHtml;
}

const app = express();

app.get("/config.js", (_req, res) => {
  const apiBaseUrl = resolveServerApiBaseUrl();
  res.type("application/javascript");
  res.setHeader("Cache-Control", "no-store");
  res.send(`window.__RUNTIME_CONFIG__=${JSON.stringify({ apiBaseUrl })};`);
});

app.use(express.static(distPath, { index: false }));

app.use((_req, res) => {
  res.type("html").send(getIndexHtml());
});

app.listen(port, "0.0.0.0", () => {
  const apiBaseUrl = resolveServerApiBaseUrl();
  console.log(`Listening on port ${port}`);
  if (!apiBaseUrl) {
    console.warn(
      "Warning: VITE_API_BASE_URL is not set. Set it in Azure App Settings (runtime) or rebuild with it for sign-in/API calls.",
    );
  }
});
