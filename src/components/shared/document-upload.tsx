"use client";

import { useRef, useState } from "react";
import { FileText, Upload, Loader2, X, Eye } from "lucide-react";
import { uploadMedia } from "@/lib/media-upload";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DocumentUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  folder: string;
}

function isPdfUrl(url: string) {
  return url.toLowerCase().split("?")[0].endsWith(".pdf");
}

export function DocumentUpload({ value, onChange, folder }: DocumentUploadProps) {
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

  return (
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
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handleFile}
        />
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
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(null)}
                className="text-destructive"
              >
                <X /> Remover
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
