"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { downloadOfferXlsx } from "@/lib/offer-export";

export default function OpportunityDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: opp, isLoading, refetch } = trpc.opportunities.byId.useQuery({ id });
  const activities = trpc.activities.listByOpportunity.useQuery({ opportunityId: id });
  const lostReasons = trpc.lookups.lostReasons.useQuery();

  const setStageMut = trpc.opportunities.setStage.useMutation({
    onSuccess: () => refetch(),
  });
  const convertMut = trpc.opportunities.convertToCampaign.useMutation({
    onSuccess: () => refetch(),
  });

  const [stage, setStage] = useState("");
  const [lostReason, setLostReason] = useState("");
  const [lostText, setLostText] = useState("");
  const [campaignDates, setCampaignDates] = useState({ od: "", do: "" });
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <p>Učitavam...</p>;
  if (!opp) return <p>Prilika nije pronađena.</p>;

  const weighted = Number(opp.expValue) * (opp.probability / 100);

  async function exportXlsx() {
    if (!opp) return;
    const sastavio = `${opp.vlasnik.ime} ${opp.vlasnik.prezime}`;
    await downloadOfferXlsx(`Ponuda-${opp.naziv.replace(/[^a-z0-9]/gi, "_")}.xlsx`, {
      brojPonude: `P-${opp.id.slice(-8).toUpperCase()}`,
      datum: new Date(),
      poddeonica: "OUTDOOR / INDOOR — PONUDA",
      klijent: opp.partner.naziv,
      klijentAdresa: opp.partner.adresa ?? undefined,
      kampanjaNaziv: opp.naziv,
      period: formatDate(opp.expCloseDate),
      grad: opp.partner.grad ?? "—",
      brojVozila: 1,
      vaziDo: new Date(Date.now() + 30 * 86400000),
      sastavio,
      sastavioEmail: opp.vlasnik.email,
      pravnoLiceNaziv: "INFO MEDIA GROUP d.o.o.",
      pravnoLiceAdresa: "Omladinskih brigada 86, West 65 Tower, Beograd",
      pravnoLiceTel: "+381 11 3370 553",
      pravnoLiceEmail: "info@infomediagroup.rs",
      stavke: [
        {
          rb: 1,
          opis: opp.naziv,
          grad: opp.partner.grad ?? "—",
          brojVozila: 1,
          cena: Number(opp.expValue),
          popustPct: 0,
          cenaSaPopustom: Number(opp.expValue),
        },
      ],
      valuta: opp.valuta,
      stopaPdv: 20,
    });
  }

  async function changeStage() {
    setError(null);
    try {
      await setStageMut.mutateAsync({
        id,
        stageKod: stage as any,
        lostReasonKod: lostReason ? (lostReason as any) : undefined,
        lostReasonText: lostText || undefined,
      });
      setStage(""); setLostReason(""); setLostText("");
    } catch (e: any) { setError(e.message); }
  }

  async function convert() {
    setError(null);
    try {
      await convertMut.mutateAsync({
        opportunityId: id,
        odDatum: new Date(campaignDates.od),
        doDatum: new Date(campaignDates.do),
      });
    } catch (e: any) { setError(e.message); }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant="outline" onClick={exportXlsx}>XLSX ponuda</Button>
        <Button size="sm" variant="outline" onClick={() => window.print()}>PDF / Štampa</Button>
      </div>
      <header>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{opp.naziv}</h1>
            <div className="mt-1 flex gap-2 text-sm">
              <Badge variant={opp.stage.kod === "WON" ? "success" : opp.stage.kod === "LOST" ? "danger" : "info"}>
                {opp.stage.naziv}
              </Badge>
              <span className="text-muted-foreground">{opp.partner.naziv} · {opp.vlasnik.ime} {opp.vlasnik.prezime}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{formatCurrency(Number(opp.expValue), opp.valuta)}</div>
            <div className="text-xs text-muted-foreground">Weighted: {formatCurrency(weighted, opp.valuta)} ({opp.probability}%)</div>
            {opp.potencijal && (
              <div className="mt-1 text-xs">
                <span className="text-muted-foreground">Potencijal:</span>{" "}
                <strong className="text-emerald-700 dark:text-emerald-400">{formatCurrency(Number(opp.potencijal), opp.valuta)}</strong>
                {opp.potencijalDoDatum && <span className="text-muted-foreground"> do {formatDate(opp.potencijalDoDatum)}</span>}
              </div>
            )}
          </div>
        </div>
        <div className="mt-2 text-sm text-muted-foreground">Zatvaranje: {formatDate(opp.expCloseDate)}</div>
      </header>

      {opp.lostReason && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <strong>Razlog gubitka:</strong> {opp.lostReason.naziv}{opp.lostReasonText ? ` — ${opp.lostReasonText}` : ""}
        </div>
      )}

      <section className="rounded-md border p-4">
        <h2 className="mb-3 font-semibold">Promena faze</h2>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Novi stage">
            <Select value={stage} onChange={(e) => setStage(e.target.value)}>
              <option value="">—</option>
              <option value="NEW">New</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="PROPOSAL_SENT">Proposal Sent</option>
              <option value="NEGOTIATION">Negotiation</option>
              <option value="VERBALLY_CONFIRMED">Verbally Confirmed</option>
              <option value="WON">Won</option>
              <option value="LOST">Lost</option>
            </Select>
          </Field>
          {stage === "LOST" && (
            <>
              <Field label="Razlog gubitka *">
                <Select value={lostReason} onChange={(e) => setLostReason(e.target.value)}>
                  <option value="">—</option>
                  {(lostReasons.data ?? []).map((r: any) => <option key={r.id} value={r.kod}>{r.naziv}</option>)}
                </Select>
              </Field>
              {lostReason === "OSTALO" && (
                <Field label="Slobodan tekst *">
                  <Input value={lostText} onChange={(e) => setLostText(e.target.value)} />
                </Field>
              )}
            </>
          )}
          <Button onClick={changeStage} disabled={!stage || setStageMut.isPending}>Sačuvaj fazu</Button>
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </section>

      {opp.stage.kod === "WON" && !opp.kampanja && (
        <section className="rounded-md border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 p-4">
          <h2 className="mb-3 font-semibold">Konverzija u kampanju</h2>
          <div className="flex items-end gap-3">
            <Field label="Od datuma"><Input type="date" value={campaignDates.od} onChange={(e) => setCampaignDates({ ...campaignDates, od: e.target.value })} /></Field>
            <Field label="Do datuma"><Input type="date" value={campaignDates.do} onChange={(e) => setCampaignDates({ ...campaignDates, do: e.target.value })} /></Field>
            <Button onClick={convert} disabled={!campaignDates.od || !campaignDates.do || convertMut.isPending}>Konvertuj u kampanju</Button>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-semibold">Rezervacije / Hold</h2>
        {opp.rezervacije.length === 0 && <p className="text-sm text-muted-foreground">Nema rezervacija.</p>}
        <div className="flex flex-col gap-2">
          {opp.rezervacije.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div>
                <Badge variant={r.status === "HOLD" ? "warning" : r.status === "CONFIRMED" ? "success" : "default"}>{r.status}</Badge>
                <span className="ml-2">{r.pozicija.vozilo.registracija} · {r.pozicija.tip}</span>
              </div>
              <div className="text-muted-foreground">{formatDate(r.odDatum)} — {formatDate(r.doDatum)}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Aktivnosti</h2>
        <div className="flex flex-col gap-2">
          {(activities.data ?? []).map((a: any) => (
            <div key={a.id} className="rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span><Badge>{a.tip}</Badge> <strong className="ml-2">{a.opis}</strong></span>
                <span className="text-xs text-muted-foreground">{formatDate(a.datum)}</span>
              </div>
            </div>
          ))}
          {activities.data?.length === 0 && <p className="text-sm text-muted-foreground">Nema aktivnosti.</p>}
        </div>
      </section>
    </div>
  );
}
