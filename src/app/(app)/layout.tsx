import { requireSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <AppShell
      userName={session.profile.full_name || session.email}
      userEmail={session.email}
      companyName={session.company?.name ?? null}
      role={session.profile.role}
      gender={session.profile.gender}
      photoUrl={session.profile.photo_url}
    >
      {children}
    </AppShell>
  );
}
