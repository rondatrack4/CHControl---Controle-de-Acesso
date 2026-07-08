import { Badge } from "@/components/ui/badge";
import { CORRESPONDENCE_STATUS_LABELS } from "@/lib/constants";

export function StatusBadge({ status }: { status: string }) {
  if (status === "active") return <Badge variant="success">Ativo</Badge>;
  if (status === "inactive") return <Badge variant="secondary">Inativo</Badge>;
  if (status === "inside") return <Badge variant="success">Dentro</Badge>;
  if (status === "outside") return <Badge variant="secondary">Fora</Badge>;
  if (status === "entregue") return <Badge variant="success">{CORRESPONDENCE_STATUS_LABELS[status]}</Badge>;
  if (status === "recebido" || status === "em_armazenamento") {
    return <Badge variant="outline">{CORRESPONDENCE_STATUS_LABELS[status]}</Badge>;
  }
  if (status === "aguardando_retirada") return <Badge variant="warning">{CORRESPONDENCE_STATUS_LABELS[status]}</Badge>;
  if (["recusado", "devolvido", "extraviado", "cancelado"].includes(status)) {
    return <Badge variant="destructive">{CORRESPONDENCE_STATUS_LABELS[status]}</Badge>;
  }
  return <Badge variant="outline">{status}</Badge>;
}
