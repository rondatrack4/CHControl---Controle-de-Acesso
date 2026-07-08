"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, RESIDENT_NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/database.types";

interface SidebarProps {
  collapsed: boolean;
  role: UserRole;
  onNavigate?: () => void;
  navSet?: "default" | "resident";
}

export function Sidebar({ collapsed, role, onNavigate, navSet = "default" }: SidebarProps) {
  const pathname = usePathname();
  const items =
    navSet === "resident" ? RESIDENT_NAV_ITEMS : NAV_ITEMS.filter((i) => !i.roles || i.roles.includes(role));

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r bg-card transition-all duration-300",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      <div className="flex h-16 items-center gap-2 border-b px-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.png" alt="CHControl" className="h-9 w-9 shrink-0 object-contain" />
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight">CHControl</span>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
                collapsed && "justify-center px-0"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="border-t p-4 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">CHControl v1.0</p>
          <p>Controle de acesso</p>
        </div>
      )}
    </aside>
  );
}
