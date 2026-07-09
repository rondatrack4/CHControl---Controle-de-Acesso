"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { signInAction, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" /> Entrando...
        </>
      ) : (
        "Entrar"
      )}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(signInAction, {});

  return (
    <div className="flex min-h-screen">
      {/* Painel esquerdo — branding (fundo escuro, como no logo original) */}
      <div className="hidden w-1/2 flex-col justify-between bg-[#0d1521] p-12 text-white lg:flex">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="CHControl" className="h-11 w-auto" />
        <div className="space-y-4">
          <h1 className="text-4xl font-bold leading-tight">
            Controle de acesso profissional para o seu condomínio
          </h1>
          <p className="text-lg text-white/70">
            Gerencie moradores, visitantes e prestadores com segurança,
            rastreabilidade total e isolamento completo de dados.
          </p>
        </div>
        <p className="text-sm text-white/50">
          © {new Date().getFullYear()} CHControl. Todos os direitos reservados.
        </p>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.png" alt="CHControl" className="h-16 w-auto" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Acesso da Portaria</h2>
            <p className="text-sm text-muted-foreground">
              Entre com suas credenciais para continuar.
            </p>
          </div>

          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="portaria@condominio.com"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {state.error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {state.error}
              </p>
            )}

            <SubmitButton />
          </form>

          <div className="rounded-lg border bg-muted/40 p-4 text-xs text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">Ambiente de demonstração</p>
            <p>Controlador(a) de Acesso: portaria@chcontrol.dev</p>
            <p>Superadmin: superadmin@chcontrol.dev</p>
            <p>Senha: chcontrol123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
