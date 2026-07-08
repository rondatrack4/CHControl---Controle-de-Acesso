import { requireSession } from "@/lib/auth";
import { SettingsClient } from "@/components/modules/settings/settings-client";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const session = await requireSession();

  return <SettingsClient profile={session.profile} email={session.email} companyName={session.company?.name ?? null} />;
}
