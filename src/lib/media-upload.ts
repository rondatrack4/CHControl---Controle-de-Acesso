"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Envia um arquivo e devolve a URL pública (string) — mesma forma de dado nos
 * dois modos, então os formulários que consomem o retorno não mudam.
 *
 * - Nuvem: sobe direto pro Supabase Storage (bucket "media") pelo browser.
 * - Desktop (offline): POST pra /api/media/upload, que grava em disco local
 *   e devolve uma URL relativa (/api/media/...). Ver src/app/api/media/*.
 */
export async function uploadMedia(file: Blob, folder: string, filename?: string): Promise<string> {
  const ext = filename?.split(".").pop() || (file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg");
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  if (process.env.NEXT_PUBLIC_APP_MODE === "desktop") {
    const form = new FormData();
    form.append("file", file);
    form.append("path", path);
    const res = await fetch("/api/media/upload", { method: "POST", body: form });
    if (!res.ok) throw new Error("Falha no upload local.");
    const data = (await res.json()) as { url: string };
    return data.url;
  }

  const supabase = createClient();
  const { error } = await supabase.storage.from("media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}
