"use client";

import { useRef, useState } from "react";
import { FileText, Upload, Loader2, X, Eye, IdCard } from "lucide-react";
import { uploadMedia } from "@/lib/media-upload";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface DocumentUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  folder: string;
  /** Rótulo acima do campo (ex.: "Antecedentes Criminais"). */
  label?: string;
  /** Exibe uma moldura de documento com desenho, em vez do layout compacto em linha. */
  framed?: boolean;
}

function isPdfUrl(url: string) {
  return url.toLowerCase().split("?")[0].endsWith(".pdf");
}

export function DocumentUpload({ value, onChange, folder, label, framed }: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!(file.type.startsWith("image/") || file.type === "application/pdf")) {
      toast.error("Envie uma imagem ou um arquivo PDF.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 10MB).");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      const url = await uploadMedia(file, folder, file.name);
      onChange(url);
      toast.success("Documento enviado.");
    } catch (err) {
      console.error(err);
      toast.error("Falha ao enviar o documento.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const pdf = value ? isPdfUrl(value) : false;
  const fileInput = (
    <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
  );

  // --- Layout com moldura de documento (desenho de porta-documento) ---
  if (framed) {
    return (
      <div className="space-y-1.5">
        {label && <Label className="text-xs">{label}</Label>}
        <div className="group relative overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted/20 transition-colors hover:border-primary/50">
          {fileInput}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-[16/10] w-full items-center justify-center"
          >
            {value ? (
              pdf ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <FileText className="h-10 w-10" />
                  <span className="text-xs font-medium">Documento PDF</span>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={value} alt={label ?? "Documento"} className="h-full w-full object-cover" />
              )
            ) : (
              <DocumentFrameArt uploading={uploading} />
            )}
          </button>

          {/* Ações sobrepostas */}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
            <Button type="button" variant="secondary" size="sm" className="h-7 gap-1 text-xs" onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              {value ? "Trocar" : "Enviar"}
            </Button>
            {value && (
              <>
                <Button type="button" variant="secondary" size="sm" className="h-7 gap-1 text-xs" asChild>
                  <a href={value} target="_blank" rel="noreferrer"><Eye className="h-3 w-3" /> Ver</a>
                </Button>
                <Button type="button" variant="secondary" size="sm" className="h-7 gap-1 text-xs text-destructive" onClick={() => onChange(null)}>
                  <X className="h-3 w-3" /> Remover
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- Layout compacto em linha (padrão retrocompatível) ---
  return (
    <div className="space-y-1.5">
      {label && <Label>{label}</Label>}
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
          {value ? (
            pdf ? (
              <FileText className="h-7 w-7 text-muted-foreground" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="Documento" className="h-full w-full object-cover" />
            )
          ) : (
            <FileText className="h-7 w-7 text-muted-foreground/40" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          {fileInput}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
              {value ? "Trocar arquivo" : "Enviar foto ou PDF"}
            </Button>
            {value && (
              <>
                <Button type="button" variant="ghost" size="sm" asChild>
                  <a href={value} target="_blank" rel="noreferrer">
                    <Eye /> Ver
                  </a>
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)} className="text-destructive">
                  <X /> Remover
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Desenho de moldura de documento (placeholder quando não há arquivo). */
function DocumentFrameArt({ uploading }: { uploading: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
      <div className="relative flex h-14 w-20 items-center justify-center rounded-md border-2 border-muted-foreground/30 bg-background/60">
        <IdCard className="h-7 w-7 text-muted-foreground/50" />
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
        </span>
      </div>
      <span className="text-xs font-medium text-muted-foreground">Enviar foto ou PDF</span>
    </div>
  );
}
