"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

type Tab = "info" | "aktivnosti" | "prilike" | "ponude" | "osobe";

const STATUS_OPTS = [
  "AKTIVAN", "SEASONAL", "HIGH_POTENTIAL", "LOW_POTENTIAL", "NOT_ADVERTISING", "COMPETITOR_LOCKED",
] as const;

const STATUS_TONE: Record<string, any> = {
  AKTIVAN: "success",
  SEASONAL: "info",
  HIGH_POTENTIAL: "info",
  LOW_POTENTIAL: "warning",
  NOT_ADVERTISING: "warning",
  COMPETITOR_LOCKED: "danger",
};

export default function KontaktDetail() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("aktivnosti");
  const { data: partner, isLoading, refetch } = trpc.partners.byId.useQuery({ id });
  const aktivnosti = trpc.activities.listByPartner.useQuery({ partnerId: id });
  const prilike = trpc.opportunities.list.useQuery({});
  const ponude = trpc.ponude.list.useQuery({});

  if (isLoading) return <p>Učitavam...</p>;
  if (!partner) return <p>Klijent nije pronađen.</p>;

  const partnerPrilike = (prilike.data ?? []).filter((o: any) => o.partnerId === id);
  const partnerPonude = (ponude.data ?? []).filter((p: any) => p.partnerId === id);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{partner.naziv}</h1>
            <Badge variant={STATUS_TONE[partner.status]}>{partner.status.replace(/_/g, " ")}</Badge>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            <Badge>{partner.tip}</Badge>
            <span className="ml-2">Segment {partner.segment}</span>
            <span className="ml-2">· {partner.grad ?? "—"} · {partner.zemlja}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/prodaja/ponude/new?partnerId=${id}`} className="inline-flex items-center rounded-md border bg-background px-3 py-2 text-sm hover:bg-secondary">
            + Nova ponuda
          </Link>
          <StatusQuickEdit id={id} current={partner.status} onChanged={refetch} />
        </div>
      </header>

      <nav className="flex border-b">
        {(
          [
            ["info", "Info", null],
            ["aktivnosti", "Aktivnosti & Razgovori", aktivnosti.data?.length ?? 0],
            ["prilike", "Prilike", partnerPrilike.length],
            ["ponude", "Ponude", partnerPonude.length],
            ["osobe", "Kontakt osobe", partner.kontakti?.length ?? 0],
          ] as const
        ).map(([t, label, count]) => (
          <button
            key={t}
            onClick={() => setTab(t as Tab)}
            className={`border-b-2 px-4 py-2 text-sm ${tab === t ? "border-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {label}{count !== null && count !== undefined ? <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs">{count}</span> : null}
          </button>
        ))}
      </nav>

      {tab === "info" && <InfoTab partner={partner} />}
      {tab === "aktivnosti" && <AktivnostiTab partnerId={id} items={aktivnosti.data ?? []} onChange={() => aktivnosti.refetch()} />}
      {tab === "prilike" && <PrilikeTab items={partnerPrilike} />}
      {tab === "ponude" && <PonudeTab items={partnerPonude} partnerId={id} />}
      {tab === "osobe" && <OsobeTab partnerId={id} kontakti={partner.kontakti ?? []} onChange={refetch} />}
    </div>
  );
}

function InfoTab({ partner }: { partner: any }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Info label="PIB / VAT" value={partner.pibVat ?? "—"} />
      <Info label="Matični broj" value={partner.maticniBroj ?? "—"} />
      <Info label="Adresa" value={partner.adresa ?? "—"} />
      <Info label="Grad / Zemlja" value={`${partner.grad ?? "—"} · ${partner.zemlja}`} />
      <Info label="Tip" value={partner.tip} />
      <Info label="Segment" value={partner.segment} />
      <div className="md:col-span-2">
        <Info label="Napomene" value={partner.napomene ?? "—"} />
      </div>
    </div>
  );
}

