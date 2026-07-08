import Link from "next/link";
import { DoorOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { initials, formatElapsed } from "@/lib/utils";
import { PERSON_TYPE_LABELS, VISITOR_CATEGORY_LABELS } from "@/lib/constants";
import type { AccessLog } from "@/lib/database.types";

export function InsideNowCard({ logs }: { logs: AccessLog[] }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Quem está no condomínio agora</CardTitle>
        <Link href="/acessos" className="text-xs font-medium text-primary hover:underline">
          Ver tudo
        </Link>
      </CardHeader>
      <CardContent className="flex-1">
        {logs.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <DoorOpen className="h-8 w-8 opacity-40" />
            <p className="text-sm">Ninguém no condomínio no momento.</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {logs.map((l) => (
              <li key={l.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/50">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary">{initials(l.person_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.person_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {(l.person_category ? VISITOR_CATEGORY_LABELS[l.person_category] : null) ??
                      PERSON_TYPE_LABELS[l.person_type]}
                    {l.residence_label ? ` · ${l.residence_label}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {l.priority === "urgente" && (
                    <Badge variant="destructive" className="text-[10px]">
                      Urgente
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">há {formatElapsed(l.entry_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
