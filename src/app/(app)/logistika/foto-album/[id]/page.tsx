"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function FotoAlbumDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, refetch } = trpc.fotoAlbum.byId.useQuery({ id });
  const addFoto = trpc.fotoAlbum.addFotografija.useMutation({ onSuccess: () => refetch() });
  const removeFoto = trpc.fotoAlbum.removeFotografija.useMutation({ onSuccess: () => refetch() });
  const setPdf = trpc.fotoAlbum.setPdfUrl.useMutation({ onSuccess: () => refetch() });
  const remove = trpc.fotoAlbum.remove.useMutation({ onSuccess: () => router.push(`/logistika/radni-nalozi/${data?.radniNalogId}`) });

  const [url, setUrl] = useState("");
  const [naziv, setNaziv] = useState("");

  if (isLoading) return <p>Učitavam...</p>;
  if (!data) return <p>Album ne postoji.</p>;

  const radniNalog: any = data.radniNalog;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Link href={`/logistika/radni-nalozi/${data.radniNalogId}`} className="text-sm text-muted-foreground hover:underline">← Nazad na RN</Link>
          <Badge>{data.tip}</Badge>
          <h1 className="text-lg font-semibold">{data.naziv}</h1>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => {
            const u = prompt("URL gotovog PDF-a (sa watermarkom)");
            if (u) setPdf.mutate({ id, pdfUrl: u });
          }}>Postavi PDF link</Button>
          {data.pdfUrl && <a href={data.pdfUrl} target="_blank" rel="noreferrer" className="text-sm text-red-700 hover:underline">📄 Otvori PDF</a>}
          <Button size="sm" variant="outline" onClick={() => { if (confirm("Obriši album?")) remove.mutate({ id }); }}>Obriši</Button>
        </div>
      </div>

      <div className="rounded-md border bg-white p-4">
        <div className="text-xs text-muted-foreground">
          Klijent: <strong>{radniNalog?.partner?.naziv ?? "—"}</strong> · RN: <span className="font-mono">{radniNalog?.broj}</span>
        </div>
      </div>

      {/* Upload row */}
      <div className="rounded-md border bg-white p-4">
        <div className="mb-2 text-sm font-semibold">Dodaj fotografiju</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input className="rounded border px-2 py-1.5 text-sm sm:col-span-2" placeholder="URL fotografije (https://...)" value={url} onChange={(e) => setUrl(e.target.value)} />
          <input className="rounded border px-2 py-1.5 text-sm" placeholder="Naziv (opciono)" value={naziv} onChange={(e) => setNaziv(e.target.value)} />
        </div>
        <div className="mt-2">
          <Button size="sm" disabled={!url} onClick={() => {
            addFoto.mutate({ albumId: id, url, naziv: naziv || undefined, redosled: data.fotografije.length });
            setUrl(""); setNaziv("");
          }}>+ Dodaj</Button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Napomena: Upload na storage (Vercel Blob/S3) je u sledećoj iteraciji. Trenutno unosiš direktan URL.
        </p>
      </div>

      {/* Gallery */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {data.fotografije.length === 0 && (
          <p className="col-span-full text-sm text-muted-foreground">Nema fotografija u albumu.</p>
        )}
        {data.fotografije.map((f: any) => (
          <div key={f.id} className="group relative overflow-hidden rounded border bg-white">
            <img src={f.url} alt={f.naziv ?? ""} className="aspect-square w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-[10px] text-white">
              {f.naziv ?? `Fotografija ${f.redosled + 1}`}
            </div>
            <button
              className="absolute right-1 top-1 hidden rounded bg-red-600 px-2 py-0.5 text-[10px] text-white group-hover:block"
              onClick={() => removeFoto.mutate({ id: f.id })}
            >×</button>
          </div>
        ))}
      </div>
    </div>
  );
}
