"use client";

import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ResidentCombobox } from "@/components/shared/resident-combobox";
import { residenceLabel } from "@/lib/utils";
import type { Resident } from "@/lib/database.types";
import type { DestinationInput } from "@/lib/validations";

interface DestinationFieldsProps {
  index: number;
  value: DestinationInput;
  onChange: (value: DestinationInput) => void;
  onRemove: () => void;
  canRemove: boolean;
  residents: Resident[];
}

export function DestinationFields({ index, value, onChange, onRemove, canRemove, residents }: DestinationFieldsProps) {
  function set<K extends keyof DestinationInput>(key: K, v: DestinationInput[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Destino {index + 1}</p>
        {canRemove && (
          <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Morador / Proprietário</Label>
        <ResidentCombobox
          residents={residents}
          value={value.resident_id ?? null}
          onSelect={(r) =>
            onChange({
              ...value,
              resident_id: r?.id ?? null,
              location_label: r ? residenceLabel(r) : "",
            })
          }
          placeholder="Selecione (ou deixe em branco para área comum)"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Destino / Local *</Label>
        <Input
          value={value.location_label}
          onChange={(e) => set("location_label", e.target.value)}
          placeholder="Ex.: Quadra A / Lote 15, ou Área comum"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Local interno (opcional)</Label>
          <Input
            value={value.internal_location ?? ""}
            onChange={(e) => set("internal_location", e.target.value)}
            placeholder="Ex.: portão 2, piscina"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Serviço a ser realizado</Label>
          <Input
            value={value.service_note ?? ""}
            onChange={(e) => set("service_note", e.target.value)}
            placeholder="Ex.: manutenção da iluminação"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Observação</Label>
        <Textarea
          value={value.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
          rows={2}
        />
      </div>
    </div>
  );
}
