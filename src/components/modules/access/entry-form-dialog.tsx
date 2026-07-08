"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Wrench, UserRound, MapPin, Car, FileText, Edit2, Check, X, Camera, ZoomIn } from "lucide-react";
import { formatPlateMercosul, formatPlateOld } from "@/lib/masks";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { KnownPersonSearch } from "@/components/modules/access/known-person-search";
import { VisitorForm } from "@/components/modules/visitors/visitor-form";
import { ProviderForm } from "@/components/modules/providers/provider-form";
import { registerEntry, type KnownPersonResult } from "@/app/(app)/acessos/actions";
import { residenceLabel, initials } from "@/lib/utils";
import { playEntrySound } from "@/lib/sound";
import { VISITOR_CATEGORY_LABELS, CATEGORY_TO_PERSON_TYPE } from "@/lib/constants";
import type { Resident, VisitorCategory, CpfCnpjKind, DocumentType, Unit, AccessLog } from "@/lib/database.types";
import type { DestinationInput } from "@/lib/validations";

interface EntryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residents: Resident[];
  units?: Unit[];
  inside?: AccessLog[];
}

function emptyDestination(): DestinationInput {
  return { resident_id: null, location_label: "Área comum", internal_location: "", service_note: "", notes: "" };
}

function initialForm() {
  return {
    existing_person_id: null as string | null,
    category: "visitante" as VisitorCategory,
    full_name: "",
    cpf: "",
    cpf_type: "cpf" as CpfCnpjKind,
    document_type: "rg" as DocumentType,
    document_number: "",
    phone: "",
    photo_url: null as string | null,
    company_name: "",
    service_type: "",
    vehicle_type: "automovel" as string,
    vehicle_plate: "",
    vehicle_plate_type: "mercosul" as "mercosul" | "antiga",
    vehicle_brand: "",
    vehicle_model: "",
    vehicle_color: "",
    reason: "",
    service_description: "",
    notes: "",
    expected_exit_at: "",
    priority: "normal" as "normal" | "urgente",
    destinations: [emptyDestination()],
    residentName: null as string | null,
    residenceLabel: null as string | null,
    selectedDestinationResidentId: null as string | null,
  };
}

