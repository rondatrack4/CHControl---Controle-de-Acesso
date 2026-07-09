"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, UserPlus, ShieldCheck, User } from "lucide-react";
import { createStaffLogin, toggleStaffStatus } from "@/app/(app)/usuarios/actions";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import type { Profile } from "@/lib/database.types";

const ROLE_LABELS: Record<string, string> = { admin: "Administrador", porter: "Controlador(a) de Acesso" };

export function UsersClient({ profiles, currentUserId }: { profiles: Profile[]; currentUserId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"porter" | "admin">("porter");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const res = await createStaffLogin(name, email, password, role);
      if (res.ok) {
        toast.success("Usuário criado.");
        setOpen(false);
        setName("");
        setEmail("");
        setPassword("");
        setRole("porter");
      } else {
        toast.error(res.error ?? "Falha ao criar usuário.");
      }
    });
  }

  function toggle(p: Profile) {
    startTransition(async () => {
      const res = await toggleStaffStatus(p.id, p.status !== "active");
      if (!res.ok) toast.error(res.error ?? "Falha ao atualizar.");
      else toast.success(p.status === "active" ? "Usuário desativado." : "Usuário ativado.");
    });
  }

  return (
    <>
      <PageHeader title="Usuários" description="Logins de administradores e controladores(as) de acesso deste condomínio.">
        <Button onClick={() => setOpen(true)}>
          <UserPlus className="h-4 w-4" /> Novo usuário
        </Button>
      </PageHeader>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ativo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum usuário cadastrado.
                </TableCell>
              </TableRow>
            )}
            {profiles.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2">
                    {p.role === "admin" ? <ShieldCheck className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-muted-foreground" />}
                    {p.full_name}
                    {p.id === currentUserId && <Badge variant="secondary">você</Badge>}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{p.email}</TableCell>
                <TableCell>{ROLE_LABELS[p.role] ?? p.role}</TableCell>
                <TableCell>
                  <Badge variant={p.status === "active" ? "default" : "secondary"}>
                    {p.status === "active" ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Switch
                    checked={p.status === "active"}
                    disabled={p.id === currentUserId || pending}
                    onCheckedChange={() => toggle(p)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
            <DialogDescription>Crie um login de acesso ao sistema da portaria.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="u-name">Nome completo</Label>
              <Input id="u-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do usuário" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-email">E-mail</Label>
              <Input id="u-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@condominio.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-pass">Senha (mín. 6 caracteres)</Label>
              <Input id="u-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select value={role} onValueChange={(v) => setRole(v as "porter" | "admin")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="porter">Controlador(a) de Acesso</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Criar usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
