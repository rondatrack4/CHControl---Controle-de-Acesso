import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { requireSession } from "@/lib/auth";
import { getLocalDb } from "@/lib/db/local-client";

export const dynamic = "force-dynamic";

function mediaRoot(): string {
  return process.env.APP_DATA_DIR
    ? path.join(process.env.APP_DATA_DIR, "media")
    : path.join(process.cwd(), "local-db", "data", "media");
}

/** Grava a mídia em disco local e registra pra sincronizar depois. Desktop-only. */
export async function POST(request: Request) {
  if (process.env.APP_MODE !== "desktop") {
    return NextResponse.json({ error: "Rota disponível apenas no modo desktop." }, { status: 404 });
  }
  await requireSession();

  const form = await request.formData();
  const file = form.get("file");
  const relPath = String(form.get("path") ?? "");
  if (!(file instanceof Blob) || !relPath) {
    return NextResponse.json({ error: "Arquivo ou caminho ausente." }, { status: 400 });
  }
  // Impede path traversal — só aceita subpasta/nome simples.
  if (relPath.includes("..") || path.isAbsolute(relPath)) {
    return NextResponse.json({ error: "Caminho inválido." }, { status: 400 });
  }

  const dest = path.join(mediaRoot(), relPath);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, Buffer.from(await file.arrayBuffer()));

  // Fica pendente de upload pro Supabase Storage (o sync worker preenche remote_url).
  getLocalDb()
    .prepare(`INSERT OR REPLACE INTO media_uploads (local_path, remote_url, uploaded_at) VALUES (?, NULL, NULL)`)
    .run(relPath);

  return NextResponse.json({ url: `/api/media/${relPath}` });
}
