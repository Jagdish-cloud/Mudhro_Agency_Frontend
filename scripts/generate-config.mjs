import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "..", "dist");
const indexPath = path.join(distDir, "index.html");
const configPath = path.join(distDir, "config.js");

const raw = process.env.VITE_API_BASE_URL ?? process.env.API_BASE_URL ?? "";
const apiBaseUrl = typeof raw === "string" ? raw.trim().replace(/\/$/, "") : "";

const configJs = `window.__RUNTIME_CONFIG__=${JSON.stringify({ apiBaseUrl })};\n`;
writeFileSync(configPath, configJs, "utf8");

let html = readFileSync(indexPath, "utf8");
if (!html.includes("/config.js")) {
  html = html.replace("<head>", '<head>\n    <script src="/config.js"></script>');
  writeFileSync(indexPath, html, "utf8");
}

console.log(
  apiBaseUrl
    ? `[generate-config] Wrote dist/config.js (apiBaseUrl length ${apiBaseUrl.length})`
    : "[generate-config] Wrote dist/config.js with empty apiBaseUrl — set VITE_API_BASE_URL in Azure before build or at runtime via npm start",
);
