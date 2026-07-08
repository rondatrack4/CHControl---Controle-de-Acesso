"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SignaturePad } from "@/components/modules/correspondence/signature-pad";
import { deliverCorrespondence } from "@/app/(app)/correspondencias/actions";
import { CORRESPONDENCE_DOCUMENT_KIND_LABELS } from "@/lib/constants";
import type { Correspondence, CorrespondenceDocumentKind } from "@/lib/database.types";

interface DeliverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  correspondence: Correspondence | null;
}

export function DeliverDialog({ open, onOpenChange, correspondence }: DeliverDialogProps) {
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [documentType, setDocumentType] = useState<CorrespondenceDocumentKind>("cpf");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open && correspondence) {
      setName(correspondence.recipient_name ?? "");
      setDocument(correspondence.recipient_document ?? "");
      setDocumentType(correspondence.recipient_document_type ?? "cpf");
      setPhone(correspondence.recipient_phone ?? "");
      setNotes("");
      setSignatureUrl(null);
    }
  }, [open, correspondence]);

  if (!correspondence) return null;

  function submit() {
    if (!name.trim()) {
      toast.error("Informe o nome de quem retirou.");
      return;
    }
    startTransition(async () => {
      const res = await deliverCorrespondence({
        correspondence_id: correspondence!.id,
        delivered_to_name: name,
        delivered_to_document: document,
        delivered_to_document_type: documentType,
        delivered_to_phone: phone,
        delivered_notes: notes,
        delivery_signature_url: signatureUrl,
      });
      if (res.ok) {
        toast.success("Correspondência entregue.");
        onOpenChange(false);
      } else {
        toast.error(res.error ?? "Erro ao registrar entrega.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Entregar correspondência</DialogTitle>
          <DialogDescription>
            {correspondence.registration_number} — {correspondence.recipient_name ?? "Destinatário não informado"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Nome de quem retirou *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Documento</Label>
              <div className="flex gap-2">
                <Select value={documentType} onValueChange={(v) => setDocumentType(v as CorrespondenceDocumentKind)}>
                  <SelectTrigger className="w-[90px] shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CORRESPONDENCE_DOCUMENT_KIND_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input value={document} onChange={(e) => setDocument(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Assinatura de quem retirou</Label>
            <SignaturePad value={signatureUrl} onChange={setSignatureUrl} folder="correspondence-signatures" />
          </div>
        </div>

        <DialogFooter className="mt-2 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Confirmar entrega
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
