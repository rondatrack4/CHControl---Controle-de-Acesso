"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search, History } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { searchKnownPersons, type KnownPersonResult } from "@/app/(app)/acessos/actions";
import { formatDateTime, initials } from "@/lib/utils";
import { VISITOR_CATEGORY_LABELS } from "@/lib/constants";

interface KnownPersonSearchProps {
  onSelect: (person: KnownPersonResult) => void;
}

export function KnownPersonSearch({ onSelect }: KnownPersonSearchProps) {
  const [query, setQuery] = useState("");
  const [personType, setPersonType] = useState<"visitor" | "service_provider" | "all">("all");
  const [results, setResults] = useState<KnownPersonResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      const res = await searchKnownPersons(q, personType === "all" ? undefined : personType);
      setResults(res);
      setOpen(true);
      setLoading(false);
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, personType]);

  // Fecha ao clicar fora, para o painel não ficar preso cobrindo o resto do formulário.
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <div className="mb-3 flex gap-2">
        <Select value={personType} onValueChange={(v) => setPersonType(v as "visitor" | "service_provider" | "all")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="visitor">Visitantes</SelectItem>
            <SelectItem value="service_provider">Prestadores</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder="Buscar por CPF/CNPJ, documento, placa ou nome..."
          className="pl-9"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
          {results.length === 0 && !loading && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              Nenhum cadastro encontrado — use o botão &quot;Cadastrar&quot; abaixo.
            </p>
          )}
          {results.map((r) => (
            <button
              key={`${r.person_type}:${r.id}`}
              type="button"
              onClick={() => {
                onSelect(r);
                setOpen(false);
                setQuery(r.full_name);
              }}
              className="flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent"
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={r.photo_url ?? undefined} alt={r.full_name} />
                <AvatarFallback>{initials(r.full_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate font-medium">{r.full_name}</p>
                  <Badge variant="outline" className="text-[10px]">
                    {VISITOR_CATEGORY_LABELS[r.category]}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">Cadastro existente</Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {r.cpf ?? r.document_number ?? "Sem documento"}
                  {r.company_name ? ` · ${r.company_name}` : ""}
                </p>
                {r.last_visit_at && (
                  <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                    <History className="h-3 w-3" /> Última visita: {formatDateTime(r.last_visit_at)}
                    {r.last_destination_label ? ` · ${r.last_destination_label}` : ""}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
