"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Menu, Moon, Sun, LogOut, User, Settings, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/utils";
import { roleLabel } from "@/lib/constants";
import { signOutAction } from "@/app/(app)/actions";
import type { Gender } from "@/lib/database.types";

interface NavbarProps {
  onToggleSidebar: () => void;
  userName: string;
  userEmail: string;
  companyName: string | null;
  role: string;
  gender?: Gender | null;
  photoUrl?: string | null;
}

export function Navbar({
  onToggleSidebar,
  userName,
  userEmail,
  companyName,
  role,
  gender,
  photoUrl,
}: NavbarProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onToggleSidebar} aria-label="Alternar menu">
          <Menu className="h-5 w-5" />
        </Button>
        {companyName && (
          <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
            <Building2 className="h-4 w-4" />
            <span className="font-medium text-foreground">{companyName}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Alternar tema"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                {photoUrl && <AvatarImage src={photoUrl} alt={userName} />}
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {initials(userName)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium leading-none">{userName}</p>
                <p className="text-xs text-muted-foreground">{roleLabel(role, gender)}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{userName}</span>
                <span className="text-xs font-normal text-muted-foreground">{userEmail}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <User /> {roleLabel(role, gender)}
            </DropdownMenuItem>
            {role !== "resident" && (
              <DropdownMenuItem asChild>
                <Link href="/configuracoes">
                  <Settings /> Configurações
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <form action={signOutAction}>
              <button type="submit" className="w-full">
                <DropdownMenuItem className="text-destructive focus:text-destructive" asChild>
                  <span>
                    <LogOut /> Sair
                  </span>
                </DropdownMenuItem>
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

