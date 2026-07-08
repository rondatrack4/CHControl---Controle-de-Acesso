import { redirect } from "next/navigation";
import { isConfigured, isDesktop } from "@/lib/desktop-setup";
import { SetupForm } from "./setup-form";

export const dynamic = "force-dynamic";

export default function SetupPage() {
  // Só existe no app desktop; na nuvem não há assistente de primeira execução.
  if (!isDesktop()) redirect("/login");
  if (isConfigured()) redirect("/login");
  return <SetupForm />;
}
