"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Volume2, PlayCircle, Save } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PhotoUpload } from "@/components/shared/photo-upload";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateOwnProfile } from "@/app/(app)/configuracoes/actions";
import {
  SOUND_TONES,
  SOUND_TONE_LABELS,
  getSoundEnabled,
  setSoundEnabled,
  getSoundPref,
  setSoundPref,
  playSoundTone,
  type SoundTone,
} from "@/lib/sound";
import { roleLabel, GENDER_LABELS } from "@/lib/constants";
import type { Profile, Gender } from "@/lib/database.types";

interface SettingsClientProps {
  profile: Profile;
  email: string;
  companyName: string | null;
}

export function SettingsClient({ profile, email, companyName }: SettingsClientProps) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [photoUrl, setPhotoUrl] = useState<string | null>(profile.photo_url);
  const [gender, setGender] = useState<Gender | null>(profile.gender);
  const [pending, startTransition] = useTransition();

  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [entryTone, setEntryTone] = useState<SoundTone>("sino");
  const [exitTone, setExitTone] = useState<SoundTone>("bipe");
  const [hydrated, setHydrated] = useState(false);

  if (!hydrated && typeof window !== "undefined") {
    setSoundEnabledState(getSoundEnabled());
    setEntryTone(getSoundPref("entry"));
    setExitTone(getSoundPref("exit"));
    setHydrated(true);
  }

  function saveProfile() {
    startTransition(async () => {
      const res = await updateOwnProfile(fullName, photoUrl, gender);
      if (res.ok) {
        toast.success("Perfil atualizado.");
      } else {
        toast.error(res.error ?? "Erro ao salvar perfil.");
      }
    });
  }

  function toggleSound(enabled: boolean) {
    setSoundEnabledState(enabled);
    setSoundEnabled(enabled);
  }

  function changeTone(kind: "entry" | "exit", tone: SoundTone) {
    if (kind === "entry") setEntryTone(tone);
    else setExitTone(tone);
    setSoundPref(kind, tone);
  }

  return (
    <>
      <PageHeader title="Configurações" description="Gerencie seu perfil e as preferências do sistema." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Meu perfil</CardTitle>
            <CardDescription>Sua foto e nome aparecem no menu do sistema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PhotoUpload value={photoUrl} onChange={setPhotoUrl} folder="profiles" />

            <div className="space-y-1.5">
              <Label>Nome completo</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input value={email} disabled />
              </div>
              <div className="space-y-1.5">
                <Label>Perfil de acesso</Label>
                <Input value={roleLabel(profile.role, gender)} disabled />
              </div>
              <div className="space-y-1.5">
                <Label>Gênero</Label>
                <Select value={gender ?? ""} onValueChange={(v) => setGender(v as Gender)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Não informado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{GENDER_LABELS.male}</SelectItem>
                    <SelectItem value="female">{GENDER_LABELS.female}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {companyName && (
              <div className="space-y-1.5">
                <Label>Condomínio</Label>
                <Input value={companyName} disabled />
              </div>
            )}

            <Button onClick={saveProfile} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Save />}
              Salvar alterações
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-primary" /> Sons de notificação
            </CardTitle>
            <CardDescription>
              Escolha o toque tocado ao registrar uma entrada e uma saída no Controle de Acesso.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Ativar sons</p>
                <p className="text-xs text-muted-foreground">Desative para silenciar entradas e saídas.</p>
              </div>
              <Switch checked={soundEnabled} onCheckedChange={toggleSound} />
            </div>

            <ToneRow
              label="Som de entrada"
              value={entryTone}
              disabled={!soundEnabled}
              onChange={(t) => changeTone("entry", t)}
            />
            <ToneRow
              label="Som de saída"
              value={exitTone}
              disabled={!soundEnabled}
              onChange={(t) => changeTone("exit", t)}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function ToneRow({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: SoundTone;
  disabled: boolean;
  onChange: (tone: SoundTone) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Select value={value} onValueChange={(v) => onChange(v as SoundTone)} disabled={disabled}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SOUND_TONES.map((tone) => (
              <SelectItem key={tone} value={tone}>
                {SOUND_TONE_LABELS[tone]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" size="icon" disabled={disabled} onClick={() => playSoundTone(value)}>
          <PlayCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
