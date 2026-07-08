import { requireResident } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireResident();

  return (
    <AppShell
      userName={session.profile.full_name || session.email}
      userEmail={session.email}
      companyName={session.company?.name ?? null}
      role={session.profile.role}
      navSet="resident"
      photoUrl={session.profile.photo_url}
    >
      {children}
    </AppShell>
  );
}
