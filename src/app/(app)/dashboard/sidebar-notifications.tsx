"use client";

import { trpc } from "@/lib/trpc-client";

export function NotificationsBadge() {
  const { data } = trpc.notifications.list.useQuery({ onlyUnread: true }, { refetchInterval: 60000 });
  const n = data?.length ?? 0;
  if (n === 0) return null;
  return <span className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-xs font-medium text-destructive-foreground">{n}</span>;
}
