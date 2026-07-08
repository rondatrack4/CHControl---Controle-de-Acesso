import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

function mediaRoot(): string {
  return process.env.APP_DATA_DIR
    ? path.join(process.env.APP_DATA_DIR, "media")
    : path.join(process.cwd(), "local-db", "data", "media");
}

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

/** Serve a mídia local gravada por /api/media/upload. Desktop-only. */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (process.env.APP_MODE !== "desktop") {
    return NextResponse.json({ error: "Rota disponível apenas no modo desktop." }, { status: 404 });
  }
  await requireSession();

  const segments = (await params).path;
  const relPath = segments.join("/");
  if (relPath.includes("..")) {
    return NextResponse.json({ error: "Caminho inválido." }, { status: 400 });
  }

  const filePath = path.join(mediaRoot(), relPath);
  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  }
}
