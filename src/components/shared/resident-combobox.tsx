"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, residenceLabel } from "@/lib/utils";
import { ResidenceBadge } from "@/components/shared/residence-badge";
import type { Resident } from "@/lib/database.types";

interface ResidentComboboxProps {
  residents: Resident[];
  value: string | null;
  onSelect: (resident: Resident | null) => void;
  placeholder?: string;
}

export function ResidentCombobox({
  residents,
  value,
  onSelect,
  placeholder = "Selecione o morador responsável",
}: ResidentComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = residents.find((r) => r.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return residents.slice(0, 50);
    return residents
      .filter(
        (r) =>
          r.full_name.toLowerCase().includes(q) ||
          r.cpf.replace(/\D/g, "").includes(q.replace(/\D/g, "")) ||
          residenceLabel(r).toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [residents, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-1.5 truncate">
              <span className="truncate">
                {selected.full_name}{" "}
                <span className="text-muted-foreground">— {residenceLabel(selected)}</span>
              </span>
              <ResidenceBadge resident={selected} />
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Buscar por nome, CPF ou residência..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 border-0 p-0 focus-visible:ring-0"
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {filtered.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nenhum morador encontrado.
            </p>
          )}
          {filtered.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                onSelect(r.id === value ? null : r);
                setOpen(false);
                setQuery("");
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent"
            >
              <Check
                className={cn("h-4 w-4", r.id === value ? "opacity-100" : "opacity-0")}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.full_name}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <p className="truncate">
                    {residenceLabel(r)} · {r.cpf}
                  </p>
                  <ResidenceBadge resident={r} />
                </div>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
