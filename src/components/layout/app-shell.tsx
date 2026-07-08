"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Navbar } from "./navbar";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/database.types";

interface AppShellProps {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  companyName: string | null;
  role: UserRole;
  navSet?: "default" | "resident";
  photoUrl?: string | null;
}

export function AppShell({
  children,
  userName,
  userEmail,
  companyName,
  role,
  navSet,
  photoUrl,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      {/* Sidebar desktop */}
      <div className="hidden md:block">
        <Sidebar collapsed={collapsed} role={role} navSet={navSet} />
      </div>

      {/* Sidebar mobile (drawer) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar collapsed={false} role={role} navSet={navSet} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar
          onToggleSidebar={() => {
            // Em telas pequenas abre o drawer; em telas grandes recolhe.
            if (window.matchMedia("(min-width: 768px)").matches) {
              setCollapsed((c) => !c);
            } else {
              setMobileOpen((o) => !o);
            }
          }}
          userName={userName}
          userEmail={userEmail}
          companyName={companyName}
          role={role}
          photoUrl={photoUrl}
        />
        <main className={cn("flex-1 overflow-y-auto p-4 md:p-6")}>{children}</main>
      </div>
    </div>
  );
}
