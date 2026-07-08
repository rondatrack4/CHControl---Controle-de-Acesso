"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, LogIn, LogOut, Package, Check } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { markAllNotificationsRead, markNotificationRead } from "@/app/(resident)/portal/actions";
import { formatDateTime } from "@/lib/utils";
import type { Notification } from "@/lib/database.types";

interface NotificationBellProps {
  initialNotifications: Notification[];
  residentId: string;
}

export function NotificationBell({ initialNotifications, residentId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`resident-notifications-${residentId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `resident_id=eq.${residentId}` },
        (payload) => {
          const n = payload.new as Notification;
          setNotifications((prev) => [n, ...prev].slice(0, 50));
          toast(n.title, { description: n.body ?? undefined });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [residentId]);

  function markOne(id: string) {
    setNotifications((list) => list.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    startTransition(async () => {
      const res = await markNotificationRead(id);
      if (!res.ok) toast.error(res.error ?? "Erro ao marcar notificação.");
    });
  }

  function markAll() {
    setNotifications((list) => list.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    startTransition(async () => {
      const res = await markAllNotificationsRead();
      if (!res.ok) toast.error(res.error ?? "Erro ao marcar notificações.");
    });
  }

  function handleClick(n: Notification) {
    if (!n.read_at) markOne(n.id);
    setOpen(false);
    if (n.correspondence_id) {
      router.push(`/portal/correspondencias?view=${n.correspondence_id}`);
    } else if (n.access_log_id) {
      router.push(`/portal/historico?view=${n.access_log_id}`);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-[10px]"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notificações</p>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAll} disabled={pending}>
              <Check className="h-3.5 w-3.5" /> Marcar todas
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto p-1">
          {notifications.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Sem notificações.</p>
          )}
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent ${
                n.read_at ? "opacity-60" : ""
              }`}
            >
              <div className="mt-0.5 shrink-0 text-primary">
                {n.type === "correspondence" ? (
                  <Package className="h-4 w-4" />
                ) : n.type === "departure" ? (
                  <LogOut className="h-4 w-4" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{n.title}</p>
                {n.body && <p className="truncate text-xs text-muted-foreground">{n.body}</p>}
                <p className="text-[11px] text-muted-foreground">{formatDateTime(n.created_at)}</p>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
