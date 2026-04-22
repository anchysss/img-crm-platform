"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const STATUS_TONE: Record<string, any> = {
  POTVRDENA: "info",
  U_REALIZACIJI: "warning",
  ZAVRSENA: "success",
  OTKAZANA: "danger",
};

export default function CampaignsPage() {
  const { data, isLoading } = trpc.campaigns.list.useQuery();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Kampanje</h1>
      {isLoading ? <p>Učitavam...</p> : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left">
              <tr>
                <th className="px-3 py-2">Naziv</th>
                <th className="px-3 py-2">Partner</th>
                <th className="px-3 py-2">Period</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Iz Opportunity-ja</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((k: any) => (
                <tr key={k.id} className="border-t">
                  <td className="px-3 py-2 font-medium">
                    <Link href={`/campaigns/${k.id}`} className="hover:underline">{k.naziv}</Link>
                  </td>
                  <td className="px-3 py-2">{k.partner?.naziv}</td>
                  <td className="px-3 py-2">{formatDate(k.odDatum)} — {formatDate(k.doDatum)}</td>
                  <td className="px-3 py-2"><Badge variant={STATUS_TONE[k.status]}>{k.status.replace("_", " ")}</Badge></td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {k.opportunity ? <Link href={`/opportunities/${k.opportunity.id}`} className="hover:underline">{k.opportunity.naziv}</Link> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
