"use client";

import { trpc } from "@/lib/trpc-client";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default function AuditLogPage() {
  const { data, isLoading } = trpc.audit.list.useQuery();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Audit log</h1>
      {isLoading ? <p>Učitavam...</p> : (
        <div className="overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left">
              <tr>
                <th className="px-3 py-2">Vreme</th>
                <th className="px-3 py-2">Korisnik</th>
                <th className="px-3 py-2">Akcija</th>
                <th className="px-3 py-2">Entitet</th>
                <th className="px-3 py-2">Entitet ID</th>
                <th className="px-3 py-2">Diff</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((e: any) => (
                <tr key={e.id} className="border-t align-top">
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(e.timestamp)}</td>
                  <td className="px-3 py-2">{e.korisnik?.email ?? "—"}</td>
                  <td className="px-3 py-2"><Badge>{e.akcija}</Badge></td>
                  <td className="px-3 py-2">{e.entitet}</td>
                  <td className="px-3 py-2 font-mono text-xs">{e.entitetId}</td>
                  <td className="px-3 py-2 font-mono text-xs">{e.diff ? JSON.stringify(e.diff).slice(0, 120) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
