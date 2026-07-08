// Monta os recursos do app desktop: builda o Next.js em modo standalone e
// copia (server standalone + estáticos + public + migrations + better-sqlite3
// + node.exe) para src-tauri/resources/, que o `tauri build` empacota.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const standalone = path.join(root, ".next", "standalone");
const resServer = path.join(root, "src-tauri", "resources", "server");
const resNode = path.join(root, "src-tauri", "resources", "node");

const rmrf = (p) => fs.rmSync(p, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
const cp = (a, b) => fs.cpSync(a, b, { recursive: true });

console.log("→ next build (standalone, APP_MODE=desktop)...");
execSync("next build", { cwd: root, stdio: "inherit", env: { ...process.env, APP_MODE: "desktop", NEXT_PUBLIC_APP_MODE: "desktop" } });

console.log("→ montando resources/server...");
rmrf(resServer);
fs.mkdirSync(resServer, { recursive: true });
cp(standalone, resServer); // server.js + node_modules mínimo + package.json
cp(path.join(root, ".next", "static"), path.join(resServer, ".next", "static"));
if (fs.existsSync(path.join(root, "public"))) cp(path.join(root, "public"), path.join(resServer, "public"));
cp(path.join(root, "local-db", "migrations"), path.join(resServer, "local-db", "migrations"));

// better-sqlite3 é módulo nativo — o trace do Next costuma perder o .node,
// então copia o pacote inteiro pra garantir o binário no destino.
const bsqlite = path.join(root, "node_modules", "better-sqlite3");
if (fs.existsSync(bsqlite)) cp(bsqlite, path.join(resServer, "node_modules", "better-sqlite3"));

console.log("→ montando resources/node (node.exe)...");
rmrf(resNode);
fs.mkdirSync(resNode, { recursive: true });
fs.copyFileSync(process.execPath, path.join(resNode, path.basename(process.execPath)));

console.log("✓ resources prontos em src-tauri/resources/");
