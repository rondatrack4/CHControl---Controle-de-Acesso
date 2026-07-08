import { Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { residenceLabels } from "@/lib/utils";

/** Selo discreto exibido quando o morador possui mais de uma residência cadastrada. */
export function ResidenceBadge({ resident }: { resident: Parameters<typeof residenceLabels>[0] }) {
  const labels = residenceLabels(resident);
  if (labels.length <= 1) return null;
  const extra = labels.length - 1;
  return (
    <Badge
      variant="outline"
      className="gap-1 whitespace-nowrap text-[10px] font-medium text-muted-foreground"
      title={`Também reside em: ${labels.slice(1).join(", ")}`}
    >
      <Home className="h-2.5 w-2.5" />+{extra} {extra === 1 ? "residência" : "residências"}
    </Badge>
  );
}
