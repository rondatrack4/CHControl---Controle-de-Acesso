"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, ShieldCheck, LogIn, DoorOpen, Users, PackageCheck } from "lucide-react";
import { signInAction, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="h-11 w-full text-base" size="lg" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" /> Entrando...
        </>
      ) : (
        <>
          <LogIn className="h-4 w-4" /> Entrar
        </>
      )}
    </Button>
  );
}

function Brand({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-900/30">
        <ShieldCheck className="h-5 w-5 text-white" />
      </span>
      <span className="text-2xl font-bold tracking-tight">
        <span className="text-blue-500">CH</span>
        <span>Control</span>
      </span>
    </div>
  );
}

const FEATURES = [
  { icon: DoorOpen, text: "Registro rápido de entradas e saídas" },
  { icon: Users, text: "Moradores, visitantes e prestadores" },
  { icon: PackageCheck, text: "Correspondências e histórico completo" },
];

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(signInAction, {});

  return (
    <div className="flex min-h-screen">
      {/* Painel esquerdo — branding premium */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 p-12 text-white lg:flex">
        {/* Glows decorativos */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-16 h-80 w-80 rounded-full bg-sky-400/10 blur-3xl" />
        {/* Textura de pontos */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        <div className="relative">
          <Brand />
        </div>

        <div className="relative space-y-6">
          <h1 className="max-w-md text-4xl font-bold leading-tight">
            Controle de acesso profissional para o seu condomínio
          </h1>
          <p className="max-w-md text-lg text-blue-100/70">
            Segurança, rastreabilidade total e uma portaria que funciona mesmo sem internet.
          </p>
          <ul className="space-y-3 pt-2">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex items-center gap-3 text-blue-50/90">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                  <f.icon className="h-4 w-4 text-blue-200" />
                </span>
                <span className="text-sm">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-white/40">
          © {new Date().getFullYear()} CHControl. Todos os direitos reservados.
        </p>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex w-full items-center justify-center bg-muted/20 p-6 lg:w-1/2">
        <div className="w-full max-w-sm space-y-8">
          {/* Marca (mobile e reforço visual) */}
          <Brand className="justify-center lg:hidden" />

          <div className="space-y-1.5 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight">Bem-vindo de volta</h2>
            <p className="text-sm text-muted-foreground">
              Entre com suas credenciais para acessar a portaria.
            </p>
          </div>

          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="voce@condominio.com"
                autoComplete="email"
                className="h-11"
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
                className="h-11"
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
        </div>
      </div>
    </div>
  );
}
