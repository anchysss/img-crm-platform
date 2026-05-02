"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const RN_TONE: Record<string, any> = {
  NOVO: "warning",
  PRIHVACEN_LOGISTIKA: "info",
  PRIPREMA_FAJLOVA: "warning",
  KOLORNA_PROBA: "warning",
  PROBA_ODOBRENA: "info",
  PRIPREMA_MONTAZE: "info",
  U_REALIZACIJI: "info",
  STAMPA_U_TOKU: "info",
  MONTAZA_U_TOKU: "info",
  ZAVRSEN: "success",
  OTKAZAN: "danger",
};

const STAVKA_TONE: Record<string, any> = {
  NACRT: "warning",
  POSLATO: "info",
  POSTAVLJENO: "success",
  PROBLEM: "danger",
  OTKAZANO: "danger",
};

type Tab = "rn" | "stampa" | "montaza";

export default function RadniNaloziPage() {
  const [tab, setTab] = useState<Tab>("rn");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Radni nalozi</h1>

      <div className="flex flex-wrap gap-1 border-b">
        <TabBtn active={tab === "rn"} onClick={() => setTab("rn")} label="📋 Iz prodaje" />
        <TabBtn active={tab === "stampa"} onClick={() => setTab("stampa")} label="🖨️ Nalozi za štampu" />
        <TabBtn active={tab === "montaza"} onClick={() => setTab("montaza")} label="🔧 Nalozi za montažu" />
      </div>

      {tab === "rn" && <RadniNaloziTab />}
      {tab === "stampa" && <NaloziStampuTab />}
      {tab === "montaza" && <NaloziMontazuTab />}
    </div>
  );
}

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium ${
        active ? "border-b-2 border-red-700 text-red-700" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

// ============== RADNI NALOZI (iz prodaje) ==============
function RadniNaloziTab() {
  const { data, isLoading } = trpc.radniNalozi.list.useQuery();
  if (isLoading) return <p className="text-sm text-muted-foreground">Učitavam…</p>;
  return (
    <div className="overflow-hidden rounded-md border bg-card">
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
            <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Nema radnih naloga. Kreiraju se automatski kad ponuda pređe u PRIHVACENA.</td></tr>
          )}
          {(data ?? []).map((rn: any) => (
            <tr key={rn.id} className="border-t hover:bg-secondary/20">
              <td className="px-3 py-2 font-mono">
                <Link href={`/logistika/radni-nalozi/${rn.id}`} className="hover:underline">{rn.broj}</Link>
              </td>
              <td className="px-3 py-2">{formatDate(rn.odDatum)} — {formatDate(rn.doDatum)}</td>
              <td className="px-3 py-2">{rn.grad ?? "—"}</td>
              <td className="px-3 py-2"><Badge variant={RN_TONE[rn.status]}>{rn.status.replace(/_/g, " ")}</Badge></td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{rn.napomena ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============== NALOZI ZA ŠTAMPU ==============
function NaloziStampuTab() {
  const { data, isLoading } = trpc.nalogStampu.list.useQuery();
  if (isLoading) return <p className="text-sm text-muted-foreground">Učitavam…</p>;
  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-secondary/60 text-left">
          <tr>
            <th className="px-3 py-2">Broj</th>
            <th className="px-3 py-2">Tip</th>
            <th className="px-3 py-2">Štamparija</th>
            <th className="px-3 py-2">Datum predaje</th>
            <th className="px-3 py-2">Rok</th>
            <th className="px-3 py-2 text-right">Stavki</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {(data ?? []).length === 0 && (
            <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Nema naloga za štampu. Kreira se iz radnog naloga (panel &quot;Logistika workflow&quot;).</td></tr>
          )}
          {(data ?? []).map((n: any) => (
            <tr key={n.id} className="border-t hover:bg-secondary/20">
              <td className="px-3 py-2 font-mono">
                <Link href={`/logistika/nalog-stampu/${n.id}`} className="hover:underline">{n.broj}</Link>
              </td>
              <td className="px-3 py-2">
                <Badge variant={n.tipStampe === "PROBNA" ? "warning" : "info"}>
                  {n.tipStampe === "PROBNA" ? "PROBNA" : "REDOVNA"}
                </Badge>
              </td>
              <td className="px-3 py-2 text-xs">{n.stamparija}</td>
              <td className="px-3 py-2 text-xs">{formatDate(n.datumPredaje)}</td>
              <td className="px-3 py-2 text-xs">{formatDate(n.rokIzrade)} {n.rokIzradeTime ?? ""}</td>
              <td className="px-3 py-2 text-right">{n._count?.stavke ?? 0}</td>
              <td className="px-3 py-2"><Badge variant={STAVKA_TONE[n.status]}>{n.status}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============== NALOZI ZA MONTAŽU ==============
function NaloziMontazuTab() {
  const { data, isLoading } = trpc.nalogMontazu.list.useQuery();
  if (isLoading) return <p className="text-sm text-muted-foreground">Učitavam…</p>;
  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-secondary/60 text-left">
          <tr>
            <th className="px-3 py-2">Broj</th>
            <th className="px-3 py-2">Tip</th>
            <th className="px-3 py-2">Grad</th>
            <th className="px-3 py-2">Datum montaže</th>
            <th className="px-3 py-2 text-right">Stavki</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Napomena</th>
          </tr>
        </thead>
        <tbody>
          {(data ?? []).length === 0 && (
            <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Nema naloga za montažu. Kreira se iz radnog naloga (panel &quot;Logistika workflow&quot;).</td></tr>
          )}
          {(data ?? []).map((n: any) => (
            <tr key={n.id} className="border-t hover:bg-secondary/20">
              <td className="px-3 py-2 font-mono">
                <Link href={`/logistika/nalog-montazu/${n.id}`} className="hover:underline">{n.broj}</Link>
              </td>
              <td className="px-3 py-2 text-xs">{n.tip}</td>
              <td className="px-3 py-2 text-xs">{n.grad ?? "—"}</td>
              <td className="px-3 py-2 text-xs">{n.datumMontaze ? formatDate(n.datumMontaze) : "—"}</td>
              <td className="px-3 py-2 text-right">{n._count?.stavke ?? 0}</td>
              <td className="px-3 py-2"><Badge variant={STAVKA_TONE[n.status]}>{n.status}</Badge></td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{n.napomena ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
