"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Download, Loader2, Trash2, Upload, ZoomIn, X } from "lucide-react";
import { uploadMedia } from "@/lib/media-upload";
import { Button } from "@/components/ui/button";

interface MultiPhotoUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  folder: string;
}

export function MultiPhotoUpload({ value, onChange, folder }: MultiPhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;
    setUploading(true);
    const uploaded: string[] = [];
    try {
      for (const file of list) {
        if (file.size > 8 * 1024 * 1024) {
          toast.error(`"${file.name}" excede 8MB e foi ignorada.`);
          continue;
        }
        try {
          uploaded.push(await uploadMedia(file, folder, file.name));
        } catch {
          toast.error(`Falha ao enviar "${file.name}".`);
        }
      }
      if (uploaded.length > 0) {
        onChange([...value, ...uploaded]);
        toast.success(`${uploaded.length} foto(s) enviada(s).`);
      }
    } finally {
      setUploading(false);
    }
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) void uploadFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-input"
        }`}
      >
        <p className="text-xs text-muted-foreground">Arraste fotos aqui, ou:</p>
        <div className="flex flex-wrap justify-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void uploadFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void uploadFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => cameraRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="animate-spin" /> : <Camera />}
            Tirar foto
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
            <Upload /> Enviar arquivos
          </Button>
        </div>
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {value.map((url, i) => (
            <div key={i} className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-md border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
              <div className="absolute inset-0 hidden items-center justify-center gap-1 bg-black/50 group-hover:flex">
                <button
                  type="button"
                  onClick={() => setPreview(url)}
                  className="rounded-full bg-white/90 p-1 text-black hover:bg-white"
                  title="Ampliar"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <a
                  href={url}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-white/90 p-1 text-black hover:bg-white"
                  title="Baixar"
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="rounded-full bg-white/90 p-1 text-destructive hover:bg-white"
                  title="Excluir"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreview(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/90 p-1.5 text-black"
            onClick={() => setPreview(null)}
          >
            <X className="h-4 w-4" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Foto ampliada" className="max-h-[85vh] max-w-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}
