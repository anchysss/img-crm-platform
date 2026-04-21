export default function CampaignsPage() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold">Kampanje</h1>
      <p className="text-sm text-muted-foreground">
        Modul skaffold-ovan (M5). Listanje, status prelazi (Potvrđena → U realizaciji → Završena) i otkazivanje implementirani u server layer-u.
        UI tabela i forme dolaze u sledećem PR-u.
      </p>
    </div>
  );
}