export function EntryFormDialog({ open, onOpenChange, residents, units = [], inside = [] }: EntryFormDialogProps) {
  const [form, setForm] = useState(initialForm);
  const [pending, startTransition] = useTransition();
  const [registerOptionsOpen, setRegisterOptionsOpen] = useState(false);
  const [visitorFormOpen, setVisitorFormOpen] = useState(false);
  const [providerFormOpen, setProviderFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [photoViewOpen, setPhotoViewOpen] = useState(false);
  const [photoCropOpen, setPhotoCropOpen] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Formata placa quando o tipo muda
  function handlePlateTypeChange(newType: "mercosul" | "antiga") {
    set("vehicle_plate_type", newType);
    if (form.vehicle_plate) {
      const formatted = newType === "mercosul"
        ? formatPlateMercosul(form.vehicle_plate)
        : formatPlateOld(form.vehicle_plate);
      set("vehicle_plate", formatted);
    }
  }

  function handleSelectKnown(person: KnownPersonResult) {
    setForm((f) => ({
      ...f,
      existing_person_id: person.id,
      category: person.category,
      full_name: person.full_name,
      cpf: person.cpf ?? "",
      cpf_type: person.cpf_type,
      document_type: person.document_type,
      document_number: person.document_number ?? "",
      phone: person.phone ?? "",
      photo_url: person.photo_url,
      company_name: person.company_name ?? "",
      service_type: person.service_type ?? "",
      vehicle_type: person.vehicle_type ?? "automovel",
      vehicle_plate: person.vehicle_plate ?? "",
      vehicle_plate_type: "mercosul" as "mercosul" | "antiga",
      vehicle_brand: person.vehicle_brand ?? "",
      vehicle_model: person.vehicle_model ?? "",
      vehicle_color: person.vehicle_color ?? "",
      residentName: person.residentName ?? null,
      residenceLabel: person.residenceLabel ?? null,
      selectedDestinationResidentId: null,
    }));
    setRegisterOptionsOpen(false);
    setVisitorFormOpen(false);
    setProviderFormOpen(false);
  }

  function clearSelection() {
    setForm(initialForm());
    setRegisterOptionsOpen(false);
  }

  function close() {
    onOpenChange(false);
    setForm(initialForm());
    setRegisterOptionsOpen(false);
  }

  function submit(e?: React.FormEvent) {
    if (e) e.preventDefault();

    if (form.existing_person_id) {
      const alreadyInside = inside.some(
        (log) => log.person_id === form.existing_person_id && log.person_type === CATEGORY_TO_PERSON_TYPE[form.category]
      );
      if (alreadyInside) {
        toast.error("Esta pessoa já está registrada como dentro do condomínio.");
        return;
      }
    }

    let destinations = form.destinations;
    if (form.selectedDestinationResidentId) {
      const selectedResident = residents.find((r) => r.id === form.selectedDestinationResidentId);
      if (selectedResident) {
        destinations = [
          {
            ...form.destinations[0],
            resident_id: selectedResident.id,
            location_label: residenceLabel(selectedResident),
          },
          ...form.destinations.slice(1),
        ];
      }
    }

    startTransition(async () => {
      const res = await registerEntry({
        person: {
          person_type: CATEGORY_TO_PERSON_TYPE[form.category],
          existing_person_id: form.existing_person_id,
          full_name: form.full_name,
          cpf: form.cpf,
          cpf_type: form.cpf_type,
          document_type: form.document_type,
          document_number: form.document_number,
          phone: form.phone,
          photo_url: form.photo_url,
          company_name: form.company_name,
          service_type: form.service_type,
          vehicle_plate: form.vehicle_plate,
          vehicle_brand: form.vehicle_brand,
          vehicle_model: form.vehicle_model,
          vehicle_color: form.vehicle_color,
          category: form.category,
        },
        reason: form.reason,
        service_description: form.service_description,
        notes: form.notes,
        expected_exit_at: form.expected_exit_at ? new Date(form.expected_exit_at).toISOString() : null,
        priority: form.priority,
        destinations,
      });
      if (res.ok) {
        playEntrySound();
        toast.success("Entrada registrada.");
        close();
      } else {
        toast.error(res.error ?? "Erro ao registrar entrada.");
      }
    });
  }

  if (!form.existing_person_id) {
    return (
      <>
        <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl">Registrar Entrada</DialogTitle>
              <DialogDescription>Selecione ou cadastre uma pessoa</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <KnownPersonSearch onSelect={handleSelectKnown} />

              {!registerOptionsOpen ? (
                <Button type="button" variant="outline" onClick={() => setRegisterOptionsOpen(true)} className="w-full h-10">
                  <Plus className="h-4 w-4 mr-2" /> Cadastrar nova pessoa
                </Button>
              ) : (
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-dashed p-3">
                  <Button type="button" variant="outline" onClick={() => setVisitorFormOpen(true)} className="h-12">
                    <UserRound className="h-4 w-4 mr-2" /> Visitante
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setProviderFormOpen(true)} className="h-12">
                    <Wrench className="h-4 w-4 mr-2" /> Prestador
                  </Button>
                </div>
              )}
            </div>

            <VisitorForm
              open={visitorFormOpen}
              onOpenChange={setVisitorFormOpen}
              residents={residents}
              onCreated={handleSelectKnown}
            />
            <ProviderForm
              open={providerFormOpen}
              onOpenChange={setProviderFormOpen}
              residents={residents}
              onCreated={handleSelectKnown}
            />
          </DialogContent>
        </Dialog>

        <PhotoViewModal
          open={photoViewOpen}
          onOpenChange={setPhotoViewOpen}
          photoUrl={form.photo_url}
          personName={form.full_name}
        />
        <PhotoCropModal
          open={photoCropOpen}
          onOpenChange={setPhotoCropOpen}
          imageUrl={cropImage}
          onCrop={(croppedImage) => {
            set("photo_url", croppedImage);
            setCropImage(null);
          }}
        />
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
        <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <Badge className="bg-blue-600 hover:bg-blue-700">{VISITOR_CATEGORY_LABELS[form.category]}</Badge>
                <DialogTitle className="text-3xl font-bold">{form.full_name}</DialogTitle>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="relative group">
                <button
                  onClick={() => setPhotoViewOpen(true)}
                  className="relative rounded-full overflow-hidden hover:ring-2 ring-blue-400 transition-all"
                >
                  <Avatar className="h-20 w-20 cursor-pointer">
                    <AvatarImage src={form.photo_url ?? undefined} alt={form.full_name} />
                    <AvatarFallback className="text-lg">{initials(form.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ZoomIn className="h-5 w-5 text-white" />
                  </div>
                </button>
                <label htmlFor="photo-upload" className="absolute bottom-0 right-0 rounded-full bg-blue-600 p-1.5 cursor-pointer hover:bg-blue-700 transition-colors shadow-lg">
                  <Camera className="h-4 w-4 text-white" />
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          setCropImage(evt.target?.result as string);
                          setPhotoCropOpen(true);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                Trocar Pessoa
              </Button>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          {/* Info vinculada - Card Premium */}
          {form.residentName && (
            <div className="rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 p-4 text-white shadow-lg">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-90">Morador Vinculado</p>
                  <p className="text-lg font-bold mt-1">{form.residentName}</p>
                  {form.residenceLabel && <p className="text-sm opacity-90 mt-0.5">{form.residenceLabel}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Dados pessoais - Pessoa */}
          <div className="space-y-3 rounded-lg border p-4 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Dados Pessoais</h3>
              </div>
              {!isEditing ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="gap-1"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Editar
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    className="gap-1 text-green-600 hover:bg-green-50"
                  >
                    <Check className="h-3.5 w-3.5" /> Pronto
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    className="gap-1 text-red-600 hover:bg-red-50"
                  >
                    <X className="h-3.5 w-3.5" /> Cancelar
                  </Button>
                </div>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {form.cpf && (
                <div className="space-y-1.5">
                  <Label className="text-xs">CPF</Label>
                  {isEditing ? (
                    <Input
                      value={form.cpf}
                      onChange={(e) => set("cpf", e.target.value)}
                      placeholder="000.000.000-00"
                      className="h-9 font-mono text-sm"
                    />
                  ) : (
                    <p className="text-sm font-mono p-2 rounded bg-muted">{form.cpf}</p>
                  )}
                </div>
              )}
              {form.document_number && (
                <div className="space-y-1.5">
                  <Label className="text-xs">{form.document_type === "rg" ? "RG" : "Documento"}</Label>
                  {isEditing ? (
                    <Input
                      value={form.document_number}
                      onChange={(e) => set("document_number", e.target.value)}
                      placeholder="00.000.000-0"
                      className="h-9 font-mono text-sm"
                    />
                  ) : (
                    <p className="text-sm font-mono p-2 rounded bg-muted">{form.document_number}</p>
                  )}
                </div>
              )}
              {form.phone && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Telefone</Label>
                  {isEditing ? (
                    <Input
                      value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="h-9 font-mono text-sm"
                    />
                  ) : (
                    <p className="text-sm font-mono p-2 rounded bg-muted">{form.phone}</p>
                  )}
                </div>
              )}
              {form.company_name && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Empresa</Label>
                  {isEditing ? (
                    <Input
                      value={form.company_name}
                      onChange={(e) => set("company_name", e.target.value)}
                      placeholder="Nome da empresa"
                      className="h-9"
                    />
                  ) : (
                    <p className="text-sm font-mono p-2 rounded bg-muted">{form.company_name}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Local de visita */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Label className="font-semibold">Local de visita</Label>
            </div>
            <Select value={form.selectedDestinationResidentId || ""} onValueChange={(v) => set("selectedDestinationResidentId", v || null)}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Selecione o local a visitar" />
              </SelectTrigger>
              <SelectContent>
                {form.residentName && (
                  <SelectItem value={form.residentName}>
                    {form.residentName} (vinculado)
                  </SelectItem>
                )}
                {residents.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.full_name}
                  </SelectItem>
                ))}
                {units.length > 0 && residents.length > 0 && (
                  <div className="border-t my-1" />
                )}
                {units.map((u) => (
                  <SelectItem key={`unit-${u.id}`} value={`unit-${u.id}`}>
                    {u.unit_type === "apartamento"
                      ? `Bloco ${u.block}, Apto ${u.apartment}`
                      : `Quadra ${u.quadra}, Lote ${u.lote}`}
                    {u.owner_name && ` – ${u.owner_name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Veículo */}
          <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Informações do Veículo</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.vehicle_type || "automovel"} onValueChange={(v) => set("vehicle_type", v)}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="automovel">Automóvel</SelectItem>
                    <SelectItem value="moto">Moto</SelectItem>
                    <SelectItem value="caminhao">Caminhão</SelectItem>
                    <SelectItem value="bicicleta">Bicicleta</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de Placa</Label>
                <Select value={form.vehicle_plate_type} onValueChange={(v) => handlePlateTypeChange(v as "mercosul" | "antiga")}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mercosul">Mercosul</SelectItem>
                    <SelectItem value="antiga">Placa Cinza</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Placa</Label>
                <Input
                  value={form.vehicle_plate}
                  onChange={(e) => {
                    const formatted = form.vehicle_plate_type === "mercosul"
                      ? formatPlateMercosul(e.target.value)
                      : formatPlateOld(e.target.value);
                    set("vehicle_plate", formatted);
                  }}
                  placeholder={form.vehicle_plate_type === "mercosul" ? "ABC1D23" : "BUY-8593"}
                  maxLength={form.vehicle_plate_type === "mercosul" ? 7 : 8}
                  className="h-10 font-mono text-sm uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Marca</Label>
                <Input
                  value={form.vehicle_brand}
                  onChange={(e) => set("vehicle_brand", e.target.value)}
                  placeholder="Volkswagen"
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Modelo</Label>
                <Input
                  value={form.vehicle_model}
                  onChange={(e) => set("vehicle_model", e.target.value)}
                  placeholder="Gol"
                  className="h-10"
                />
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Label className="font-semibold">Notas adicionais</Label>
            </div>
            <Input
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Observações importantes sobre a visita..."
              className="h-10"
            />
          </div>

          <DialogFooter className="gap-3">
            <Button type="button" variant="outline" onClick={close} disabled={pending} className="h-10">
              Cancelar
            </Button>
            <Button type="submit" disabled={pending} className="h-10 min-w-48">
              {pending && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
              Registrar Entrada
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <PhotoViewModal
      open={photoViewOpen}
      onOpenChange={setPhotoViewOpen}
      photoUrl={form.photo_url}
      personName={form.full_name}
    />
    <PhotoCropModal
      open={photoCropOpen}
      onOpenChange={setPhotoCropOpen}
      imageUrl={cropImage}
      onCrop={(croppedImage) => {
        set("photo_url", croppedImage);
        setCropImage(null);
      }}
    />
    </>
  );
}

function PhotoViewModal({ open, onOpenChange, photoUrl, personName }: { open: boolean; onOpenChange: (open: boolean) => void; photoUrl: string | null; personName: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Foto de {personName}</DialogTitle>
        </DialogHeader>
        {photoUrl && (
          <div className="flex items-center justify-center bg-muted rounded-lg overflow-hidden max-h-96">
            <img src={photoUrl} alt={personName} className="max-w-full max-h-96 object-contain" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PhotoCropModal({
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
  const [scale, setScale] = useState(1);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - posX, y: e.clientY - posY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPosX(e.clientX - dragStart.x);
    setPosY(e.clientY - dragStart.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const performCrop = () => {
    if (!imageUrl) return;

    const img = new Image();
    img.onload = () => {
      try {
        const cropSize = 320;
        const canvas = document.createElement("canvas");
        canvas.width = cropSize;
        canvas.height = cropSize;
        const ctx = canvas.getContext("2d")!;

        // Fundo branco
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, cropSize, cropSize);

        // Desenhar imagem com escala e posição
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const centerX = cropSize / 2 - scaledWidth / 2 + posX;
        const centerY = cropSize / 2 - scaledHeight / 2 + posY;

        ctx.drawImage(img, centerX, centerY, scaledWidth, scaledHeight);

        const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.92);
        onCrop(croppedDataUrl);

        // Resetar e fechar
        setScale(1);
        setPosX(0);
        setPosY(0);
        onOpenChange(false);
      } catch (err) {
        console.error("Erro no corte:", err);
        alert("Erro ao processar a imagem");
      }
    };
    img.src = imageUrl;
  };

  if (!open || !imageUrl) return null;

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        setScale(1);
        setPosX(0);
        setPosY(0);
        onOpenChange(false);
      }
    }}>
      <DialogContent className="max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Cortar Foto</DialogTitle>
          <DialogDescription>Arraste para posicionar</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Crop Preview - Quadrado 1:1 */}
          <div
            className="relative mx-auto w-80 h-80 bg-black/90 rounded-lg overflow-hidden border-4 border-blue-500 select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: isDragging ? "grabbing" : "grab" }}
          >
            {/* Imagem com desfoque de fundo */}
            <img
              src={imageUrl}
              alt="preview bg"
              className="absolute inset-0 w-full h-full object-cover blur-xl opacity-20"
            />

            {/* Imagem arrastável */}
            <img
              src={imageUrl}
              alt="crop"
              className="absolute pointer-events-none select-none"
              style={{
                width: `${scale * 100}%`,
                height: `${scale * 100}%`,
                left: `${50 - scale * 50 + (posX / 320) * 100}%`,
                top: `${50 - scale * 50 + (posY / 320) * 100}%`,
                transform: "translate(-50%, -50%)",
              }}
            />

            {/* Guias do centro */}
            <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20" />
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />

            {/* Cantos */}
            <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-white" />
            <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-white" />
            <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-white" />
            <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-white" />
          </div>

          {/* Zoom Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Zoom</Label>
              <span className="text-xs text-muted-foreground">{Math.round(scale * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setScale(1);
                setPosX(0);
                setPosY(0);
                onOpenChange(false);
              }}
              className="flex-1 px-3 py-2 text-sm border rounded-md hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              onClick={performCrop}
              className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              Confirmar
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
