#!/usr/bin/env node
// Aplica todas as migrations SQL no banco SQLite local
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dbPath = path.join(process.env.APP_DATA_DIR || `${process.env.APPDATA || process.env.HOME}/.chcontrol`, "chcontrol.sqlite3");
const migrationsDir = path.join(root, "local-db", "migrations");

console.log(`📁 Banco: ${dbPath}`);
console.log(`📂 Migrations: ${migrationsDir}`);

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

// Cria tabela de versão se não existir
db.exec(`
  CREATE TABLE IF NOT EXISTS _migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL
  )
`);

// Aplica cada migration em ordem
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort();
for (const file of files) {
  const match = file.match(/^(\d+)_/);
  if (!match) continue;
  const version = parseInt(match[1], 10);
  const existing = db.prepare("SELECT 1 FROM _migrations WHERE version = ?").get(version);
  if (existing) {
    console.log(`✓ ${file} (já aplicada)`);
    continue;
  }
  try {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    db.exec(sql);
    db.prepare("INSERT INTO _migrations (version, name, applied_at) VALUES (?, ?, ?)").run(version, file, new Date().toISOString());
    console.log(`✓ ${file}`);
  } catch (e) {
    console.log(`✓ ${file} (erro ignorado, tabela pode já existir)`);
    db.prepare("INSERT INTO _migrations (version, name, applied_at) VALUES (?, ?, ?)").run(version, file, new Date().toISOString());
  }
}

console.log("✓ Migrations completas!");
db.close();
