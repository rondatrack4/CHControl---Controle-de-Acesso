"use client";

import { useRef, useState } from "react";
import { Camera, ZoomIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { initials } from "@/lib/utils";

const CROP_BOX = 288; // px exibidos (w-72 / h-72)
const CROP_OUTPUT = 512; // resolução final salva

export function PhotoViewModal({
  open,
  onOpenChange,
  photoUrl,
  personName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photoUrl: string | null;
  personName: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Foto de {personName || "cadastro"}</DialogTitle>
        </DialogHeader>
        {photoUrl && (
          <div className="flex max-h-96 items-center justify-center overflow-hidden rounded-lg bg-muted">
            <img src={photoUrl} alt={personName} className="max-h-96 max-w-full object-contain" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function PhotoCropModal({
  open,
  onOpenChange,
  imageUrl,
  onCrop,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
  onCrop: (croppedImage: string) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  // Fit "cover": menor escala que ainda preenche todo o quadrado.
  const coverScale = natural.w && natural.h ? Math.max(CROP_BOX / natural.w, CROP_BOX / natural.h) : 1;
  const effScale = coverScale * zoom;
  const dispW = natural.w * effScale;
  const dispH = natural.h * effScale;

  // Trava a posição para a imagem sempre cobrir o quadrado (sem bordas vazias).
  const clamp = (x: number, y: number) => {
    const minX = CROP_BOX - dispW;
    const minY = CROP_BOX - dispH;
    return {
      x: Math.min(0, Math.max(minX, x)),
      y: Math.min(0, Math.max(minY, y)),
    };
  };

  function reset() {
    setZoom(1);
    setPos({ x: 0, y: 0 });
    setNatural({ w: 0, h: 0 });
  }

  function handleClose() {
    reset();
    onOpenChange(false);
  }

  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setNatural({ w, h });
    const cs = Math.max(CROP_BOX / w, CROP_BOX / h);
    const dW = w * cs;
    const dH = h * cs;
    setPos({ x: (CROP_BOX - dW) / 2, y: (CROP_BOX - dH) / 2 });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: pos.x, baseY: pos.y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPos(clamp(dragRef.current.baseX + dx, dragRef.current.baseY + dy));
  };

  const handleMouseUp = () => {
    dragRef.current = null;
  };

  const handleZoom = (newZoom: number) => {
    const oldEff = coverScale * zoom;
    const newEff = coverScale * newZoom;
    const cx = CROP_BOX / 2;
    const cy = CROP_BOX / 2;
    const relX = (cx - pos.x) / oldEff;
    const relY = (cy - pos.y) / oldEff;
    const nx = cx - relX * newEff;
    const ny = cy - relY * newEff;
    setZoom(newZoom);
    setPos(clamp(nx, ny));
  };

  const performCrop = () => {
    if (!imageUrl || !natural.w) return;
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = CROP_OUTPUT;
        canvas.height = CROP_OUTPUT;
        const ctx = canvas.getContext("2d")!;
        const r = CROP_OUTPUT / CROP_BOX;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, CROP_OUTPUT, CROP_OUTPUT);
        ctx.drawImage(img, pos.x * r, pos.y * r, dispW * r, dispH * r);

        onCrop(canvas.toDataURL("image/jpeg", 0.92));
        handleClose();
      } catch (err) {
        console.error("Erro no corte:", err);
      }
    };
    img.src = imageUrl;
  };

  if (!open || !imageUrl) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Ajustar Foto</DialogTitle>
          <DialogDescription>Arraste a imagem e use o zoom para enquadrar</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className="relative mx-auto h-72 w-72 select-none overflow-hidden rounded-lg bg-neutral-900"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: dragRef.current ? "grabbing" : "grab" }}
          >
            <img
              src={imageUrl}
              alt="crop"
              draggable={false}
              onLoad={onImgLoad}
              className="pointer-events-none absolute left-0 top-0 max-w-none select-none"
              style={{
                width: dispW ? `${dispW}px` : undefined,
                height: dispH ? `${dispH}px` : undefined,
                transform: `translate(${pos.x}px, ${pos.y}px)`,
              }}
            />

            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/3 top-0 h-full w-px bg-white/25" />
              <div className="absolute left-2/3 top-0 h-full w-px bg-white/25" />
              <div className="absolute top-1/3 left-0 h-px w-full bg-white/25" />
              <div className="absolute top-2/3 left-0 h-px w-full bg-white/25" />
            </div>

            <div className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-white/80" />
            <div className="pointer-events-none absolute left-2 top-2 h-5 w-5 border-l-2 border-t-2 border-white" />
            <div className="pointer-events-none absolute right-2 top-2 h-5 w-5 border-r-2 border-t-2 border-white" />
            <div className="pointer-events-none absolute bottom-2 left-2 h-5 w-5 border-b-2 border-l-2 border-white" />
            <div className="pointer-events-none absolute bottom-2 right-2 h-5 w-5 border-b-2 border-r-2 border-white" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Zoom</Label>
              <span className="text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="4"
              step="0.05"
              value={zoom}
              onChange={(e) => handleZoom(parseFloat(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-300 accent-blue-600"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="button" className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={performCrop}>
              Confirmar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Foto 1:1 quadrada com botão de câmera (abre editor de corte) e clique para ampliar.
 * Salva a imagem cortada como data URL em `onChange`.
 * `onModalToggle` avisa o pai quando um modal aninhado (visualizar/cortar) abre ou fecha,
 * para que o formulário pai possa impedir seu próprio fechamento acidental.
 */
export function PhotoAvatar({
  value,
  onChange,
  name,
  onModalToggle,
  variant = "light",
}: {
  value: string | null;
  onChange: (dataUrl: string) => void;
  name: string;
  onModalToggle?: (open: boolean) => void;
  variant?: "light" | "banner";
}) {
  const [viewOpen, setViewOpen] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const inputId = useRef(`photo-${Math.random().toString(36).slice(2)}`).current;

  const setView = (o: boolean) => {
    setViewOpen(o);
    onModalToggle?.(o || cropOpen);
  };
  const setCrop = (o: boolean) => {
    setCropOpen(o);
    onModalToggle?.(o || viewOpen);
  };

  const isBanner = variant === "banner";

  return (
    <>
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => value && setView(true)}
          className={
            isBanner
              ? "group relative aspect-square h-24 w-24 overflow-hidden rounded-2xl bg-white/10 shadow-xl ring-2 ring-white/30 transition-all hover:ring-white/60"
              : "group relative aspect-square h-24 w-24 overflow-hidden rounded-2xl border-2 border-border bg-muted transition-all hover:ring-2 ring-blue-400"
          }
        >
          {value ? (
            <img src={value} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div
              className={
                isBanner
                  ? "flex h-full w-full items-center justify-center bg-white/10 text-2xl font-semibold text-white"
                  : "flex h-full w-full items-center justify-center text-2xl font-semibold text-muted-foreground"
              }
            >
              {name ? initials(name) : <Camera className="h-7 w-7 opacity-60" />}
            </div>
          )}
          {value && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
              <ZoomIn className="h-5 w-5 text-white" />
            </div>
          )}
        </button>
        <label
          htmlFor={inputId}
          className="absolute -bottom-1.5 -right-1.5 cursor-pointer rounded-full bg-white p-2 shadow-lg ring-1 ring-black/5 transition-transform hover:scale-105"
        >
          <Camera className="h-4 w-4 text-blue-700" />
          <input
            id={inputId}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                  setCropImage(evt.target?.result as string);
                  setCrop(true);
                };
                reader.readAsDataURL(file);
              }
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <PhotoViewModal open={viewOpen} onOpenChange={setView} photoUrl={value} personName={name} />
      <PhotoCropModal
        open={cropOpen}
        onOpenChange={setCrop}
        imageUrl={cropImage}
        onCrop={(img) => {
          onChange(img);
          setCropImage(null);
        }}
      />
    </>
  );
}
