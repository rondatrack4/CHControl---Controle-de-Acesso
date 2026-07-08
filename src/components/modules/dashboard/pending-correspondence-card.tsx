import Link from "next/link";
import { PackageCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn, recipientResidenceLabel } from "@/lib/utils";
import type { Correspondence } from "@/lib/database.types";

function daysWaiting(receivedAt: string): number {
  return Math.floor((Date.now() - new Date(receivedAt).getTime()) / (1000 * 60 * 60 * 24));
}

export function PendingCorrespondenceCard({ items }: { items: Correspondence[] }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Correspondências aguardando retirada</CardTitle>
        <Link href="/correspondencias" className="text-xs font-medium text-primary hover:underline">
          Ver tudo
        </Link>
      </CardHeader>
      <CardContent className="flex-1">
        {items.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <PackageCheck className="h-8 w-8 opacity-40" />
            <p className="text-sm">Nenhuma correspondência pendente.</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {items.map((c) => {
              const days = daysWaiting(c.received_at);
              return (
                <li key={c.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.recipient_name ?? "Destinatário não informado"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.type}
                      {c.carrier ? ` · ${c.carrier}` : ""}
                      {c.recipient_block || c.recipient_apartment || c.recipient_quadra || c.recipient_lote
                        ? ` · ${recipientResidenceLabel(c)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusBadge status={c.status} />
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        days >= 7 && "border-red-500/50 text-red-600 dark:text-red-400",
                        days >= 3 && days < 7 && "border-amber-500/50 text-amber-600 dark:text-amber-400"
                      )}
                    >
                      {days === 0 ? "hoje" : `${days}d aguardando`}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
