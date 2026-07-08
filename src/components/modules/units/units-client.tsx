"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Loader2, Trash2, Home } from "lucide-react";
import { useEnterSubmit } from "@/lib/form-utils";
import { createUnit, deleteUnit } from "@/app/(app)/unidades/actions";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Unit, ResidenceType } from "@/lib/database.types";

export function UnitsClient({ units }: { units: Unit[] }) {
  const [open, setOpen] = useState(false);
  const [unitType, setUnitType] = useState<ResidenceType>("apartamento");
  const [block, setBlock] = useState("");
  const [apartment, setApartment] = useState("");
  const [quadra, setQuadra] = useState("");
  const [lote, setLote] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [pending, startTransition] = useTransition();

  function reset() {
    setUnitType("apartamento");
    setBlock("");
    setApartment("");
    setQuadra("");
    setLote("");
    setOwnerName("");
    setOwnerPhone("");
  }

  function submit() {
    startTransition(async () => {
      const res = await createUnit({ unit_type: unitType, block: block || null, apartment: apartment || null, quadra: quadra || null, lote: lote || null, owner_name: ownerName || null, owner_phone: ownerPhone || null });
      if (res.ok) {
        toast.success("Unidade criada.");
        setOpen(false);
        reset();
      } else {
        toast.error(res.error ?? "Falha ao criar unidade.");
      }
    });
  }

  function onDelete(id: string) {
    startTransition(async () => {
      const res = await deleteUnit(id);
      if (!res.ok) toast.error(res.error ?? "Falha ao deletar.");
      else toast.success("Unidade removida.");
    });
  }

  return (
    <>
      <PageHeader title="Unidades" description="Cadastre quadras, lotes e apartamentos.">
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Nova unidade
        </Button>
      </PageHeader>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>Proprietário</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma unidade cadastrada.
                </TableCell>
              </TableRow>
            )}
            {units.map((u) => {
              const label = u.unit_type === "apartamento" ? `Bloco ${u.block}, Apto ${u.apartment}` : `Quadra ${u.quadra}, Lote ${u.lote}`;
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium capitalize">{u.unit_type}</TableCell>
                  <TableCell>{label}</TableCell>
                  <TableCell>{u.owner_name || "—"}</TableCell>
                  <TableCell>{u.owner_phone || "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => onDelete(u.id)} disabled={pending}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova unidade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4" onKeyDown={useEnterSubmit(submit)}>
            <div className="space-y-2">
              <Label>Tipo de unidade</Label>
              <Select value={unitType} onValueChange={(v) => { setUnitType(v as ResidenceType); setBlock(""); setApartment(""); setQuadra(""); setLote(""); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apartamento">Apartamento</SelectItem>
                  <SelectItem value="lote">Lote</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {unitType === "apartamento" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="block">Bloco *</Label>
                  <Input id="block" value={block} onChange={(e) => setBlock(e.target.value)} placeholder="A" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apartment">Apartamento *</Label>
                  <Input id="apartment" value={apartment} onChange={(e) => setApartment(e.target.value)} placeholder="101" />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="quadra">Quadra *</Label>
                  <Input id="quadra" value={quadra} onChange={(e) => setQuadra(e.target.value)} placeholder="01" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lote">Lote *</Label>
                  <Input id="lote" value={lote} onChange={(e) => setLote(e.target.value)} placeholder="001" />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="owner">Proprietário</Label>
              <Input id="owner" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Nome (opcional)" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} placeholder="(opcional)" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
