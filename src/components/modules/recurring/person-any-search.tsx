"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { searchAnyPerson, type AnyPersonResult } from "@/app/(app)/recorrentes/actions";
import { initials } from "@/lib/utils";

interface PersonAnySearchProps {
  onSelect: (person: AnyPersonResult) => void;
  placeholder?: string;
}

export function PersonAnySearch({ onSelect, placeholder }: PersonAnySearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AnyPersonResult[]>([]);
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
      const res = await searchAnyPerson(q);
      setResults(res);
      setOpen(true);
      setLoading(false);
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

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
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder={placeholder ?? "Buscar morador, visitante ou prestador por nome ou documento..."}
          className="pl-9"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
          {results.length === 0 && !loading && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">Nenhum cadastro encontrado.</p>
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
                  <Badge variant="outline" className="text-[10px]">{r.category_label}</Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">{r.document ?? "Sem documento"}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
