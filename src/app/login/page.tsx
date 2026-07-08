import { redirect } from "next/navigation";
import { isConfigured, isDesktop } from "@/lib/desktop-setup";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  // No app desktop, se a instalação ainda não foi configurada, manda para o
  // assistente de primeira execução (não há como logar sem um usuário criado).
  if (isDesktop() && !isConfigured()) redirect("/setup");
  return <LoginForm />;
}
