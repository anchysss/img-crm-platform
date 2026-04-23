"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default function RadniNalogDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, refetch } = trpc.radniNalozi.byId.useQuery({ id });
  const setStatus = trpc.radniNalozi.setStatus.useMutation({ onSuccess: () => refetch() });

  if (isLoading) return <p>Učitavam...</p>;
  if (!data) return <p>Radni nalog ne postoji.</p>;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Radni nalog {data.broj}</h1>
          <div className="mt-1 flex gap-2 text-sm text-muted-foreground">
            <Badge>{data.status.replace("_", " ")}</Badge>
            <span>Partner: {data.partner?.naziv}</span>
            <span>· Prodavac: {data.vlasnik?.ime} {data.vlasnik?.prezime}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {data.status === "NOVO" && <Button onClick={() => setStatus.mutate({ id, status: "PRIHVACEN_LOGISTIKA" })}>Prihvati nalog</Button>}
          {data.status === "PRIHVACEN_LOGISTIKA" && <Button onClick={() => setStatus.mutate({ id, status: "PRIPREMA_MONTAZE" })}>U pripremi</Button>}
          {data.status === "PRIPREMA_MONTAZE" && <Button onClick={() => setStatus.mutate({ id, status: "U_REALIZACIJI" })}>Pokreni realizaciju</Button>}
          {data.status === "U_REALIZACIJI" && <Button onClick={() => setStatus.mutate({ id, status: "ZAVRSEN" })}>Završi</Button>}
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <Info label="Period" value={`${formatDate(data.odDatum)} — ${formatDate(data.doDatum)}`} />
        <Info label="Grad" value={data.grad ?? "—"} />
        <Info label="Partner" value={data.partner?.naziv ?? "—"} />
      </div>

      {data.opportunity && (
        <div className="rounded-md border bg-secondary/30 p-3 text-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Izvor</div>
          <Link href={`/prodaja/ponude/${data.opportunity.id}`} className="text-sm font-medium hover:underline">
            Prilika: {data.opportunity.naziv}
          </Link>
        </div>
      )}

      {data.napomena && (
        <div className="rounded-md border p-3 text-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Napomena</div>
          <div className="mt-1 whitespace-pre-wrap">{data.napomena}</div>
        </div>
      )}
    </div>
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
