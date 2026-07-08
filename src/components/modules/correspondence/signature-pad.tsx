"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Eraser, Loader2, PenLine, Save } from "lucide-react";
import { uploadMedia } from "@/lib/media-upload";
import { Button } from "@/components/ui/button";

interface SignaturePadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  folder: string;
}

export function SignaturePad({ value, onChange, folder }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasStrokes = useRef(false);
  const [saving, setSaving] = useState(false);
  const [redoing, setRedoing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";
  }, [redoing]);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    hasStrokes.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    const { x, y } = pos(e);
    ctx?.beginPath();
    ctx?.moveTo(x, y);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    const { x, y } = pos(e);
    ctx?.lineTo(x, y);
    ctx?.stroke();
  }

  function end() {
    drawing.current = false;
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasStrokes.current = false;
  }

  async function save() {
    const canvas = canvasRef.current;
    if (!canvas || !hasStrokes.current) {
      toast.error("Desenhe a assinatura antes de salvar.");
      return;
    }
    setSaving(true);
    try {
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Falha ao gerar imagem.");
      const url = await uploadMedia(blob, folder, "assinatura.png");
      onChange(url);
      toast.success("Assinatura salva.");
    } catch {
      toast.error("Falha ao salvar assinatura.");
    } finally {
      setSaving(false);
    }
  }

  if (value && !redoing) {
    return (
      <div className="space-y-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="Assinatura" className="h-20 rounded-md border bg-white object-contain" />
        <Button type="button" variant="outline" size="sm" onClick={() => setRedoing(true)}>
          <PenLine className="h-4 w-4" /> Refazer assinatura
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={360}
        height={140}
        className="w-full touch-none rounded-md border bg-white"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={clear}>
          <Eraser className="h-4 w-4" /> Limpar
        </Button>
        <Button type="button" size="sm" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar assinatura
        </Button>
      </div>
    </div>
  );
}
