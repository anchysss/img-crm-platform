"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input, Select, Field, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default function PartnerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: partner, isLoading, refetch } = trpc.partners.byId.useQuery({ id });
  const activities = trpc.activities.listByPartner.useQuery({ partnerId: id });

  if (isLoading) return <p>Učitavam...</p>;
  if (!partner) return <p>Partner nije pronađen.</p>;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{partner.naziv}</h1>
          <div className="mt-1 flex gap-2 text-sm text-muted-foreground">
            <Badge>{partner.tip}</Badge>
            <Badge>Segment {partner.segment}</Badge>
            <span>{partner.grad ?? "—"} · {partner.zemlja}</span>
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard label="PIB/VAT" value={partner.pibVat ?? "—"} />
        <InfoCard label="Matični broj" value={partner.maticniBroj ?? "—"} />
        <InfoCard label="Adresa" value={partner.adresa ?? "—"} />
        <InfoCard label="Napomene" value={partner.napomene ?? "—"} />
      </div>

      <ContactsSection partnerId={id} kontakti={partner.kontakti} onChange={refetch} />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Aktivnosti</h2>
          <ActivityAddButton partnerId={id} onAdded={() => activities.refetch()} />
        </div>
        {activities.data?.length === 0 && <p className="text-sm text-muted-foreground">Nema aktivnosti.</p>}
        <div className="flex flex-col gap-2">
          {(activities.data ?? []).map((a: any) => (
            <div key={a.id} className="rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <Badge>{a.tip}</Badge>
                  <span className="ml-2 font-medium">{a.opis}</span>
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(a.datum)}</span>
              </div>
              {a.ishod && <div className="mt-1 text-xs text-muted-foreground">Ishod: {a.ishod}</div>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}

function ContactsSection({ partnerId, kontakti, onChange }: { partnerId: string; kontakti: any[]; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const createMut = trpc.contacts.create.useMutation({
    onSuccess: () => {
      setOpen(false);
      onChange();
    },
  });
  const [form, setForm] = useState({ ime: "", pozicija: "", email: "", telefon: "", primarni: false, legalBasis: "LEGITIMATE_INTEREST" as const });

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Kontakti</h2>
        <Button size="sm" onClick={() => setOpen(!open)}>{open ? "Zatvori" : "+ Novi kontakt"}</Button>
      </div>
      {open && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await createMut.mutateAsync({ partnerId, ...form } as any);
          }}
          className="mb-3 grid grid-cols-2 gap-3 rounded-md border bg-secondary/30 p-3"
        >
          <Field label="Ime i prezime *"><Input required value={form.ime} onChange={(e) => setForm({ ...form, ime: e.target.value })} /></Field>
          <Field label="Pozicija"><Input value={form.pozicija} onChange={(e) => setForm({ ...form, pozicija: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Telefon"><Input value={form.telefon} onChange={(e) => setForm({ ...form, telefon: e.target.value })} /></Field>
          <Field label="GDPR osnov">
            <Select value={form.legalBasis} onChange={(e) => setForm({ ...form, legalBasis: e.target.value as any })}>
              <option value="CONSENT">Consent</option>
              <option value="CONTRACT">Contract</option>
              <option value="LEGITIMATE_INTEREST">Legitimate interest</option>
              <option value="LEGAL_OBLIGATION">Legal obligation</option>
            </Select>
          </Field>
          <Field label="Primarni"><input type="checkbox" checked={form.primarni} onChange={(e) => setForm({ ...form, primarni: e.target.checked })} className="h-4 w-4" /></Field>
          <div className="col-span-2 flex justify-end">
            <Button type="submit" disabled={createMut.isPending}>Sačuvaj kontakt</Button>
          </div>
        </form>
      )}
      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left">
            <tr>
              <th className="px-3 py-2">Ime</th>
              <th className="px-3 py-2">Pozicija</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Telefon</th>
              <th className="px-3 py-2">Primarni</th>
            </tr>
          </thead>
          <tbody>
            {kontakti.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">Nema kontakata.</td></tr>
            )}
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
    </section>
  );
}

function ActivityAddButton({ partnerId, onAdded }: { partnerId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [tip, setTip] = useState("POZIV");
  const [opis, setOpis] = useState("");
  const [ishod, setIshod] = useState("");
  const mut = trpc.activities.create.useMutation({
    onSuccess: () => {
      setOpen(false);
      setOpis("");
      setIshod("");
      onAdded();
    },
  });

  if (!open) return <Button size="sm" variant="outline" onClick={() => setOpen(true)}>+ Aktivnost</Button>;
  return (
    <form onSubmit={async (e) => { e.preventDefault(); await mut.mutateAsync({ partnerId, tip: tip as any, opis, ishod: ishod || undefined }); }} className="flex items-end gap-2">
      <Field label="Tip">
        <Select value={tip} onChange={(e) => setTip(e.target.value)}>
          <option value="POZIV">Poziv</option>
          <option value="SASTANAK">Sastanak</option>
          <option value="MAIL">Mail</option>
          <option value="PONUDA">Ponuda</option>
          <option value="POSETA">Poseta</option>
          <option value="OSTALO">Ostalo</option>
        </Select>
      </Field>
      <Field label="Opis"><Input required value={opis} onChange={(e) => setOpis(e.target.value)} /></Field>
      <Field label="Ishod"><Input value={ishod} onChange={(e) => setIshod(e.target.value)} /></Field>
      <Button type="submit" size="sm">Sačuvaj</Button>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>Otkaži</Button>
    </form>
  );
}