function AktivnostiTab({ partnerId, items, onChange }: { partnerId: string; items: any[]; onChange: () => void }) {
  const mut = trpc.activities.create.useMutation({ onSuccess: () => { setForm({ tip: "POZIV", opis: "", ishod: "", nextActionDatum: "", nextActionOpis: "" }); onChange(); } });
  const [form, setForm] = useState({ tip: "POZIV", opis: "", ishod: "", nextActionDatum: "", nextActionOpis: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await mut.mutateAsync({
      partnerId,
      tip: form.tip as any,
      opis: form.opis,
      ishod: form.ishod || undefined,
      nextActionDatum: form.nextActionDatum ? new Date(form.nextActionDatum) : undefined,
      nextActionOpis: form.nextActionOpis || undefined,
    } as any);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border bg-secondary/20 p-4">
        <h3 className="mb-3 text-sm font-semibold">Novi razgovor / aktivnost</h3>
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Tip *">
            <Select value={form.tip} onChange={(e) => setForm({ ...form, tip: e.target.value })}>
              <option value="POZIV">📞 Telefonski poziv</option>
              <option value="SASTANAK">🤝 Sastanak</option>
              <option value="MAIL">✉️ Email</option>
              <option value="PONUDA">📄 Poslata ponuda</option>
              <option value="POSETA">🚶 Poseta</option>
              <option value="OSTALO">Ostalo</option>
            </Select>
          </Field>
          <Field label="Ishod (kratko)">
            <Input value={form.ishod} onChange={(e) => setForm({ ...form, ishod: e.target.value })} placeholder="Npr. pozitivno, traži dodatne info, odbio" />
          </Field>
          <div className="md:col-span-2">
            <Field label="Šta se pričalo / dogovorilo *">
              <Textarea required rows={3} value={form.opis} onChange={(e) => setForm({ ...form, opis: e.target.value })} placeholder="Npr: Razgovarao sa direktorom o kampanji za novu liniju proizvoda; traži ponudu za 10 vozila u Beogradu za april; dogovoreno da pošaljem do petka." />
            </Field>
          </div>
          <Field label="Next action — datum">
            <Input type="date" value={form.nextActionDatum} onChange={(e) => setForm({ ...form, nextActionDatum: e.target.value })} />
          </Field>
          <Field label="Next action — opis">
            <Input value={form.nextActionOpis} onChange={(e) => setForm({ ...form, nextActionOpis: e.target.value })} placeholder="Npr. poslati ponudu, pozvati u ponedeljak" />
          </Field>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={mut.isPending}>Dodaj zapis</Button>
          </div>
        </form>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Istorija razgovora</h3>
        {items.length === 0 && <p className="text-sm text-muted-foreground">Nema zapisa.</p>}
        {items.map((a: any) => (
          <div key={a.id} className="rounded-md border p-3 text-sm">
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2"><Badge>{a.tip}</Badge><span className="font-medium">{a.ishod ?? "—"}</span></div>
              <span className="text-xs text-muted-foreground">{formatDate(a.datum)} · {a.autor?.ime} {a.autor?.prezime}</span>
            </div>
            <div className="whitespace-pre-wrap">{a.opis}</div>
            {a.nextActionDatum && (
              <div className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                ⏭ <strong>Next action {formatDate(a.nextActionDatum)}:</strong> {a.nextActionOpis}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PrilikeTab({ items }: { items: any[] }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Nema prilika za ovog klijenta.</p>;
  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-secondary/60 text-left">
          <tr>
            <th className="px-3 py-2">Naziv</th>
            <th className="px-3 py-2">Stage</th>
            <th className="px-3 py-2 text-right">Vrednost</th>
            <th className="px-3 py-2 text-right">Probability</th>
            <th className="px-3 py-2">Zatvaranje</th>
          </tr>
        </thead>
        <tbody>
          {items.map((o: any) => (
            <tr key={o.id} className="border-t">
              <td className="px-3 py-2"><Link href={`/prodaja/prilike/${o.id}`} className="font-medium hover:underline">{o.naziv}</Link></td>
              <td className="px-3 py-2"><Badge>{o.stage?.kod}</Badge></td>
              <td className="px-3 py-2 text-right">{formatCurrency(Number(o.expValue), o.valuta)}</td>
              <td className="px-3 py-2 text-right">{o.probability}%</td>
              <td className="px-3 py-2">{formatDate(o.expCloseDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PonudeTab({ items, partnerId }: { items: any[]; partnerId: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Link href={`/prodaja/ponude/new?partnerId=${partnerId}`} className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90">
          + Nova ponuda
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nema ponuda. Kreiraj prvu preko dugmeta iznad.</p>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left">
              <tr>
                <th className="px-3 py-2">Broj</th>
                <th className="px-3 py-2">Datum</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Ukupno</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p: any) => (
                <tr key={p.id} className="border-t">
                  <td className="px-3 py-2"><Link href={`/prodaja/ponude/${p.id}`} className="font-mono hover:underline">{p.broj}</Link></td>
                  <td className="px-3 py-2">{formatDate(p.datum)}</td>
                  <td className="px-3 py-2"><Badge variant={p.status === "PRIHVACENA" ? "success" : p.status === "POSLATA" ? "info" : p.status === "ODBIJENA" ? "danger" : "default"}>{p.status}</Badge></td>
                  <td className="px-3 py-2 text-right">{formatCurrency(Number(p.ukupno), p.valuta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OsobeTab({ partnerId, kontakti, onChange }: { partnerId: string; kontakti: any[]; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const mut = trpc.contacts.create.useMutation({ onSuccess: () => { setOpen(false); onChange(); } });
  const [form, setForm] = useState({ ime: "", pozicija: "", email: "", telefon: "", primarni: false });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await mut.mutateAsync({ partnerId, ...form } as any);
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end"><Button size="sm" onClick={() => setOpen(!open)}>{open ? "Zatvori" : "+ Nova osoba"}</Button></div>
      {open && (
        <form onSubmit={submit} className="grid grid-cols-2 gap-3 rounded-md border bg-secondary/20 p-3">
          <Field label="Ime i prezime *"><Input required value={form.ime} onChange={(e) => setForm({ ...form, ime: e.target.value })} /></Field>
          <Field label="Pozicija"><Input value={form.pozicija} onChange={(e) => setForm({ ...form, pozicija: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Telefon"><Input value={form.telefon} onChange={(e) => setForm({ ...form, telefon: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.primarni} onChange={(e) => setForm({ ...form, primarni: e.target.checked })} /> Primarni kontakt</label>
          <div className="col-span-2 flex justify-end"><Button type="submit" disabled={mut.isPending}>Sačuvaj</Button></div>
        </form>
      )}
      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left">
            <tr><th className="px-3 py-2">Ime</th><th className="px-3 py-2">Pozicija</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Telefon</th><th className="px-3 py-2">Primarni</th></tr>
          </thead>
          <tbody>
            {kontakti.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">Nema kontakt osoba.</td></tr>}
            {kontakti.map((k: any) => (
              <tr key={k.id} className="border-t">
                <td className="px-3 py-2 font-medium">{k.ime}</td>
                <td className="px-3 py-2">{k.pozicija ?? "—"}</td>
                <td className="px-3 py-2">{k.email ?? "—"}</td>
                <td className="px-3 py-2">{k.telefon ?? "—"}</td>
                <td className="px-3 py-2">{k.primarni ? "✓" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusQuickEdit({ id, current, onChanged }: { id: string; current: string; onChanged: () => void }) {
  const upd = trpc.partners.update.useMutation({ onSuccess: onChanged });
  return (
    <Select
      value={current}
      onChange={(e) => upd.mutate({ id, status: e.target.value as any })}
      className="max-w-[180px]"
    >
      {STATUS_OPTS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
    </Select>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}
