"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Building2, ChevronDown, Loader2 } from "lucide-react";
import { completeSetup, type SetupState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" /> Configurando...
        </>
      ) : (
        "Concluir configuração"
      )}
    </Button>
  );
}

export function SetupForm() {
  const [state, formAction] = useActionState<SetupState, FormData>(completeSetup, {});
  const [showSync, setShowSync] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-lg space-y-8 rounded-xl border bg-background p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.png" alt="CHControl" className="h-16 w-auto" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Primeira execução</h2>
          <p className="text-sm text-muted-foreground">
            Configure este computador da portaria. Os dados ficam salvos localmente e funcionam sem internet.
          </p>
        </div>

        <form action={formAction} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="company_name">Nome do condomínio *</Label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="company_name" name="company_name" className="pl-9" placeholder="Condomínio Residencial Jardim" required />
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <p className="mb-3 text-sm font-medium">Primeiro login (administrador)</p>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="admin_name">Nome completo *</Label>
                <Input id="admin_name" name="admin_name" placeholder="Nome do administrador" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin_email">E-mail *</Label>
                <Input id="admin_email" name="admin_email" type="email" placeholder="admin@condominio.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin_password">Senha * (mín. 6 caracteres)</Label>
                <Input id="admin_password" name="admin_password" type="password" placeholder="••••••••" required />
              </div>
            </div>
          </div>

          <div className="rounded-lg border">
            <button
              type="button"
              onClick={() => setShowSync((v) => !v)}
              className="flex w-full items-center justify-between p-4 text-sm font-medium"
            >
              Sincronização com a nuvem (opcional)
              <ChevronDown className={`h-4 w-4 transition-transform ${showSync ? "rotate-180" : ""}`} />
            </button>
            {showSync && (
              <div className="space-y-3 border-t p-4">
                <p className="text-xs text-muted-foreground">
                  Deixe em branco para uso 100% local. Preencha para sincronizar com o Supabase quando houver internet.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="supabase_url">URL do Supabase</Label>
                  <Input id="supabase_url" name="supabase_url" placeholder="https://xxxx.supabase.co" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supabase_key">Chave (anon/role de sync)</Label>
                  <Input id="supabase_key" name="supabase_key" placeholder="eyJhbGc..." />
                </div>
              </div>
            )}
          </div>

          {state.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
          )}

          <SubmitButton />
        </form>
      </div>
    </div>
  );
}
