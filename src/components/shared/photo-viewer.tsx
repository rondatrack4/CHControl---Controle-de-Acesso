"use client";

import { useState } from "react";
import { X, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PhotoViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photoUrl: string | null;
  photoAlt: string;
}

export function PhotoViewer({ open, onOpenChange, photoUrl, photoAlt }: PhotoViewerProps) {
  const [zoom, setZoom] = useState(1);

  if (!photoUrl) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Visualizar Foto</DialogTitle>
        </DialogHeader>

        <div className="relative flex flex-col gap-4">
          <div className="flex justify-center overflow-auto max-h-[70vh] bg-black/5 rounded-lg p-4">
            <img
              src={photoUrl}
              alt={photoAlt}
              style={{ transform: `scale(${zoom})` }}
              className="max-h-full max-w-full object-contain transition-transform duration-200"
            />
          </div>

          <div className="flex gap-2 items-center justify-center">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setZoom(Math.max(0.5, zoom - 0.2))}
              disabled={zoom <= 0.5}
            >
              −
            </Button>
            <span className="text-sm font-medium w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setZoom(Math.min(3, zoom + 0.2))}
              disabled={zoom >= 3}
            >
              +
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setZoom(1)}
            >
              Resetar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface PhotoWithViewerProps {
  photoUrl: string | null;
  photoAlt: string;
  className?: string;
}

export function PhotoWithViewer({ photoUrl, photoAlt, className = "h-40 w-40" }: PhotoWithViewerProps) {
  const [viewerOpen, setViewerOpen] = useState(false);

  if (!photoUrl) {
    return <div className={`${className} rounded-lg bg-muted flex items-center justify-center text-muted-foreground`}>Sem foto</div>;
  }

  return (
    <>
      <div className={`relative group rounded-lg overflow-hidden ${className}`}>
        <img
          src={photoUrl}
          alt={photoAlt}
          className="w-full h-full object-cover"
        />
        <button
          type="button"
          onClick={() => setViewerOpen(true)}
          className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
        >
          <ZoomIn className="h-6 w-6 text-white" />
        </button>
      </div>

      <PhotoViewer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        photoUrl={photoUrl}
        photoAlt={photoAlt}
      />
    </>
  );
}
