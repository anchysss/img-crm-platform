"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const TONE: Record<string, any> = {
  NOVO: "warning",
  PRIHVACEN_LOGISTIKA: "info",
  PRIPREMA_MONTAZE: "info",
  U_REALIZACIJI: "info",
  ZAVRSEN: "success",
  OTKAZAN: "danger",
};

export default function RadniNaloziPage() {
  const { data, isLoading } = trpc.radniNalozi.list.useQuery();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Radni nalozi</h1>
      {isLoading ? <p>Učitavam...</p> : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left">
              <tr>
                <th className="px-3 py-2">Broj</th>
                <th className="px-3 py-2">Period</th>
                <th className="px-3 py-2">Grad</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Napomena</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Nema radnih naloga. Kreiraju se automatski kada ponuda pređe u Won.</td></tr>
              )}
              {(data ?? []).map((rn: any) => (
                <tr key={rn.id} className="border-t">
                  <td className="px-3 py-2 font-mono">
                    <Link href={`/logistika/radni-nalozi/${rn.id}`} className="hover:underline">{rn.broj}</Link>
                  </td>
                  <td className="px-3 py-2">{formatDate(rn.odDatum)} — {formatDate(rn.doDatum)}</td>
                  <td className="px-3 py-2">{rn.grad ?? "—"}</td>
                  <td className="px-3 py-2"><Badge variant={TONE[rn.status]}>{rn.status.replace("_", " ")}</Badge></td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{rn.napomena ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
