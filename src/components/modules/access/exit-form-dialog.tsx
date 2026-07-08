"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";
import { useEnterSubmit } from "@/lib/form-utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PhotoUpload } from "@/components/shared/photo-upload";
import { VisitTimeline } from "@/components/modules/access/visit-timeline";
import { registerExit } from "@/app/(app)/acessos/actions";
import { playExitSound } from "@/lib/sound";
import type { AccessLogWithDestinations } from "@/app/(app)/acessos/page";

interface ExitFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: AccessLogWithDestinations | null;
}

export function ExitFormDialog({ open, onOpenChange, log }: ExitFormDialogProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [exitNotes, setExitNotes] = useState("");
  const [photos, setPhotos] = useState<(string | null)[]>([null]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (log) {
      const initial: Record<string, boolean> = {};
      for (const d of log.destinations) initial[d.id] = !!d.completed_at || true;
      setChecked(initial);
      setExitNotes("");
      setPhotos([null]);
    }
  }, [log]);

  if (!log) return null;

  function toggle(id: string) {
    setChecked((c) => ({ ...c, [id]: !c[id] }));
  }

  function addPhoto() {
    setPhotos((p) => [...p, null]);
  }

  function setPhoto(index: number, url: string | null) {
    setPhotos((p) => p.map((v, i) => (i === index ? url : v)));
  }

  function removePhoto(index: number) {
    setPhotos((p) => p.filter((_, i) => i !== index));
  }

  function submit() {
    const completedIds = Object.entries(checked)
      .filter(([, v]) => v)
      .map(([id]) => id);
    startTransition(async () => {
      const res = await registerExit({
        access_log_id: log!.id,
        exit_notes: exitNotes,
        exit_photos: photos.filter((p): p is string => !!p),
        confirm_all_destinations: false,
        completed_destination_ids: completedIds,
      });
      if (res.ok) {
        playExitSound();
        toast.success("Saída registrada.");
        onOpenChange(false);
      } else {
        toast.error(res.error ?? "Erro ao registrar saída.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar Saída — {log.person_name}</DialogTitle>
          <DialogDescription>Confirme os destinos concluídos e registre observações da saída.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1" onKeyDown={useEnterSubmit(submit)}>
          <section>
            <p className="mb-2 text-sm font-semibold">Linha do tempo</p>
            <VisitTimeline entryAt={log.entry_at} exitAt={null} destinations={log.destinations} />
          </section>

          <section className="space-y-2">
            <p className="text-sm font-semibold">Destinos concluídos</p>
            {log.destinations.map((d) => (
              <label key={d.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                <input type="checkbox" checked={!!checked[d.id]} onChange={() => toggle(d.id)} className="h-4 w-4" />
                <span>{d.location_label}</span>
                {d.service_note && <span className="text-muted-foreground">— {d.service_note}</span>}
              </label>
            ))}
          </section>

          <section className="space-y-1.5">
            <Label>Observações da saída</Label>
            <Textarea value={exitNotes} onChange={(e) => setExitNotes(e.target.value)} rows={2} />
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Fotos (opcional)</Label>
              <Button type="button" variant="outline" size="sm" onClick={addPhoto}>
                <Plus className="h-4 w-4" /> Adicionar foto
              </Button>
            </div>
            <div className="flex flex-wrap gap-4">
              {photos.map((url, i) => (
                <div key={i} className="relative">
                  <PhotoUpload value={url} onChange={(u) => setPhoto(i, u)} folder="exits" />
                  {photos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        <DialogFooter className="mt-2 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Registrar Saída
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
