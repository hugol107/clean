"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/server/actions/notifications";
import { cn } from "@/lib/utils";

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationsMenu({ organizationId, notifications }: { organizationId: string; notifications: NotificationItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              disabled={isPending}
              onClick={() => startTransition(async () => {
                await markAllNotificationsReadAction({ organizationId });
                router.refresh();
              })}
            >
              <CheckCheck className="size-3.5" /> Mark all read
            </Button>
          )}
        </div>
        <Separator />
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() =>
                  startTransition(async () => {
                    if (!n.isRead) await markNotificationReadAction({ notificationId: n.id });
                    router.refresh();
                  })
                }
                className={cn(
                  "flex w-full flex-col gap-0.5 border-b px-4 py-3 text-left text-sm last:border-0 hover:bg-accent/50",
                  !n.isRead && "bg-accent/30",
                )}
              >
                <span className="flex items-center gap-2 font-medium">
                  {!n.isRead && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                  {n.title}
                </span>
                <span className="text-muted-foreground line-clamp-2">{n.body}</span>
                <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
