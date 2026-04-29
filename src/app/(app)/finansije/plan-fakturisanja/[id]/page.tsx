"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

const MONTH_NAMES = ["", "Januar", "Februar", "Mart", "April", "Maj", "Jun", "Jul", "Avgust", "Septembar", "Oktobar", "Novembar", "Decembar"];

export default function PlanFakturisanjaDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, refetch } = trpc.planFakturisanja.byId.useQuery({ id });
  const setStatus = trpc.planFakturisanja.setStatus.useMutation({ onSuccess: () => refetch() });
  const recalc = trpc.planFakturisanja.recalcSplit.useMutation({ onSuccess: () => refetch() });
  const [period, setPeriod] = useState({ od: "", do: "" });

  if (isLoading) return <p>Učitavam...</p>;
  if (!data) return <p>Plan ne postoji.</p>;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Plan fakturisanja {data.broj}</h1>
          <div className="mt-1 flex gap-2 text-sm text-muted-foreground">
            <Badge>{data.status}</Badge>
            <span>Partner: {data.partner?.naziv}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{formatCurrency(Number(data.ukupno), data.valuta)}</div>
          <div className="text-xs text-muted-foreground">Period kampanje</div>
          <div className="text-xs">{formatDate(data.kampanjaOd)} — {formatDate(data.kampanjaDo)}</div>
        </div>
      </header>

      <section className="rounded-md border">
        <div className="border-b bg-secondary/60 px-3 py-2 text-sm font-semibold">Mesečna podela</div>
        <table className="w-full text-sm">
          <thead className="text-left">
            <tr>
              <th className="px-3 py-2">Mesec</th>
              <th className="px-3 py-2 text-right">Iznos</th>
              <th className="px-3 py-2">Fakturisano</th>
            </tr>
          </thead>
          <tbody>
            {data.stavke.map((s: any) => (
              <tr key={s.id} className="border-t">
                <td className="px-3 py-2">{MONTH_NAMES[s.mesec]} {s.godina}</td>
                <td className="px-3 py-2 text-right font-medium">{formatCurrency(Number(s.iznos), s.valuta)}</td>
                <td className="px-3 py-2">{s.fakturisano ? <Badge variant="success">Da</Badge> : <Badge>Ne</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-md border bg-secondary/20 p-4">
        <h2 className="mb-3 font-semibold">Preračun mesečne podele (ako se kampanja pomeri)</h2>
        <div className="flex items-end gap-3">
          <Field label="Novi početak"><Input type="date" value={period.od} onChange={(e) => setPeriod({ ...period, od: e.target.value })} /></Field>
          <Field label="Novi kraj"><Input type="date" value={period.do} onChange={(e) => setPeriod({ ...period, do: e.target.value })} /></Field>
          <Button
            disabled={!period.od || !period.do}
            onClick={() => recalc.mutate({ id, kampanjaOd: new Date(period.od), kampanjaDo: new Date(period.do) })}
          >Preračunaj</Button>
        </div>
      </section>

      <section className="flex gap-2">
        {data.status === "NACRT" && <Button onClick={() => setStatus.mutate({ id, status: "POTVRDENO" })}>Potvrdi plan</Button>}
        {data.status === "POTVRDENO" && <Button onClick={() => setStatus.mutate({ id, status: "FAKTURISANO" })}>Označi fakturisano</Button>}
        {data.status !== "OTKAZAN" && <Button variant="destructive" onClick={() => setStatus.mutate({ id, status: "OTKAZAN" })}>Otkaži</Button>}
      </section>

      {data.opportunity && (
        <section className="text-sm">
          <strong>Izvor: </strong>
          <Link href={`/prodaja/ponude/${data.opportunity.id}`} className="text-primary hover:underline">
            Ponuda {data.opportunity.naziv}
          </Link>
        </section>
      )}
    </div>
  );
}
