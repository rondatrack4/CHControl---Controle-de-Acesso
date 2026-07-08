"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { uploadMedia } from "@/lib/media-upload";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface PhotoUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  folder: string; // ex.: "residents"
}

export function PhotoUpload({ value, onChange, folder }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 5MB).");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadMedia(file, folder, file.name);
      onChange(url);
      toast.success("Foto enviada.");
    } catch (err) {
      console.error(err);
      toast.error("Falha ao enviar a foto.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-20 w-20 border">
        {value ? (
          <AvatarImage src={value} alt="Foto" />
        ) : (
          <AvatarFallback>
            <Camera className="h-6 w-6 text-muted-foreground" />
          </AvatarFallback>
        )}
      </Avatar>
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="animate-spin" /> : <Camera />}
          {value ? "Trocar foto" : "Enviar foto"}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
            className="text-destructive"
          >
            <X /> Remover
          </Button>
        )}
      </div>
    </div>
  );
}
