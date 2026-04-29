"use client";

import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default function NotificationsPage() {
  const { data, refetch } = trpc.notifications.list.useQuery();
  const markAll = trpc.notifications.markAllRead.useMutation({ onSuccess: () => refetch() });
  const markOne = trpc.notifications.markRead.useMutation({ onSuccess: () => refetch() });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notifikacije</h1>
        <Button variant="outline" onClick={() => markAll.mutate()}>Označi sve pročitanim</Button>
      </div>
      {(data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nema notifikacija.</p>}
      <div className="flex flex-col gap-2">
        {(data ?? []).map((n: any) => (
          <div key={n.id} className={`flex items-center justify-between rounded-md border p-3 text-sm ${n.procitano ? "opacity-60" : ""}`}>
            <div>
              <Badge>{n.tip}</Badge>
              <span className="ml-2">{n.poruka}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">{formatDate(n.createdAt)}</span>
              {!n.procitano && <Button size="sm" variant="ghost" onClick={() => markOne.mutate({ id: n.id })}>✓</Button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
